/**
 * KWCAG 커스텀 룰 4종의 단일 소스 — 룰 id / 심각도 / 카피 / 프로브 입력 / fixGuide.
 *
 * PLAN.md §11에서 "axe-core가 커버하지 않으면서 자동 판별 가능한" 항목으로 선정된 4개다.
 * 각 룰의 통과/실패 조건은 실제 판정이 일어나는 probe.ts의 룰 블록 주석에 적혀 있고,
 * 여기에는 그 판정에 쓰이는 **값**(임계값·패턴·선택자)만 둔다. 값이 probe.ts에도 복제되면
 * 두 파일이 조용히 어긋나므로, 프로브는 항상 이 파일이 만든 입력만 보고 판단한다.
 *
 * ⚠ fixGuide.after 작성 규칙(engine/rules.ts 파일 헤더와 동일, 타협 불가):
 * IssueCard가 이 값을 JetBrains Mono로 렌더하는데 그 폰트에는 한글 글리프가 없다.
 * after는 **반드시 코드 형태**여야 하고, 한국어 설명은 HTML/CSS 주석 안에만 넣는다.
 * 그리고 확신할 수 없는 수정 코드는 지어내지 않는다 — 진단 도구가 틀린 예시를 주면
 * 사용자는 그대로 고치고 다시 걸린다. 없는 것보다 나쁘다.
 */

import type { IssueDraft } from "@/lib/diagnosis/engine/map";
import type {
  KwcagProbeFinding,
  KwcagProbeInput,
} from "@/lib/diagnosis/engine/kwcag/probe";
import {
  MAX_SNIPPET_LENGTH,
  truncateSnippet,
} from "@/lib/diagnosis/engine/rules";
import { toRuleType } from "@/lib/diagnosis/engine/severity";
import type { FixGuide, Severity } from "@/lib/diagnosis/types";

/**
 * 룰 id 단일 소스.
 *
 * `kwcag-` 접두사는 규약이다 — severity.ts의 toRuleType이 이 접두사만 보고 국내/국제 기준을
 * 가른다. 접두사를 어기면 국내 기준 위반이 조용히 "wcag"로 분류되어 필터에서 사라진다.
 */
export const KWCAG_RULE_ID = {
  /** 6.1.2 초점 이동과 표시 / WCAG 2.4.7 Focus Visible */
  focusVisible: "kwcag-focus-visible",
  /** 5.4.2 자동 재생 금지 / WCAG 1.4.2 Audio Control */
  autoplayAudioControl: "kwcag-autoplay-audio-control",
  /** 6.2.2 정지 기능 제공 / WCAG 2.2.2 Pause, Stop, Hide */
  pauseStopHide: "kwcag-pause-stop-hide",
  /** 7.2.1 사용자 요구에 따른 실행 / WCAG 3.2.1 On Focus, 3.2.2 On Input */
  noAutoExecution: "kwcag-no-auto-execution",
} as const;

/**
 * 심각도는 정적으로 선언한다.
 *
 * toSeverity()는 axe의 tags/impact를 받아 판정하는 함수인데, 커스텀 룰에는 그 두 입력이 없다.
 * 가짜 태그 배열을 만들어 통과시키면 "wcag2a 태그가 있는 룰"인 척하게 되어 이후 태그 기반
 * 로직이 전부 오염된다. 아래 값은 KWCAG 조항의 성격에서 직접 나온 확정값이다(PLAN.md §11).
 *
 * - focusVisible / autoplayAudioControl: 해당 장애 사용자가 페이지를 **아예 쓸 수 없게** 된다 → 치명
 * - pauseStopHide / noAutoExecution: 사용에 심각한 방해가 되지만 우회가 가능하다 → 경고
 */
const SEVERITY_BY_RULE_ID: Readonly<Record<string, Severity>> = {
  [KWCAG_RULE_ID.focusVisible]: "critical",
  [KWCAG_RULE_ID.autoplayAudioControl]: "critical",
  [KWCAG_RULE_ID.pauseStopHide]: "warning",
  [KWCAG_RULE_ID.noAutoExecution]: "warning",
};

