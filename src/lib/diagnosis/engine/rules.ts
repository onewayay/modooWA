/**
 * 룰별 부가 정보 — 카테고리 / AI 제안 대상 / 수정 가이드 코드.
 *
 * axe가 주는 것은 "무엇이 틀렸는가"까지다. 화면이 필요로 하는 "어떻게 고치는가"(fixGuide.after)와
 * "무슨 분류인가"(category)는 여기서 만든다. 이 파일이 map.ts와 분리된 이유는,
 * 룰이 늘어날 때 손대는 곳을 여기 한 곳으로 묶어 매핑 로직(map.ts)을 건드리지 않게 하기 위해서다.
 *
 * ⚠ fixGuide.after 작성 규칙(타협 불가):
 * IssueCard는 이 값을 CodeBlock(JetBrains Mono)에 그대로 넣는다. JetBrains Mono에는 한글 글리프가
 * 없어서 한글 산문을 넣으면 폰트 폴백이 일어나 자간·행높이가 어긋난다. 그래서 after는 **반드시
 * 코드 형태**여야 하고, 한국어 설명이 필요하면 HTML/CSS 주석 안에만 넣는다.
 */

import type { NodeResult, Result } from "axe-core";

import type { FixGuide } from "@/lib/diagnosis/types";

/**
 * 코드 스니펫 최대 길이. 미니파이된 페이지의 한 요소가 수 KB짜리 인라인 스타일을 달고 있는 경우가
 * 흔해서, 자르지 않으면 결과 카드 하나가 화면을 다 먹고 result_json 용량도 폭발한다.
 */
export const MAX_SNIPPET_LENGTH = 500;

/** 말줄임 표시를 포함해 자른다. 잘렸다는 사실 자체가 정보이므로 표시를 남긴다. */
export function truncateSnippet(html: string): string {
  const source = html.trim();
  if (source.length <= MAX_SNIPPET_LENGTH) return source;
  return `${source.slice(0, MAX_SNIPPET_LENGTH)}…`;
}

/* ------------------------------------------------------------------ */
/* 카테고리                                                            */
/* ------------------------------------------------------------------ */

/**
 * 카테고리 어휘 단일 소스.
 *
 * types.ts의 `Issue["category"]`가 union이 아니라 `string`이라 오타가 컴파일 타임에 안 잡힌다.
 * 아래 두 테이블과 KWCAG 커스텀 룰이 같은 라벨을 각자 문자열 리터럴로 적으면 "구조"와 "구조 "
 * 같은 차이로 카테고리 필터가 조용히 갈라지므로, 라벨 값은 여기서만 만든다.
 */
export const ISSUE_CATEGORY = {
  image: "이미지",
  color: "색상",
  forms: "폼",
  keyboard: "키보드",
  language: "언어",
  tables: "표",
  media: "멀티미디어",
  aria: "ARIA",
  structure: "구조",
  /** cat.* 태그도 없고 id 예외도 아닌 룰의 폴백 */
  other: "기타",
} as const;

/**
 * axe의 `cat.*` 태그 → modooWA 분류 라벨.
 * axe 룰에는 `cat.*` 태그가 정확히 1개씩 붙어 있으므로 첫 번째로 매칭되는 것을 쓰면 된다.
 */
const CATEGORY_BY_TAG: Readonly<Record<string, string>> = {
  "cat.text-alternatives": ISSUE_CATEGORY.image,
  "cat.color": ISSUE_CATEGORY.color,
  "cat.forms": ISSUE_CATEGORY.forms,
  "cat.keyboard": ISSUE_CATEGORY.keyboard,
  "cat.language": ISSUE_CATEGORY.language,
  "cat.tables": ISSUE_CATEGORY.tables,
  "cat.time-and-media": ISSUE_CATEGORY.media,
  "cat.aria": ISSUE_CATEGORY.aria,
  "cat.name-role-value": ISSUE_CATEGORY.aria,
  "cat.structure": ISSUE_CATEGORY.structure,
  "cat.semantics": ISSUE_CATEGORY.structure,
  "cat.parsing": ISSUE_CATEGORY.structure,
  "cat.sensory-and-visual-cues": ISSUE_CATEGORY.structure,
};

