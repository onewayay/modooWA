"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteFolder } from "@/lib/folders/actions";
import type { DeleteFolderState, FolderSummary } from "@/lib/folders/types";
import { useFreshActionState } from "@/lib/hooks/useFreshActionState";

type DeleteFolderDialogProps = {
  /** 삭제 대상. null이면 모달이 닫혀 있다는 뜻이다. */
  folder: FolderSummary | null;
  onClose: () => void;
  onDeleted: () => void;
};

const EMPTY_STATE: DeleteFolderState = {};

/**
 * 폴더 삭제 확인 모달.
 *
 * 목록의 각 행이 아니라 목록 전체가 이 모달 하나를 공유한다. 행 안에 두면 삭제에 성공하는 순간
 * 행과 함께 모달까지 언마운트되어, 결과를 알릴 곳도 포커스를 되돌릴 곳도 사라진다.
 */
export function DeleteFolderDialog({
  folder,
  onClose,
  onDeleted,
}: DeleteFolderDialogProps) {
  const [state, formAction, isPending] = useActionState(
    deleteFolder,
    EMPTY_STATE
  );

  const open = folder !== null;
  const freshState = useFreshActionState(state, open, EMPTY_STATE);

  useEffect(() => {
    if (freshState.deleted) onDeleted();
  }, [freshState, onDeleted]);

  return (
    <Modal open={open} onClose={onClose} title="폴더 삭제">
      <p className="font-sans text-body-md text-on-surface">
        <strong className="font-medium text-navy-deep">{folder?.name}</strong>{" "}
        폴더를 삭제합니다.
      </p>

      {/* 무엇이 함께 사라지는지 숫자로 말한다. cascade(diagnoses.folder_id on delete cascade)를
          "폴더만 지워지겠지"로 오해하면 되돌릴 수 없는 손실이 난다. */}
      <p className="font-sans text-body-md text-on-surface-variant">
        {folder && folder.diagnosisCount > 0
          ? `이 폴더에 저장된 진단 ${folder.diagnosisCount}건도 함께 삭제되며, 삭제한 진단은 복구할 수 없습니다.`
          : "이 폴더에는 저장된 진단이 없습니다."}
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
        <input type="hidden" name="folderId" value={folder?.id ?? ""} />

        {/* 취소를 먼저 둔다 — 모달이 열릴 때 기본 포커스가 파괴적 버튼에 얹히지 않도록. */}
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
          {isPending ? "삭제 중…" : "폴더 삭제"}
        </Button>
      </form>
    </Modal>
  );
}
