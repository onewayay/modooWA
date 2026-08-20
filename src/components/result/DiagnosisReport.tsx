import type { ReactNode } from "react";
import { ScorePanel } from "@/components/result/ScorePanel";
import { SeverityGroup } from "@/components/result/SeverityGroup";
import { SEVERITY_ORDER, type DiagnosisResult } from "@/lib/diagnosis/types";

type DiagnosisReportProps = {
  result: DiagnosisResult;
  /** 요약 패널 하단 조작 슬롯. ScorePanel로 그대로 흘려보낸다. */
  actions?: ReactNode;
};

/**
 * 결과 화면 본문 전체.
 * DiagnosisResult만 받는 순수 프레젠테이션이라, 방금 실행한 진단이든
 * DB에 저장된 result_json이든(마이페이지) 같은 컴포넌트로 렌더된다.
 */
export function DiagnosisReport({ result, actions }: DiagnosisReportProps) {
  const { meta, summary, issues } = result;

  // 심각도별로 한 번만 나눠 둔다.
  const issuesBySeverity = SEVERITY_ORDER.map((severity) => ({
    severity,
    items: issues.filter((issue) => issue.severity === severity),
  }));

  // 이슈가 있는 첫 그룹만 펼친 상태로 시작한다 — 가장 급한 항목이 바로 보이면서
  // 나머지는 접혀 있어 Progressive Disclosure가 유지된다.
  const firstNonEmpty = issuesBySeverity.find((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-lg">
      <ScorePanel meta={meta} summary={summary} actions={actions} />

      {issuesBySeverity.map(({ severity, items }) => (
        <SeverityGroup
          key={severity}
          severity={severity}
          issues={items}
          defaultOpen={severity === firstNonEmpty?.severity}
        />
      ))}
    </div>
  );
}
