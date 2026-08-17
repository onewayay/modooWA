import { mockDiagnosis } from "@/lib/diagnosis/mock";
import type { DiagnosisResult } from "@/lib/diagnosis/types";

/**
 * 결과 화면에 데이터를 공급하는 유일한 지점.
 *
 * 화면 컴포넌트는 전부 DiagnosisResult만 받는 순수 프레젠테이션이므로,
 * 이슈 #6에서는 이 함수 본문만 실제 진단 결과(axe-core + KWCAG 커스텀 룰)로 교체하면 된다.
 * 지금 당장 await 할 것이 없어도 async로 두어, 그때 호출부(page.tsx) 시그니처가 바뀌지 않게 한다.
 *
 * TODO(#6): mockDiagnosis 대신 진단 엔진 결과를 반환한다.
 *   - 진단은 /diagnose에서 이미 실행되므로, 여기서는 그 결과를 조회하는 형태가 된다.
 *   - 저장 전 결과는 DB에 없다(PLAN.md: 자동 저장하지 않음) — 전달 방식은 #6에서 확정한다.
 */
export async function getDiagnosisResult(url?: string): Promise<DiagnosisResult> {
  // url이 주어지면 meta.url만 덮어쓴다. 이슈·점수는 mock 그대로여서
  // "이 주소를 실제로 진단한 결과"가 아니라는 점은 화면 상단 배너가 알린다.
  if (!url) return mockDiagnosis;

  return {
    ...mockDiagnosis,
    meta: { ...mockDiagnosis.meta, url },
  };
}
