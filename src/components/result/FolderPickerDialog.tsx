"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  loadFoldersEnsuringDefault,
  saveDiagnosisToFolder,
} from "@/lib/folders/actions";
import {
  FOLDER_NAME_MAX_LENGTH,
  NEW_FOLDER_VALUE,
  type Folder,
  type SaveFolderState,
} from "@/lib/folders/types";

type FolderPickerDialogProps = {
  open: boolean;
  /** 저장 대상 진단의 URL. 결과 본문은 서버가 이 값으로 직접 가져온다. */
  url: string;
  onClose: () => void;
  onSaved: (folderName: string) => void;
};

const EMPTY_STATE: SaveFolderState = {};

/**
 * "폴더에 저장" 모달. 기존 폴더 목록 + 새 폴더 만들기(PLAN.md §4).
 *
 * 폴더 선택은 fieldset + 네이티브 radio로 만든다. 단일 선택의 올바른 시맨틱이고
 * 화살표 키 이동과 선택 상태 낭독을 브라우저가 그냥 해 준다.
 */
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
  const newNameRef = useRef<HTMLInputElement>(null);

  const groupId = useId();
  const newNameId = `${groupId}-new-folder-name`;

  // 모달이 열리는 순간의 액션 state는 "지난 회차의 결과"다.
  // useActionState는 모달을 닫아도 마지막 결과를 들고 있어서, 이대로 두면
  // 저장 실패 후 다시 연 모달에 이전 에러가 그대로 떠 있고, 저장 성공 후 다시 열면
  // 성공 처리가 즉시 재실행되어 모달이 열리자마자 닫힌다.
  // prop 변화에 맞춰 렌더 중에 상태를 조정하는 React 공식 패턴으로 그 시점을 기억해 둔다.
  const [staleState, setStaleState] = useState(state);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStaleState(state);
  }
  const freshState = state === staleState ? EMPTY_STATE : state;

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

  // "새 폴더 만들기"를 고르면 바로 입력할 수 있어야 한다.
  useEffect(() => {
    if (choice === NEW_FOLDER_VALUE) newNameRef.current?.focus();
  }, [choice]);

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

          <fieldset className="flex flex-col gap-sm">
            <legend className="mb-sm font-sans text-body-sm font-medium text-navy-deep">
              저장할 폴더
            </legend>

            {folders.map((folder) => (
              <FolderOption
                key={folder.id}
                value={folder.id}
                checked={choice === folder.id}
                onSelect={setChoice}
                disabled={isPending}
              >
                {folder.name}
              </FolderOption>
            ))}

            <FolderOption
              value={NEW_FOLDER_VALUE}
              checked={choice === NEW_FOLDER_VALUE}
              onSelect={setChoice}
              disabled={isPending}
              dashed
            >
              {/* DESIGN.md 모양 규정: 아이콘은 2px 선형 스트로크 + 각진 끝.
                  "＋" 같은 글리프는 본문 폰트의 획 굵기를 따라가므로 규정을 만족하지 못하고,
                  스크린리더가 "플러스 기호"로 읽어 버린다. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                className="h-4 w-4 shrink-0"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              새 폴더 만들기
            </FolderOption>
          </fieldset>

          {/* 선택했을 때만 렌더한다 — 비활성 입력창을 계속 띄워 두면 탭 순서에 잡히지 않는
              빈 칸이 남아 무엇을 해야 하는지 흐려진다. */}
          {choice === NEW_FOLDER_VALUE ? (
            <Input
              id={newNameId}
              name="newFolderName"
              label="새 폴더 이름"
              ref={newNameRef}
              maxLength={FOLDER_NAME_MAX_LENGTH}
              autoComplete="off"
              disabled={isPending}
            />
          ) : null}

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

type FolderOptionProps = {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  disabled: boolean;
  /** "새 폴더 만들기" 행을 기존 폴더와 구분하기 위한 점선 테두리 */
  dashed?: boolean;
  children: React.ReactNode;
};

/**
 * 폴더 한 줄.
 *
 * 네이티브 radio를 숨기지 않고 그대로 보여준다 — 선택 상태를 색이 아니라 컨트롤 자체가 전달하므로
 * DESIGN.md의 "색만으로 정보를 전달하지 않는다"를 자동으로 만족한다.
 * 포커스 링은 has-[:focus-visible]로 행 전체에 그려 2px 링 + 2px 오프셋 규정을 지킨다.
 */
function FolderOption({
  value,
  checked,
  onSelect,
  disabled,
  dashed = false,
  children,
}: FolderOptionProps) {
  return (
    <label
      className={`flex min-h-11 items-center gap-sm rounded border px-md py-sm font-sans text-body-md text-on-surface transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-container has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface-container-lowest ${
        dashed ? "border-dashed" : ""
      } ${
        checked
          ? "border-primary-container bg-surface-container-low"
          : "border-outline-variant hover:bg-surface-container-low"
      } ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`.trim()}
    >
      <input
        type="radio"
        name="folderId"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="h-4 w-4 shrink-0 accent-primary-container focus-visible:outline-none"
      />
      <span className="flex items-center gap-sm break-all">{children}</span>
    </label>
  );
}
