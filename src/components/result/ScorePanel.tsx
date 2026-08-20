import type { HTMLAttributes, ReactNode } from "react";
import { GRADE_TONE_CLASS } from "@/components/ui/gradeTone";
import { formatDiagnosedAt } from "@/lib/diagnosis/format";
import {
  GRADE_LABEL,
  MAX_SCORE,
  getGrade,
  getScoreRatio,
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
  /**
   * 패널 하단 조작 슬롯. 새 진단 결과에서는 "폴더에 저장",
   * 저장된 진단(마이페이지)에서는 "다른 폴더로 이동"이 들어온다.
   *
   * boolean prop(showSaveButton)이 아니라 슬롯인 이유: 두 화면이 같은 자리에
   * "다른 컨트롤"을 놓기 때문이다. 덕분에 이 컴포넌트가 진짜로 순수 프레젠테이션이 된다.
   */
  actions?: ReactNode;
} & HTMLAttributes<HTMLElement>;

// DESIGN.md 고도 규칙: Surface 1 = 화이트 + 저대비 아웃라인, 그림자 없음
const panelStyles =
  "flex flex-col gap-lg rounded border border-outline-variant bg-surface-container-lowest p-lg";

/**
 * 결과 화면 최상단 요약 패널 — 종합 점수·등급, 진단 대상 메타.
 * summary.bySeverity를 그대로 읽는다(PLAN.md §6: issues를 순회하지 않고 요약을 그리기 위한 필드).
 */
export function ScorePanel({
  meta,
  summary,
  actions,
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
              className={`h-2 w-2 rounded-full ${GRADE_TONE_CLASS[grade]}`}
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
              className={`h-full ${GRADE_TONE_CLASS[grade]}`}
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

      {actions}
    </section>
  );
}