/**
 * 카피. engine/rules.ts의 COPY_OVERRIDES와 같은 톤을 따른다 —
 * "무엇을 확인하세요"가 아니라 **"사용자에게 어떤 피해가 가는가"**.
 */
const COPY: Readonly<Record<string, { title: string; description: string }>> = {
  [KWCAG_RULE_ID.focusVisible]: {
    title: "키보드 포커스 표시가 보이지 않음",
    description:
      "키보드로 탐색하는 사용자는 지금 어느 요소에 초점이 있는지 알 수 없어 화면에서 길을 잃습니다. 마우스를 쓰지 못하는 지체장애 사용자와 저시력 사용자에게 특히 치명적입니다. 포커스를 받았을 때 outline, 테두리, 배경색, 그림자 중 무엇이든 눈에 보이는 변화가 있어야 하며, 디자인상 outline을 없앴다면 반드시 대체 표시를 제공해야 합니다.",
  },
  [KWCAG_RULE_ID.autoplayAudioControl]: {
    title: "소리가 자동 재생되고 멈출 방법이 없음",
    description:
      "페이지를 열자마자 소리가 나오면 스크린리더 사용자는 자신의 음성 안내가 묻혀 페이지를 전혀 이용할 수 없습니다. 자동 재생되는 소리에는 정지·음소거 수단이 필요하며, 음소거 상태(muted)로 시작하거나 재생 컨트롤(controls)을 제공해야 합니다.",
  },
  [KWCAG_RULE_ID.pauseStopHide]: {
    title: "자동으로 움직이는 콘텐츠에 정지 수단이 없음",
    description:
      "멈출 수 없는 움직임은 주의력결핍·인지장애 사용자가 옆의 본문을 읽는 것을 방해하고, 일부 사용자에게는 어지럼증을 유발합니다. 5초 이상 자동으로 움직이거나 갱신되는 콘텐츠에는 정지·일시정지 수단을 제공하거나, 사용자의 동작 최소화 설정(prefers-reduced-motion)에 반응해야 합니다.",
  },
  [KWCAG_RULE_ID.noAutoExecution]: {
    title: "초점 이동이나 선택만으로 페이지가 실행됨",
    description:
      "선택 상자를 고르거나 입력란에 초점이 닿는 것만으로 페이지가 이동하거나 폼이 제출되면, 키보드 사용자는 방향키로 항목을 훑어보는 도중 원하지 않는 화면으로 끌려갑니다. 스크린리더 사용자는 무슨 일이 일어났는지조차 알 수 없습니다. 실행은 사용자가 확인 버튼을 눌렀을 때만 일어나야 합니다. 이 검사는 이벤트 속성과 프로퍼티만 확인하므로, 외부 스크립트가 addEventListener로 등록한 동작은 놓칠 수 있습니다.",
  },
};

/* ------------------------------------------------------------------ */
/* 프로브 입력 — 임계값·패턴·선택자의 단일 소스                        */
/* ------------------------------------------------------------------ */

/**
 * 룰 ① 검사 그룹 상한.
 *
 * 요소당 getComputedStyle이 6~8회라 전수 순회는 강제 스타일 재계산 폭발이다.
 * 스타일 서명(tagName + type + classList)이 같은 요소는 같은 CSS를 받으므로 대표 1개만
 * 검사하고, 그룹이 실패하면 그룹 크기만큼 occurrenceCount에 더한다.
 */
const FOCUS_GROUP_LIMIT = 60;

/**
 * 포커스 전후로 비교할 속성.
 *
 * outline과 box-shadow만 보면 **색 변화로 포커스를 표시하는 사이트가 전부 오탐**이 된다.
 * WCAG 2.4.7이 요구하는 것은 "시각적으로 보이는 표시"이므로 배경색이나 밑줄만 바뀌어도 통과다.
 * (outline / box-shadow는 값이 아니라 "실제로 보이는가"로 정규화해야 해서 probe.ts가 별도로 읽는다 —
 *  `outline-color: transparent`로 링을 지운 사이트는 값만 비교하면 통과가 되어 버린다.)
 */
