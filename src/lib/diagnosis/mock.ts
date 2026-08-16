import type { DiagnosisResult } from "@/lib/diagnosis/types";

/**
 * 진단 엔진이 붙기 전까지 정적 UI 작업에 쓰는 mock 데이터.
 * docs/PLAN.md §6 result_json 스키마를 그대로 따르며, 심각도별 2~3건씩 채웠다.
 * 실제 진단 결과로 교체될 임시 데이터다.
 */
export const mockDiagnosis: DiagnosisResult = {
  meta: {
    url: "https://example.com",
    diagnosedAt: "2026-08-16T10:00:00Z",
    engineVersion: "axe-core@4.x + kwcag-custom@1.0",
    score: 72,
  },
  summary: {
    total: 7,
    bySeverity: {
      critical: 2,
      warning: 3,
      recommendation: 2,
    },
  },
  issues: [
    {
      id: "image-alt-001",
      ruleId: "image-alt",
      ruleType: "wcag",
      category: "이미지",
      severity: "critical",
      title: "이미지 대체 텍스트 누락",
      description:
        "시각장애 사용자는 스크린리더로 이 이미지를 인식할 수 없습니다. 의미를 전달하는 이미지에는 alt 속성으로 내용을 설명해야 하며, 장식용 이미지라면 alt=\"\"로 비워 스크린리더가 건너뛰도록 해야 합니다.",
      location: {
        selector: "div.banner > img:nth-child(2)",
        html: '<img src="banner.jpg">',
        occurrenceCount: 3,
      },
      fixGuide: {
        before: '<img src="banner.jpg">',
        after: '<img src="banner.jpg" alt="회원가입 50% 할인 배너">',
      },
      aiSuggestion: {
        available: true,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
    {
      id: "label-001",
      ruleId: "label",
      ruleType: "wcag",
      category: "폼",
      severity: "critical",
      title: "입력 필드에 레이블이 연결되지 않음",
      description:
        "입력 필드에 연결된 레이블이 없어 스크린리더 사용자가 어떤 값을 입력해야 하는지 알 수 없습니다. placeholder는 입력을 시작하면 사라지므로 레이블을 대체할 수 없습니다.",
      location: {
        selector: "form#search > input[type=text]",
        html: '<input type="text" placeholder="검색어 입력">',
        occurrenceCount: 2,
      },
      fixGuide: {
        before: '<input type="text" placeholder="검색어 입력">',
        after:
          '<label for="search-keyword">검색어</label>\n<input id="search-keyword" type="text" placeholder="검색어 입력">',
      },
      aiSuggestion: {
        available: false,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
    {
      id: "color-contrast-001",
      ruleId: "color-contrast",
      ruleType: "wcag",
      category: "색상",
      severity: "warning",
      title: "본문 텍스트 명도 대비 부족",
      description:
        "본문 텍스트와 배경의 명도 대비가 3.1:1로 WCAG AA 기준(4.5:1)에 미치지 못합니다. 저시력 사용자나 밝은 환경에서 화면을 보는 사용자가 글자를 읽기 어렵습니다.",
      location: {
        selector: "section.notice > p.help-text",
        html: '<p class="help-text" style="color:#9ca3af">이용 안내를 확인하세요</p>',
        occurrenceCount: 12,
      },
      fixGuide: {
        before: 'color: #9ca3af; /* 대비 3.1:1 */',
        after: 'color: #4b5563; /* 대비 7.5:1 */',
      },
      aiSuggestion: {
        available: false,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
    {
      id: "heading-order-001",
      ruleId: "heading-order",
      ruleType: "wcag",
      category: "구조",
      severity: "warning",
      title: "제목 레벨이 순차적으로 증가하지 않음",
      description:
        "h2 다음에 h4가 나와 제목 계층이 한 단계 건너뜁니다. 스크린리더 사용자는 제목 목록으로 페이지 구조를 파악하므로, 레벨을 건너뛰면 문서 구조를 잘못 이해할 수 있습니다.",
      location: {
        selector: "main > section:nth-child(3) > h4",
        html: "<h4>세부 항목</h4>",
        occurrenceCount: 4,
      },
      fixGuide: {
        before: "<h2>진단 결과</h2>\n<h4>세부 항목</h4>",
        after: "<h2>진단 결과</h2>\n<h3>세부 항목</h3>",
      },
      aiSuggestion: {
        available: false,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
    {
      id: "kwcag-keyboard-focus-001",
      ruleId: "kwcag-focus-visible",
      ruleType: "kwcag",
      category: "키보드",
      severity: "warning",
      title: "초점 표시가 제거됨",
      description:
        "outline: none으로 초점 표시가 제거되어 키보드 사용자가 현재 어느 요소에 초점이 있는지 알 수 없습니다. 기본 초점 스타일을 제거할 경우 반드시 더 눈에 띄는 커스텀 스타일로 대체해야 합니다.",
      location: {
        selector: "nav.gnb a",
        html: '<a href="/pricing" style="outline:none">요금제</a>',
        occurrenceCount: 8,
      },
      fixGuide: {
        before: "a:focus { outline: none; }",
        after:
          "a:focus-visible {\n  outline: 2px solid #004ac6;\n  outline-offset: 2px;\n}",
      },
      aiSuggestion: {
        available: false,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
    {
      id: "html-has-lang-001",
      ruleId: "html-has-lang",
      ruleType: "wcag",
      category: "구조",
      severity: "recommendation",
      title: "문서 기본 언어가 명시되지 않음",
      description:
        "html 요소에 lang 속성이 없어 스크린리더가 어떤 언어로 읽어야 할지 판단하지 못합니다. 한국어 페이지에서 영어 발음으로 읽히는 문제가 생길 수 있습니다.",
      location: {
        selector: "html",
        html: "<html>",
        occurrenceCount: 1,
      },
      fixGuide: {
        before: "<html>",
        after: '<html lang="ko">',
      },
      aiSuggestion: {
        available: false,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
    {
      id: "landmark-main-001",
      ruleId: "landmark-one-main",
      ruleType: "wcag",
      category: "구조",
      severity: "recommendation",
      title: "main 랜드마크가 없음",
      description:
        "페이지에 main 랜드마크가 없어 스크린리더 사용자가 반복되는 헤더·내비게이션을 건너뛰고 본문으로 바로 이동하기 어렵습니다. 필수는 아니지만 탐색 효율을 크게 높여줍니다.",
      location: {
        selector: "body > div#root",
        html: '<div id="root">',
        occurrenceCount: 1,
      },
      fixGuide: {
        before: '<div id="root">\n  <div class="content">...</div>\n</div>',
        after: '<div id="root">\n  <main>...</main>\n</div>',
      },
      aiSuggestion: {
        available: false,
        suggestedAltText: null,
        status: "not_requested",
      },
    },
  ],
};
