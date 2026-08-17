import type { ReactNode } from "react";

type Feature = {
  title: string;
  body: string;
  icon: ReactNode;
};

// 아이콘은 DESIGN.md 규칙에 따라 2px 스트로크 + 각진 끝(square caps).
// 문구는 목업을 따르되, 심각도는 4단계가 아닌 치명/경고/권고 3단계로 교체했다(DESIGN.md 예외 규칙).
const FEATURES: Feature[] = [
  {
    title: "심각도별 진단",
    body: "발견된 문제를 치명·경고·권고로 자동 분류해 우선순위를 한눈에 파악합니다.",
    icon: (
      <>
        <path d="M2 12 C5 6 9 4 12 4 C15 4 19 6 22 12 C19 18 15 20 12 20 C9 20 5 18 2 12 Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    title: "WCAG · KWCAG 매핑",
    body: "국제 표준 WCAG 2.1과 한국형 지침 KWCAG 2.2 기준을 함께 연결해 근거를 제시합니다.",
    icon: (
      <>
        <path d="M12 3 L20 6 V12 C20 16 16 20 12 21 C8 20 4 16 4 12 V6 Z" />
        <polyline points="9 12 11 14 15 10" />
      </>
    ),
  },
  {
    title: "실전 수정 가이드",
    body: "각 항목마다 올바른 코드 예시와 잘못된 예시를 비교해 바로 적용할 수 있습니다.",
    icon: (
      <>
        <polyline points="9 8 5 12 9 16" />
        <polyline points="15 8 19 12 15 16" />
      </>
    ),
  },
];

/** 메인 페이지 하단 소개 카드. 정적 콘텐츠라 서버 컴포넌트로 둔다. */
export function FeatureCards() {
  return (
    <ul className="grid w-full gap-md sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => (
        // DESIGN.md: 카드 패딩 24px 이상, 그림자 없이 보더 + 톤 레이어로 깊이 표현
        <li
          key={feature.title}
          className="flex flex-col gap-sm rounded border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-surface-container-low text-primary-container">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              className="h-5 w-5"
            >
              {feature.icon}
            </svg>
          </span>
          {/* 메인 페이지에는 히어로 h1과 이 카드들 사이에 다른 섹션이 없으므로
              h2를 쓴다 (h3로 두면 레벨을 건너뛰어 헤딩 순서 위반). 시각적 크기는 headline-sm 유지. */}
          <h2 className="font-heading text-headline-sm text-navy-deep">
            {feature.title}
          </h2>
          <p className="font-sans text-body-md text-on-surface-variant">
            {feature.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
