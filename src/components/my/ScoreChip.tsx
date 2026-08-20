import { GRADE_TONE_CLASS } from "@/components/ui/gradeTone";
import { GRADE_LABEL, MAX_SCORE, getGrade } from "@/lib/diagnosis/score";

type ScoreChipProps = {
  /** diagnoses.score는 nullable이다. */
  score: number | null;
};

const chipStyles =
  "inline-flex w-fit items-center gap-sm rounded-sm border border-outline-variant bg-surface-container-low px-sm py-xs font-heading text-label-caps text-navy-deep";

/**
 * 목록에서 점수와 등급을 한 칸에 보여주는 칩.
 *
 * Badge를 재사용하지 않는 이유: Badge는 심각도(치명/경고/권고) 전용 컴포넌트라
 * 라벨과 아이콘이 severity에 묶여 있다. 등급은 다른 축이므로 섞으면 둘 다 망가진다.
 *
 * 등급 색은 점에만 쓰고, 같은 정보를 점수 숫자와 한글 등급 라벨이 문자로도 전달한다
 * (DESIGN.md: 색만으로 정보를 전달하지 않는다).
 */
export function ScoreChip({ score }: ScoreChipProps) {
  if (score === null) {
    return (
      <span className={chipStyles}>
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-outline"
        />
        점수 없음
      </span>
    );
  }

  const grade = getGrade(score);

  return (
    <span className={chipStyles}>
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${GRADE_TONE_CLASS[grade]}`}
      />
      {score} / {MAX_SCORE} · {GRADE_LABEL[grade]}
    </span>
  );
}