const FOCUS_STYLE_PROPERTIES = [
  "border-color",
  "border-width",
  "border-style",
  "background-color",
  "color",
  "text-decoration",
  "filter",
  "transform",
  "opacity",
];

/** ::before / ::after로 포커스 링을 그리는 구현이 흔해서 가상요소도 같이 본다. */
const FOCUS_PSEUDO_PROPERTIES = [
  "content",
  "width",
  "height",
  "background-color",
  "border-color",
  "border-width",
  "border-style",
  "opacity",
  "transform",
];

/** ② 재생 컨트롤로 볼 만한 버튼 */
const MEDIA_STOP_CONTROL_SELECTOR =
  'button, [role="button"], input[type="button"], input[type="image"], a[href]';
const MEDIA_STOP_CONTROL_PATTERN = "정지|일시정지|중지|음소거|pause|stop|mute";

/**
 * ③ 장식으로 보고 제외할 애니메이션 속성.
 * 이 속성들만 움직이면 로딩 스피너·셔머·펄스다 — 거의 모든 현대 사이트에 있으므로
 * 이 필터가 사실상 룰 ③의 본체다. left/top/margin이 변하거나 visibility가 토글되면
 * 진짜 이동·점멸이므로 후보로 남는다.
 */
const MOTION_SAFE_PROPERTIES = [
  "transform",
  "opacity",
  "stroke-dashoffset",
  "background-position",
  "filter",
];

/** ③ 진행 상태 표시이거나 보조기술에서 숨긴 요소 — 정지 수단을 요구할 대상이 아니다. */
const MOTION_EXCLUDED_ROLE_SELECTOR =
  '[role="progressbar"], [role="status"], [aria-busy="true"], [aria-hidden="true"]';

/** ③ 48×48 미만은 장식(스피너·점)으로 본다. */
const MOTION_MIN_AREA = 48 * 48;

/** ③ 이름 휴리스틱(마지막 수단) */
const MOTION_DECORATIVE_NAME_PATTERN =
  "spin|load|skeleton|shimmer|pulse|ripple|dot|progress";

/** ③ 정지 컨트롤 */
const MOTION_STOP_CONTROL_SELECTOR = 'button, [role="button"]';
const MOTION_STOP_CONTROL_PATTERN = "정지|일시정지|멈춤|pause|stop";

/** ④ 자동 실행으로 볼 코드 패턴 */
const AUTO_EXEC_PATTERNS = [
  "submit()",
  ".submit",
  "location.href",
  "location.replace",
  "location.assign",
  "document.location",
  "window.open",
  "this.blur()",
];

/** ④ 같은 form 안에 있으면 "사용자가 직접 실행한다"고 볼 수 있는 버튼 */
const AUTO_EXEC_CONFIRM_SELECTOR =
  '[type="submit"], button:not([type="button"])';

/**
 * 프로브 입력을 만든다.
 *
 * @param onlyRuleIds null이면 4개 룰 전부. ③ reduced-motion 재측정 때만 배열을 넘겨
 *   해당 룰만 다시 돌린다(다른 룰까지 두 번 돌리면 예산 낭비이고, 룰 ①은 두 번 돌리면
 *   포커스를 또 옮겨 대상 페이지 상태를 흔든다).
 */
