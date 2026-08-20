"use client";

import { useActionState, useState } from "react";
import { FolderChoiceFields } from "@/components/folders/FolderChoiceFields";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { moveDiagnosisToFolder } from "@/lib/diagnoses/actions";
import type { MoveDiagnosisState } from "@/lib/diagnoses/types";
import type { Folder } from "@/lib/folders/types";
import { useFreshActionState } from "@/lib/hooks/useFreshActionState";

type MoveDiagnosisControlProps = {
  diagnosisId: string;
  currentFolderId: string;
  /** 서버가 미리 조회해 내려준다 — 모달을 열 때마다 왕복할 이유가 없다. */
  folders: Folder[];
};

const EMPTY_STATE: MoveDiagnosisState = {};

/**
 * 저장된 진단을 다른 폴더로 재지정(PLAN.md §4 Phase 2).
 *
 * 결과 화면에서 "폴더에 저장"이 있던 자리를 그대로 차지한다. 이미 저장된 진단이라
 * 다시 저장하는 건 의미가 없고, 여기서 필요한 조작은 "어느 폴더에 둘지"뿐이다.
 *
 * 완료 메시지를 모달이 아니라 여기서 들고 있는 이유는 SaveToFolderButton과 같다 —
 * 성공하면 모달이 닫히므로, 메시지가 모달 안에 있으면 읽기도 전에 사라진다.
 * 자동으로 없어지는 토스트를 쓰지 않는 이유도 같다(스크린리더·저시력 사용자).
 */
export function MoveDiagnosisControl({
  diagnosisId,
  currentFolderId,
  folders,
}: MoveDiagnosisControlProps) {
  const [state, formAction, isPending] = useActionState(
    moveDiagnosisToFolder,
    EMPTY_STATE
  );

  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(currentFolderId);
  const [movedFolderName, setMovedFolderName] = useState<string | null>(null);

  const freshState = useFreshActionState(state, open, EMPTY_STATE);

  // 이동에 성공하면 모달을 닫고 완료 메시지를 남긴다.
  // effect 대신 렌더 중 상태 조정을 쓰는 이유는 FolderListItem과 같다(깜빡임 + cascading render).
  const [prevMovedName, setPrevMovedName] = useState(freshState.movedFolderName);
  if (freshState.movedFolderName !== prevMovedName) {
    setPrevMovedName(freshState.movedFolderName);
    if (freshState.movedFolderName) {
      setMovedFolderName(freshState.movedFolderName);
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        onClick={() => {
          setChoice(currentFolderId);
          setOpen(true);
        }}
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
          <path d="M3 6h6l2 3h10v10H3z" />
          <polyline points="12 12 15 15 12 18" />
        </svg>
        다른 폴더로 이동
      </Button>

      {/* 비어 있을 때도 라이브 리전을 DOM에 남겨 둔다 —
          내용과 함께 영역이 새로 삽입되면 일부 스크린리더가 변경을 놓친다. */}
      <p role="status" className="font-sans text-body-sm text-on-surface-variant">
        {movedFolderName ? `'${movedFolderName}' 폴더로 이동했습니다.` : ""}
      </p>

      {/* 닫혀 있어도 마운트를 유지한다(네이티브 dialog의 포커스 복귀). */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="다른 폴더로 이동"
      >
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

        <form action={formAction} className="flex flex-col gap-lg">
          <input type="hidden" name="diagnosisId" value={diagnosisId} />

          <FolderChoiceFields
            folders={folders}
            legend="이동할 폴더"
            value={choice}
            onChange={setChoice}
            disabled={isPending}
            currentFolderId={currentFolderId}
          />

          <div className="flex flex-wrap justify-end gap-sm">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending || !choice}>
              {isPending ? "이동 중…" : "이동"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
