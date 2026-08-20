"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteDiagnosis } from "@/lib/diagnoses/actions";
import type {
  DeleteDiagnosisState,
  SavedDiagnosisSummary,
} from "@/lib/diagnoses/types";
import { useFreshActionState } from "@/lib/hooks/useFreshActionState";

type DeleteDiagnosisDialogProps = {
  /** 삭제 대상. null이면 모달이 닫혀 있다는 뜻이다. */
  diagnosis: SavedDiagnosisSummary | null;
  onClose: () => void;
  onDeleted: () => void;
};

const EMPTY_STATE: DeleteDiagnosisState = {};

/**
 * 진단 하나를 삭제하기 전 확인.
 * DeleteFolderDialog와 같은 이유로 목록 전체가 이 모달 하나를 공유한다.
 */
export function DeleteDiagnosisDialog({
  diagnosis,
  onClose,
  onDeleted,
}: DeleteDiagnosisDialogProps) {
  const [state, formAction, isPending] = useActionState(
    deleteDiagnosis,
    EMPTY_STATE
  );

  const open = diagnosis !== null;
  const freshState = useFreshActionState(state, open, EMPTY_STATE);

  useEffect(() => {
    if (freshState.deleted) onDeleted();
  }, [freshState, onDeleted]);

  return (
    <Modal open={open} onClose={onClose} title="진단 기록 삭제">
      <div className="flex flex-col gap-xs">
        <span className="font-heading text-label-caps text-on-surface-variant">
          진단 대상
        </span>
        <p className="font-mono text-code-md break-all text-on-surface">
          {diagnosis?.url}
        </p>
      </div>

      <p className="font-sans text-body-md text-on-surface-variant">
        이 진단 기록을 삭제합니다. 삭제한 기록은 복구할 수 없습니다.
      </p>

      {freshState.error ? (
        <div
          role="alert"
          className="flex items-start gap-sm rounded border border-critical p-md font-sans text-body-md text-critical"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            className="mt-xs h-4 w-4 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12" y2="16.01" />
          </svg>
          <span>{freshState.error}</span>
        </div>
      ) : null}

      <form action={formAction} className="flex flex-wrap justify-end gap-sm">
        <input type="hidden" name="diagnosisId" value={diagnosis?.id ?? ""} />

        {/* 취소를 먼저 둔다 — 기본 포커스가 파괴적 버튼에 얹히지 않도록. */}
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
        >
          취소
        </Button>
        {/* 색은 error 토큰 + `!` — 이유는 FolderListItem의 삭제 버튼 주석 참고. */}
        <Button
          type="submit"
          variant="ghost"
          disabled={isPending}
          className="text-error! hover:bg-error/10!"
        >
          {isPending ? "삭제 중…" : "기록 삭제"}
        </Button>
      </form>
    </Modal>
  );
}