export function buildProbeInput(
  onlyRuleIds: string[] | null = null
): KwcagProbeInput {
  return {
    onlyRuleIds,
    ruleIds: {
      focusVisible: KWCAG_RULE_ID.focusVisible,
      autoplayAudioControl: KWCAG_RULE_ID.autoplayAudioControl,
      pauseStopHide: KWCAG_RULE_ID.pauseStopHide,
      noAutoExecution: KWCAG_RULE_ID.noAutoExecution,
    },
    maxSnippetLength: MAX_SNIPPET_LENGTH,

    focusableSelector:
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    focusGroupLimit: FOCUS_GROUP_LIMIT,
    focusStyleProperties: FOCUS_STYLE_PROPERTIES,
    focusPseudoProperties: FOCUS_PSEUDO_PROPERTIES,

    mediaSelector: "audio, video",
    mediaStopControlSelector: MEDIA_STOP_CONTROL_SELECTOR,
    mediaStopControlPattern: MEDIA_STOP_CONTROL_PATTERN,

    motionLegacySelector: "marquee, blink",
    motionStopControlSelector: MOTION_STOP_CONTROL_SELECTOR,
    motionStopControlPattern: MOTION_STOP_CONTROL_PATTERN,
    motionSafeProperties: MOTION_SAFE_PROPERTIES,
    motionExcludedRoleSelector: MOTION_EXCLUDED_ROLE_SELECTOR,
    motionMinArea: MOTION_MIN_AREA,
    motionDecorativeNamePattern: MOTION_DECORATIVE_NAME_PATTERN,

    autoExecChangeSelector:
      'select, input[type="radio"], input[type="checkbox"]',
    autoExecFocusSelector: "input, select, textarea",
    autoExecPatterns: AUTO_EXEC_PATTERNS,
    autoExecConfirmSelector: AUTO_EXEC_CONFIRM_SELECTOR,
  };
}

/* ------------------------------------------------------------------ */
/* fixGuide                                                            */
/* ------------------------------------------------------------------ */

/** 한국어 안내문을 HTML 주석으로 감싼다(연속 하이픈은 주석을 조기에 닫으므로 사이를 벌린다). */
function htmlComment(text: string): string {
  return `<!-- ${text.replace(/--+/g, (run) => run.split("").join(" "))} -->`;
}

/** 한국어 안내문을 CSS 주석으로 감싼다(본문에 주석 종료 기호가 있으면 주석이 조기에 닫힌다). */
function cssComment(text: string): string {
  return `/* ${text.replace(/\*\//g, "* /")} */`;
}

function buildFocusVisibleFix(finding: KwcagProbeFinding): FixGuide {
  // before는 실제 위반 요소의 HTML, after는 그 요소를 가리키는 CSS다.
  // 요소가 어떤 CSS 규칙 때문에 표시를 잃었는지는 알 수 없으므로(주입 CSS·인라인 스타일·
  // 프레임워크 리셋 어디든 가능) 원인 CSS를 지어내지 않고, 실제 선택자로 표시를 되살리는
  // 코드만 준다. 색과 두께는 DESIGN.md의 focus 토큰 값이다.
  const selector = finding.selector || "button";
  const after = [
    cssComment("포커스 표시는 제거하지 말고, 디자인이 맞지 않으면 대체 표시를 준다"),
    `${selector}:focus-visible {`,
    "  outline: 2px solid #004ac6;",
    "  outline-offset: 2px;",
    "}",
    cssComment(
      "outline을 쓸 수 없다면 box-shadow, 테두리, 배경색 변화 중 하나로 대체한다"
    ),
  ].join("\n");
  return { before: finding.html, after };
}

function buildAutoplayFix(finding: KwcagProbeFinding): FixGuide {
  // variant는 실제 위반 요소의 태그명("audio" | "video")이라 지어낸 값이 아니다.
  const tag = finding.variant === "video" ? "video" : "audio";
  const after =
    tag === "video"
      ? [
          htmlComment("자동 재생이 필요하면 소리를 끄고 시작한다"),
          "<video autoplay muted playsinline></video>",
          htmlComment("소리가 필요한 영상이라면 controls로 사용자가 직접 시작하게 한다"),
          "<video controls></video>",
        ].join("\n")
      : [
          htmlComment("소리는 자동으로 재생하지 않고 사용자가 시작하게 한다"),
          "<audio controls></audio>",
        ].join("\n");
  return { before: finding.html, after };
}