/**
 * 태그 분류가 사용자 관점과 어긋나는 룰, 그리고 axe 태그 자체가 없는 KWCAG 커스텀 룰을 id로 덮어쓴다.
 *
 * document-title / frame-title은 axe 기준으로 `cat.text-alternatives`(대체 텍스트)지만,
 * "이미지" 필터를 켠 사용자가 페이지 제목 누락을 보게 되면 분류를 신뢰하지 않게 된다.
 *
 * kwcag-* 룰은 axe를 거치지 않아 `cat.*` 태그가 없다. 여기 등록하지 않으면 전부 "기타"로 떨어진다.
 * 카테고리만 KWCAG 모듈이 아니라 이 테이블에 두는 이유는, 이 표가 이미 "룰 id → 카테고리"를 위해
 * 존재하는 자리이고(위 두 선례), 어휘가 두 파일로 흩어지면 카테고리 필터가 붙을 때 반드시 어긋나기 때문이다.
 *
 * kwcag-pause-stop-hide를 "구조"에 넣은 건 확정된 결정사항이다 — 정지 수단 부재는 성격상
 * 별도 "타이밍" 축에 가깝지만, 룰 하나 때문에 카테고리를 늘리면 대다수 페이지에서 항목이 0건인
 * 필터가 생긴다(PLAN.md §11, 이슈 #7).
 */
const CATEGORY_BY_RULE_ID: Readonly<Record<string, string>> = {
  "document-title": ISSUE_CATEGORY.structure,
  "frame-title": ISSUE_CATEGORY.structure,

  // KWCAG 커스텀 룰 (engine/kwcag) — PLAN.md §11
  "kwcag-focus-visible": ISSUE_CATEGORY.keyboard,
  "kwcag-autoplay-audio-control": ISSUE_CATEGORY.media,
  "kwcag-pause-stop-hide": ISSUE_CATEGORY.structure,
  "kwcag-no-auto-execution": ISSUE_CATEGORY.forms,
};

/** cat.* 태그도 없고 id 예외도 아닌 룰의 기본 분류 */
const DEFAULT_CATEGORY: string = ISSUE_CATEGORY.other;

export function getCategory(ruleId: string, tags: readonly string[]): string {
  const override = CATEGORY_BY_RULE_ID[ruleId];
  if (override) return override;

  for (const tag of tags) {
    const category = CATEGORY_BY_TAG[tag];
    if (category) return category;
  }
  return DEFAULT_CATEGORY;
}

/* ------------------------------------------------------------------ */
/* AI 대체 텍스트 제안 대상                                            */
/* ------------------------------------------------------------------ */

/**
 * AI가 "이미지를 보고 대체 텍스트를 써 주는" 것이 의미 있는 룰만 열어 둔다.
 * 대비 부족이나 레이블 누락은 이미지가 아니라 코드/디자인 문제라 AI 제안 버튼이 뜨면
 * 사용자는 눌러 보고 아무 도움이 안 된다는 것을 알게 된다 — 기능 신뢰도만 깎인다.
 */
const AI_SUGGESTION_RULE_IDS: ReadonlySet<string> = new Set([
  "image-alt",
  "input-image-alt",
  "area-alt",
  "role-img-alt",
  "svg-img-alt",
]);

export function isAiSuggestionAvailable(ruleId: string): boolean {
  return AI_SUGGESTION_RULE_IDS.has(ruleId);
}

/* ------------------------------------------------------------------ */
/* 카피 덮어쓰기                                                       */
/* ------------------------------------------------------------------ */

/**
 * axe 한국어 로케일의 help/description은 "무엇을 확인하세요" 톤이라 정확하지만 건조하다.
 * mock.ts에서 다듬어 둔 "사용자에게 어떤 피해가 가는가" 톤이 더 나은 룰만 골라서 덮어쓴다.
 * 나머지 룰은 로케일 문구를 그대로 쓴다 — 손으로 번역 테이블을 만들면 axe 업데이트마다 어긋난다.
 */
export const COPY_OVERRIDES: Readonly<
  Record<string, { title: string; description: string }>
