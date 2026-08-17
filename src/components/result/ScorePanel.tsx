import type { HTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import {
  GRADE_LABEL,
  MAX_SCORE,
  getGrade,
  getScoreRatio,
  type Grade,
} from "@/lib/diagnosis/score";
import {
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  type DiagnosisMeta,
  type DiagnosisSummary,
} from "@/lib/diagnosis/types";

type ScorePanelProps = {
  meta: DiagnosisMeta;
  summary: DiagnosisSummary;
} & HTMLAttributes<HTMLElement>;

// DESIGN.md 고도 규칙: Surface 1 = 화이트 + 저대비 아웃라인, 그림자 없음
const panelStyles =
  "flex flex-col gap-lg rounded border border-outline-variant bg-surface-container-lowest p-lg";

// 등급 색은 심각도 토큰을 그대로 재사용한다.
// 점(dot)과 미터 바 채움에만 쓰고 텍스트 배경으로는 쓰지 않는다 — 대비 위험을 만들지 않기 위해서다.
//
// 두 요소 모두 aria-hidden이고, 같은 정보를 바로 옆의 숫자("72 / 100")와 한글 등급 라벨이
// 문자로 전달한다. 그래서 WCAG 1.4.11(비텍스트 대비 3:1)의 "장식 요소" 예외에 해당한다 —
// 실측상 warning 채움은 트랙(surface-container-high) 대비 2.60:1, 칩 배경 대비 2.89:1로
// 3:1에 못 미치는데, 이 색을 유지할 수 있는 근거가 위의 "색만으로 정보를 전달하지 않는다"이다.
const gradeToneStyles: Record<Grade, string> = {
  excellent: "bg-success",
  good: "bg-info",
  "needs-improvement": "bg-warning",
  poor: "bg-critical",
};

/**
 * 결과 화면 최상단 요약 패널 — 종합 점수·등급, 진단 대상 메타, "폴더에 저장" 진입점.
 * summary.bySeverity를 그대로 읽는다(PLAN.md §6: issues를 순회하지 않고 요약을 그리기 위한 필드).
 */
export function ScorePanel({
  meta,
  summary,
  className = "",
  ...rest
}: ScorePanelProps) {
  const grade = getGrade(meta.score);
  const ratio = getScoreRatio(meta.score);

  return (
    <section
      aria-labelledby="score-panel-heading"
      data-grade={grade}
      className={`${panelStyles} ${className}`.trim()}
      {...rest}
    >
      <h2 id="score-panel-heading" className="sr-only">
        종합 진단 요약
      </h2>

      <div className="flex flex-col gap-lg md:flex-row md:items-start md:justify-between">
        {/* 점수 + 등급 */}
        <div className="flex flex-col gap-sm">
          <span className="font-heading text-label-caps text-on-surface-variant">
            종합 점수
          </span>

          <p className="flex items-baseline gap-xs">
            <span className="font-heading text-display-lg text-navy-deep">
              {meta.score}
            </span>
            <span className="font-heading text-headline-sm text-on-surface-variant">
              / {MAX_SCORE}
            </span>
          </p>

          {/* 등급 칩. 메인 페이지 상태 칩과 같은 패턴 —
              유색 배경 대신 점 + 한글 라벨로 등급을 전달한다(색만으로 정보 전달 금지 + 대비 확보). */}
          <span className="inline-flex w-fit items-center gap-sm rounded-sm border border-outline-variant bg-surface-container-low px-sm py-xs font-heading text-label-caps text-navy-deep">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${gradeToneStyles[grade]}`}
            />
            {GRADE_LABEL[grade]}
          </span>

          {/* 미터 바는 위 숫자·등급의 시각적 반복일 뿐이라 보조기술에서 숨긴다(이중 낭독 방지).
              max-w-md가 아니라 max-w-[16rem]인 이유: DESIGN.md의 이름 있는 spacing 토큰(md=16px)이
              sizing 유틸과 충돌해 max-w-md는 16px으로 해석된다. */}
          <div
            aria-hidden="true"
            className="h-1 w-full max-w-[16rem] overflow-hidden rounded-sm bg-surface-container-high"
          >
            <div
              className={`h-full ${gradeToneStyles[grade]}`}
              style={{ width: `${ratio}%` }}
            />
          </div>
        </div>

        {/* 진단 대상 메타 */}
        <div className="flex flex-col gap-sm md:max-w-[24rem] md:items-end md:text-right">
          <span className="font-heading text-label-caps text-on-surface-variant">
            진단 대상
          </span>
          {/* 링크로 만들지 않는다 — 감사 대상 사이트로 나가는 링크를 결과 화면에서 제공할 이유가 없고,
              클릭 가능한 URL은 "지금 보고 있는 이 페이지의 결과"라는 오해를 부른다. */}
          <p className="font-mono text-code-md break-all text-on-surface">
            {meta.url}
          </p>
          <p className="font-sans text-body-sm text-on-surface-variant">
            <time dateTime={meta.diagnosedAt}>
              {formatDiagnosedAt(meta.diagnosedAt)}
            </time>
          </p>
          <p className="font-mono text-code-md break-all text-on-surface-variant">
            {meta.engineVersion}
          </p>
        </div>
      </div>

      {/* 심각도별 건수 */}
      <dl className="flex flex-wrap gap-lg border-t border-outline-variant pt-lg font-sans text-body-md">
        <div className="flex items-baseline gap-sm">
          <dt className="text-on-surface-variant">전체</dt>
          <dd className="font-heading text-headline-sm text-navy-deep">
            {summary.total}건
          </dd>
        </div>
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity} className="flex items-baseline gap-sm">
            <dt className="text-on-surface-variant">
              {SEVERITY_LABEL[severity]}
            </dt>
            <dd className="font-heading text-headline-sm text-navy-deep">
              {summary.bySeverity[severity]}건
            </dd>
          </div>
        ))}
      </dl>

      {/* 저장 기능은 이슈 #8. 설명 없는 비활성 버튼은 그 자체로 접근성 결함이므로
          보조 문구를 aria-describedby로 연결해 이유가 함께 낭독되게 한다. */}
      <div className="flex flex-col gap-sm">
        <Button
          type="button"
          disabled
          aria-describedby="save-pending-note"
          className="self-start"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            className="h-4 w-4"
          >
            <path d="M5 3h11l3 3v15H5z" />
            <polyline points="8 3 8 9 15 9" />
            <rect x="8" y="13" width="8" height="6" />
          </svg>
          폴더에 저장
        </Button>
        <p
          id="save-pending-note"
          className="font-sans text-body-sm text-on-surface-variant"
        >
          폴더 저장 기능은 이후 작업에서 연결됩니다.
        </p>
      </div>
    </section>
  );
}

/**
 * ISO 문자열 → "2026. 8. 16. 오후 7:00".
 * 서버와 클라이언트의 기본 로캘·타임존이 달라 하이드레이션 불일치가 나지 않도록
 * ko-KR과 Asia/Seoul을 명시한다.
 */
function formatDiagnosedAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}
