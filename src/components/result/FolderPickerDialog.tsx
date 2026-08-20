"use client";

import { useActionState, useEffect, useState } from "react";
import { FolderChoiceFields } from "@/components/folders/FolderChoiceFields";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  loadFoldersEnsuringDefault,
  saveDiagnosisToFolder,
} from "@/lib/folders/actions";
import {
  NEW_FOLDER_VALUE,
  type Folder,
  type SaveFolderState,
} from "@/lib/folders/types";
import { useFreshActionState } from "@/lib/hooks/useFreshActionState";

type FolderPickerDialogProps = {
  open: boolean;
  /** 저장 대상 진단의 URL. 결과 본문은 서버가 이 값으로 직접 가져온다. */
  url: string;
  onClose: () => void;
  onSaved: (folderName: string) => void;
};

const EMPTY_STATE: SaveFolderState = {};

/** "폴더에 저장" 모달. 기존 폴더 목록 + 새 폴더 만들기(PLAN.md §4). */
export function FolderPickerDialog({
  open,
  url,
  onClose,
  onSaved,
}: FolderPickerDialogProps) {
  const [state, formAction, isPending] = useActionState(
    saveDiagnosisToFolder,
    EMPTY_STATE
  );

  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState("");

  // 모달이 열리는 순간의 액션 state는 "지난 회차의 결과"라 걸러 낸다.
  // (같은 문제를 겪는 곳이 여러 군데라 훅으로 뺐다 — useFreshActionState 주석 참고)
  const freshState = useFreshActionState(state, open, EMPTY_STATE);

  // 열릴 때마다 목록을 다시 읽는다. 다른 탭에서 폴더를 만들었을 수도 있고,
  // 이 액션이 "폴더가 없으면 기본 폴더를 만들어 주는" 역할도 겸한다.
  //
  // 이전 목록을 지우지 않고 그 위에 덮어쓴다 — 두 번째부터는 로딩 문구가 깜빡이지 않고,
  // effect 본문에서 동기적으로 setState 하지 않아 연쇄 렌더도 생기지 않는다.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    loadFoldersEnsuringDefault().then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setLoadError(result.error);
        return;
      }

      setLoadError(null);
      setFolders(result.folders);
      setChoice(result.folders[0]?.id ?? NEW_FOLDER_VALUE);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (freshState.savedFolderName) onSaved(freshState.savedFolderName);
  }, [freshState, onSaved]);

  const message = loadError ?? freshState.error;

  return (
    <Modal open={open} onClose={onClose} title="폴더에 저장">
      <div className="flex flex-col gap-xs">
        <span className="font-heading text-label-caps text-on-surface-variant">
          진단 대상
        </span>
        <p className="font-mono text-code-md break-all text-on-surface">{url}</p>
      </div>

      {folders === null && !loadError ? (
        <p
          role="status"
          className="font-sans text-body-md text-on-surface-variant"
        >
          폴더 목록을 불러오는 중입니다…
        </p>
      ) : null}

      {message ? (
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
          <span>{message}</span>
        </div>
      ) : null}

      {folders !== null ? (
        <form action={formAction} className="flex flex-col gap-lg">
          <input type="hidden" name="url" value={url} />

          <FolderChoiceFields
            folders={folders}
            legend="저장할 폴더"
            value={choice}
            onChange={setChoice}
            disabled={isPending}
          />

          <div className="flex flex-wrap justify-end gap-sm">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending || !choice}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