> = {
  "image-alt": {
    title: "이미지 대체 텍스트 누락",
    description:
      '시각장애 사용자는 스크린리더로 이 이미지를 인식할 수 없습니다. 의미를 전달하는 이미지에는 alt 속성으로 내용을 설명해야 하며, 장식용 이미지라면 alt=""로 비워 스크린리더가 건너뛰도록 해야 합니다.',
  },
  label: {
    title: "입력 필드에 레이블이 연결되지 않음",
    description:
      "입력 필드에 연결된 레이블이 없어 스크린리더 사용자가 어떤 값을 입력해야 하는지 알 수 없습니다. placeholder는 입력을 시작하면 사라지므로 레이블을 대체할 수 없습니다.",
  },
  "color-contrast": {
    title: "본문 텍스트 명도 대비 부족",
    description:
      "텍스트와 배경의 명도 대비가 WCAG AA 기준(일반 텍스트 4.5:1, 큰 텍스트 3:1)에 미치지 못합니다. 저시력 사용자나 밝은 환경에서 화면을 보는 사용자가 글자를 읽기 어렵습니다.",
  },
  "heading-order": {
    title: "제목 레벨이 순차적으로 증가하지 않음",
    description:
      "제목 계층이 한 단계를 건너뜁니다. 스크린리더 사용자는 제목 목록으로 페이지 구조를 파악하므로, 레벨을 건너뛰면 문서 구조를 잘못 이해할 수 있습니다.",
  },
  "html-has-lang": {
    title: "문서 기본 언어가 명시되지 않음",
    description:
      "html 요소에 lang 속성이 없어 스크린리더가 어떤 언어로 읽어야 할지 판단하지 못합니다. 한국어 페이지에서 영어 발음으로 읽히는 문제가 생길 수 있습니다.",
  },
  "landmark-one-main": {
    title: "main 랜드마크가 없음",
    description:
      "페이지에 main 랜드마크가 없어 스크린리더 사용자가 반복되는 헤더·내비게이션을 건너뛰고 본문으로 바로 이동하기 어렵습니다. 필수는 아니지만 탐색 효율을 크게 높여줍니다.",
  },
};

/* ------------------------------------------------------------------ */
/* HTML 조작 유틸 (fixGuide.after 생성용)                              */
/* ------------------------------------------------------------------ */

/**
 * 여는 태그가 끝나는 위치(`>`의 인덱스). 못 찾으면 -1.
 * 따옴표 안의 `>`는 건너뛴다 — `alt=">"`나 인라인 스타일에 들어간 부등호에 걸리지 않게.
 */
function findOpeningTagEnd(html: string): number {
  if (!html.startsWith("<")) return -1;

  let quote: string | null = null;
  for (let i = 1; i < html.length; i += 1) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") return i;
  }
  return -1;
}

/**
 * 여는 태그에 속성을 끼워 넣는다. 형태를 확신할 수 없으면 null을 돌려주고,
 * 호출부는 지어내는 대신 failureSummary 폴백으로 내려간다.
 */
function injectAttributes(html: string, attributes: string): string | null {
  const source = html.trim();
  const end = findOpeningTagEnd(source);
  if (end === -1) return null;

  // XHTML 스타일 `<img ... />`이면 `/` 앞에 넣어야 속성이 태그 밖으로 새지 않는다.
  const selfClosing = source[end - 1] === "/";
  const splitAt = selfClosing ? end - 1 : end;
  const head = source.slice(0, splitAt).trimEnd();
  const tail = source.slice(splitAt);
  // 자기닫음 태그는 `/` 앞 공백을 되살린다. `alt="…"/>`는 유효하지만 붙어 있으면 읽기 나쁘다.
  return `${head} ${attributes}${selfClosing ? " " : ""}${tail}`;
}

/** 여는 태그에서 속성값을 읽는다. 없으면 null. */
function readAttribute(html: string, name: string): string | null {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const matched = pattern.exec(html);
  if (!matched) return null;
  return matched[2] ?? matched[3] ?? null;
}