function buildPauseStopFix(finding: KwcagProbeFinding): FixGuide {
  if (finding.variant === "marquee") {
    // 코드 안의 한국어는 주석에만 둔다(IssueCard가 JetBrains Mono로 렌더한다).
    // 버튼 이름 같은 실제 문구는 지어내지 않고 자리표시자(...)로 남긴다.
    const after = [
      htmlComment(
        "marquee는 표준에서 제거된 태그이고 사용자가 멈출 방법이 없다"
      ),
      htmlComment(
        "움직이지 않는 목록으로 바꾸거나, 움직임이 꼭 필요하면 정지 버튼을 함께 제공한다"
      ),
      '<div class="notice-list">...</div>',
      '<button type="button" aria-pressed="false">',
      `  ${htmlComment("버튼 이름은 '공지 자동 넘김 정지'처럼 동작을 그대로 적는다")}`,
      "</button>",
    ].join("\n");
    return { before: finding.html, after };
  }

  // 선택자는 실제 후보 요소의 것이다. 애니메이션 정의(@keyframes)는 알 수 없으므로 건드리지 않고,
  // 정지 수단만 얹는다.
  const selector = finding.selector || ".auto-motion";
  const after = [
    cssComment("사용자의 동작 최소화 설정에 반응한다"),
    "@media (prefers-reduced-motion: reduce) {",
    `  ${selector} {`,
    "    animation: none;",
    "  }",
    "}",
    cssComment(
      "이것만으로는 부족하다. 화면에 보이는 정지 버튼(button aria-label=정지)을 함께 제공해야 한다"
    ),
  ].join("\n");
  return { before: finding.html, after };
}

function buildNoAutoExecutionFix(finding: KwcagProbeFinding): FixGuide {
  const handler = finding.variant === "onfocus" ? "onfocus" : "onchange";
  const after = [
    htmlComment(
      `${handler}에서 이동·제출을 실행하지 않는다. 사용자가 확인 버튼을 눌렀을 때만 실행한다`
    ),
    '<form action="/search" method="get">',
    '  <label for="sort">...</label>',
    '  <select id="sort" name="sort">...</select>',
    '  <button type="submit">...</button>',
    "</form>",
    htmlComment("확인 버튼의 이름은 '적용'처럼 무엇이 일어나는지 알 수 있게 적는다"),
  ].join("\n");
  return { before: finding.html, after };
}

function buildFixGuide(finding: KwcagProbeFinding): FixGuide {
  switch (finding.ruleId) {
    case KWCAG_RULE_ID.focusVisible:
      return buildFocusVisibleFix(finding);
    case KWCAG_RULE_ID.autoplayAudioControl:
      return buildAutoplayFix(finding);
    case KWCAG_RULE_ID.pauseStopHide:
      return buildPauseStopFix(finding);
    default:
      return buildNoAutoExecutionFix(finding);
  }
}

/* ------------------------------------------------------------------ */
/* 공개 API                                                            */
/* ------------------------------------------------------------------ */

/** 프로브가 돌려준 위반 하나 → IssueDraft 하나. (룰 1개 = 이슈 1개, 반복은 occurrenceCount) */
export function buildKwcagIssue(finding: KwcagProbeFinding): IssueDraft {
  const copy = COPY[finding.ruleId];
  const fixGuide = buildFixGuide(finding);

  return {
    ruleId: finding.ruleId,
    // 리터럴 "kwcag"를 박지 않는다 — 접두사 규약과 판별 로직이 어긋나면 필터에서 사라진다.
    ruleType: toRuleType(finding.ruleId),
    // 카테고리는 engine/rules.ts의 CATEGORY_BY_RULE_ID가 단일 소스다. map.ts가 채운다.
    category: "",
    severity: SEVERITY_BY_RULE_ID[finding.ruleId],
    title: copy.title,
    description: copy.description,
    location: {
      selector: finding.selector,
      // html은 브라우저 안에서 이미 잘라 왔다. 여기서 한 번 더 태우는 이유는 상한이 바뀌었을 때
      // 두 값이 어긋나지 않게 하기 위해서다(같은 함수를 통과하므로 결과가 항상 같다).
      html: truncateSnippet(finding.html),
      occurrenceCount: finding.occurrenceCount,
    },
    fixGuide,
    // AI 대체 텍스트 제안은 이미지 룰 전용이라 KWCAG 4종 모두 대상이 아니다.
    aiSuggestion: {
      available: false,
      suggestedAltText: null,
      status: "not_requested",
    },
  };
}
