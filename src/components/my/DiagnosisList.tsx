"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { DeleteDiagnosisDialog } from "@/components/my/DeleteDiagnosisDialog";
import { EmptyState } from "@/components/my/EmptyState";
import { ScoreChip } from "@/components/my/ScoreChip";
import { Button } from "@/components/ui/Button";
import type { SavedDiagnosisSummary } from "@/lib/diagnoses/types";
import { formatDiagnosedAt } from "@/lib/diagnosis/format";

type DiagnosisListProps = {
  diagnoses: SavedDiagnosisSummary[];
};

/**
 * 폴더 안의 진단 이력 목록(PLAN.md §5).
 *
 * 카드 전체를 링크로 감싸지 않는다 — 링크 안에 삭제 버튼을 넣으면 인터랙티브 요소가 중첩되어
 * 키보드·스크린리더에서 동작이 어긋난다. URL만 링크로 두고 삭제는 형제로 배치한다.
 */
export function DiagnosisList({ diagnoses }: DiagnosisListProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<SavedDiagnosisSummary | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  // 삭제되면 트리거 버튼이 행과 함께 사라지므로, 살아남는 섹션 제목으로 포커스를 옮긴다.
  const handleDeleted = useCallback(() => {
    setDeleteTarget(null);
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="diagnoses-heading"
      className="flex flex-col gap-md"
    >
      <h2
        id="diagnoses-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-headline-md text-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        진단 기록 {diagnoses.length}건
      </h2>

      {diagnoses.length === 0 ? (
        <EmptyState
          message="이 폴더에 저장된 진단이 없습니다."
          actionHref="/"
          actionLabel="진단하러 가기"
        />
      ) : (
        <ul className="flex flex-col gap-md">
          {diagnoses.map((diagnosis) => (
            <li
              key={diagnosis.id}
              className="flex flex-wrap items-center justify-between gap-md rounded border border-outline-variant bg-surface-container-lowest p-lg"
            >
              <div className="flex min-w-0 flex-col gap-sm">
                {/* DESIGN.md: 본문 내 링크는 색맹 사용자를 위해 반드시 밑줄 표시 */}
                <Link
                  href={`/my/diagnoses/${diagnosis.id}`}
                  className="inline-flex min-h-11 items-center font-mono text-code-md break-all text-primary-container underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                  {diagnosis.url}
                </Link>

                <div className="flex flex-wrap items-center gap-md">
                  <ScoreChip score={diagnosis.score} />
                  <p className="font-sans text-body-sm text-on-surface-variant">
                    <time dateTime={diagnosis.createdAt}>
                      {formatDiagnosedAt(diagnosis.createdAt)}
                    </time>
                  </p>
                </div>
              </div>

              {/* 버튼만 훑는 스크린리더 사용자를 위해 어떤 기록인지 라벨에 숨겨 붙인다.
                  색은 error 토큰 + `!` — 이유는 FolderListItem의 삭제 버튼 주석 참고. */}
              <Button
                type="button"
                variant="ghost"
                className="text-error! hover:bg-error/10!"
                onClick={() => setDeleteTarget(diagnosis)}
              >
                삭제
                <span className="sr-only"> ({diagnosis.url})</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* 닫혀 있어도 마운트를 유지한다(네이티브 dialog의 포커스 복귀). */}
      <DeleteDiagnosisDialog
        diagnosis={deleteTarget}
        onClose={closeDelete}
        onDeleted={handleDeleted}
      />
    </section>
  );
}