/** 속성이 있으면 값을 바꾸고, 없으면 새로 끼워 넣는다. */
function setAttribute(
  html: string,
  name: string,
  value: string
): string | null {
  const pattern = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*')`, "i");
  if (pattern.test(html.trim())) {
    return html.trim().replace(pattern, `$1"${value}"`);
  }
  return injectAttributes(html, `${name}="${value}"`);
}

/**
 * 한국어 안내문을 HTML 주석으로 감싼다.
 * 본문에 있는 연속 하이픈은 주석을 조기에 닫아 버리므로 사이를 벌린다.
 */
function toHtmlComment(text: string): string {
  const safe = text.replace(/--+/g, (run) => run.split("").join(" "));
  return safe.includes("\n") ? `<!--\n${safe}\n-->` : `<!-- ${safe} -->`;
}

/* ------------------------------------------------------------------ */
/* 명도 대비 계산 (color-contrast 전용)                                */
/* ------------------------------------------------------------------ */

type Rgb = [number, number, number];

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

function parseHexColor(value: unknown): Rgb | null {
  if (typeof value !== "string") return null;
  const matched = HEX_PATTERN.exec(value.trim());
  if (!matched) return null;

  const hex = matched[1];
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function toHexColor(rgb: Rgb): string {
  return `#${rgb
    .map((channel) =>
      Math.round(channel).toString(16).padStart(2, "0").toLowerCase()
    )
    .join("")}`;
}

/** WCAG 2.x 상대 휘도 */
function relativeLuminance([r, g, b]: Rgb): number {
  const channels = [r, g, b].map((raw) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

function mix(from: Rgb, to: Rgb, ratio: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
    from[2] + (to[2] - from[2]) * ratio,
  ];
}

/**
 * 목표 대비에 얹는 여유분.
 *
 * WCAG는 "4.5:1 이상"이라 딱 4.5도 통과지만, axe의 색 대비 체크는 `contrast > expected`로
 * **초과**를 요구한다. 여유 없이 정확히 4.5:1인 색을 권고하면 사용자가 그대로 고쳤는데
 * 다음 진단에서 또 걸린다 — 도구를 못 믿게 되는 가장 빠른 길이다.
 * 8비트 색상 한 계단 차이보다 작은 값이라 색 자체는 사실상 그대로다.
 */
const CONTRAST_MARGIN = 0.05;

/**
 * 기준 대비를 만족하는 전경색을 찾는다.
 *
 * 지어내는 값이 아니라 계산 결과다: 원래 전경색을 검정 또는 흰색 쪽으로 이분 탐색하며
 * 목표 대비를 넘는 **가장 가까운** 색을 고른다. 색상 자체(hue)를 유지하려는 의도이고,
 * 배경이 중간 회색이라 어느 방향으로도 기준을 못 넘기면 null을 돌려준다(그때는 안내만 한다).
 */
function findAccessibleForeground(
  fg: Rgb,
  bg: Rgb,
  target: number
): Rgb | null {
  const goal = target + CONTRAST_MARGIN;

  // 배경이 밝으면 어둡게, 어두우면 밝게. 대비가 커지는 방향은 하나뿐이다.
  const anchor: Rgb = relativeLuminance(bg) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  if (contrastRatio(anchor, bg) < goal) return null;

  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (contrastRatio(mix(fg, anchor, mid), bg) >= goal) high = mid;
    else low = mid;
  }
  // 이분 탐색은 실수 색상에서 끝나므로 정수로 반올림한 뒤 다시 검증한다.
  // 반올림이 대비를 기준 아래로 떨어뜨리면 한 계단 더 앵커 쪽으로 민다.
  for (const ratio of [high, Math.min(1, high + 1 / 255), 1]) {
    const candidate = mix(fg, anchor, ratio).map(Math.round) as Rgb;
    if (contrastRatio(candidate, bg) >= goal) return candidate;
  }
  return null;
}

/** axe color-contrast 체크가 실어 보내는 데이터 모양 */
type ContrastData = {
  fgColor?: unknown;
  bgColor?: unknown;
  contrastRatio?: unknown;
  expectedContrastRatio?: unknown;
};

/** `"4.5:1"` 또는 `4.5` 어느 쪽으로 와도 숫자로 뽑는다. */
function parseRatio(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRatio(value: number): string {
  return `${Math.round(value * 100) / 100}:1`;
}

/**
 * color-contrast 계열 전용 before/after.
 *
 * 통과 조건: 체크 데이터에서 전경/배경 색을 둘 다 hex로 읽어낼 수 있을 것.
 * 실패 조건: data가 없거나(체크 구현이 바뀜/incomplete로 분류됨) 색을 파싱하지 못하면 null →
 *            호출부가 일반 폴백(failureSummary 주석)으로 내려간다. 여기서 색을 지어내면
 *            "권고대로 고쳤는데 여전히 위반"이 되어 도구 신뢰도를 잃는다.
 */
function buildContrastFixGuide(node: NodeResult): FixGuide | null {
  const check =
    node.any.find((candidate) => candidate.id.startsWith("color-contrast")) ??
    node.any[0];
  const data = (check?.data ?? null) as ContrastData | null;
  if (!data) return null;

  const fg = parseHexColor(data.fgColor);
  const bg = parseHexColor(data.bgColor);
  if (!fg || !bg) return null;

  const current = parseRatio(data.contrastRatio) ?? contrastRatio(fg, bg);
  const expected = parseRatio(data.expectedContrastRatio) ?? 4.5;

  const before = [
    `color: ${toHexColor(fg)};`,
    `background-color: ${toHexColor(bg)};`,
    `/* 대비 ${formatRatio(current)} — 기준 ${formatRatio(expected)} 미달 */`,
  ].join("\n");

  const fixed = findAccessibleForeground(fg, bg, expected);
  if (!fixed) {
    // 배경이 중간 명도라 전경색만으로는 기준을 못 넘기는 경우. 배경을 바꾸라고만 알린다.
    const after = [
      `color: ${toHexColor(fg)};`,
      `background-color: /* 배경색부터 조정 */;`,
      `/* 이 배경색으로는 전경색을 어떻게 바꿔도 ${formatRatio(expected)}를 넘길 수 없다 */`,
    ].join("\n");
    return { before, after };
  }

  const after = [
    `color: ${toHexColor(fixed)};`,
    `background-color: ${toHexColor(bg)};`,
    `/* 대비 ${formatRatio(contrastRatio(fixed, bg))} — 기준 ${formatRatio(expected)} 충족 */`,
  ].join("\n");
  return { before, after };
}

/* ------------------------------------------------------------------ */
/* 룰별 after 템플릿                                                   */
/* ------------------------------------------------------------------ */

/**
 * 위반 노드의 실제 HTML을 받아 "고친 코드"를 만든다.
 * 만들 수 없으면(태그 형태를 확신 못 하면) null → 폴백으로 내려간다.
 */
type FixTemplate = (node: NodeResult) => string | null;

/** 속성 하나만 붙이면 되는 대다수 룰을 위한 생성기 */
function attributeTemplate(attributes: string, note?: string): FixTemplate {
  return (node) => {
    const fixed = injectAttributes(node.html, attributes);
    if (!fixed) return null;
    return note ? `${fixed}\n${toHtmlComment(note)}` : fixed;
  };
}

const FIX_TEMPLATES: Readonly<Record<string, FixTemplate>> = {
  "image-alt": attributeTemplate(
    'alt="이미지 내용 설명"',
    '장식용 이미지라면 alt="" 로 비워 스크린리더가 건너뛰게 한다'
  ),
  "input-image-alt": attributeTemplate(
    'alt="버튼 기능 설명"',
    "이미지 버튼의 alt는 그림 묘사가 아니라 눌렀을 때의 동작을 적는다"
  ),
  "area-alt": attributeTemplate('alt="영역 설명"'),
  "role-img-alt": attributeTemplate('aria-label="이미지 의미 설명"'),
  "svg-img-alt": attributeTemplate(
    'aria-label="아이콘 의미 설명"',
    "svg 안에 <title> 요소를 넣어도 된다"
  ),
  "object-alt": attributeTemplate(
    'aria-label="콘텐츠 설명"',
    "object 안쪽에 대체 콘텐츠를 넣는 방법도 있다"
  ),
  "frame-title": attributeTemplate(
    'title="프레임 내용 설명"',
    "프레임이 여러 개면 서로 구분되는 title을 준다"
  ),
  "button-name": attributeTemplate(
    'aria-label="버튼 기능 설명"',
    "버튼 안에 보이는 텍스트를 넣을 수 있으면 aria-label보다 그쪽이 낫다"
  ),
  "link-name": attributeTemplate(
    'aria-label="링크 목적 설명"',
    '"자세히 보기" 처럼 목적을 알 수 없는 문구는 링크 텍스트로 쓰지 않는다'
  ),

  // 레이블은 요소 하나로 끝나지 않고 label-input 쌍을 만들어야 한다.
  label: (node) => {
    const id = readAttribute(node.html, "id") ?? "user-input";
    const input = setAttribute(node.html, "id", id);
    if (!input) return null;
    return [
      `<label for="${id}">항목 이름</label>`,
      input,
      toHtmlComment(
        "레이블을 화면에 노출할 수 없다면 aria-label을 쓰되 placeholder로 대체하지 않는다"
      ),
    ].join("\n");
  },

  "html-has-lang": () =>
    [
      '<html lang="ko">',
      toHtmlComment("페이지 주 언어가 한국어일 때의 값이다"),
    ].join("\n"),

  "html-lang-valid": (node) => setAttribute(node.html, "lang", "ko"),

  "valid-lang": (node) => {
    const fixed = setAttribute(node.html, "lang", "ko");
    if (!fixed) return null;
    return [
      fixed,
      toHtmlComment("lang 값은 BCP 47 형식이어야 한다 (ko, en, ja, zh-Hans …)"),
    ].join("\n");
  },

  "document-title": () =>
    [
      "<head>",
      "  <title>페이지 제목 - 사이트명</title>",
      "</head>",
      toHtmlComment("제목만 읽고도 어느 페이지인지 알 수 있게 쓴다"),
    ].join("\n"),

  "meta-viewport": () =>
    [
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      toHtmlComment(
        "user-scalable=no / maximum-scale 은 확대를 막으므로 넣지 않는다"
      ),
    ].join("\n"),
};

/* ------------------------------------------------------------------ */
/* 폴백                                                                */
/* ------------------------------------------------------------------ */

/**
 * 템플릿이 없는 룰의 after.
 *
 * 통과 조건: axe가 준 failureSummary가 있을 것 — 한국어 로케일이 주입되므로 이미 한글이다.
 * 실패 조건: failureSummary가 없으면 헬프 문서 URL만 안내한다.
 *
 * 어느 쪽이든 수정 코드를 **지어내지 않는다**. 접근성 진단 도구가 틀린 예시를 주면
 * 사용자는 그대로 고치고 다시 걸린다 — 없는 것보다 나쁘다.
 */
function buildFallbackAfter(violation: Result, node?: NodeResult): string {
  const summary = node?.failureSummary?.trim();
  if (summary) return toHtmlComment(summary);

  return toHtmlComment(
    `자동 생성 가능한 수정 예시가 없는 규칙입니다. 수정 방법: ${violation.helpUrl}`
  );
}

/* ------------------------------------------------------------------ */
/* 공개 API                                                            */
/* ------------------------------------------------------------------ */

/**
 * 룰 하나의 before/after 코드 쌍.
 *
 * before를 인자로 받지 않고 여기서 함께 만드는 이유: color-contrast는 before가 HTML이 아니라
 * CSS여야 after와 짝이 맞는다. 쌍을 두 파일로 쪼개면 한쪽만 고쳤을 때 before는 HTML,
 * after는 CSS인 어긋난 카드가 나온다.
 */
export function buildFixGuide(violation: Result): FixGuide {
  const node = violation.nodes[0];
  const before = node ? truncateSnippet(node.html) : "";

  if (violation.id.startsWith("color-contrast") && node) {
    const contrast = buildContrastFixGuide(node);
    if (contrast) return contrast;
  }

  const template = FIX_TEMPLATES[violation.id];
  const generated = node && template ? template(node) : null;

  return {
    before,
    after: truncateSnippet(generated ?? buildFallbackAfter(violation, node)),
  };
}
