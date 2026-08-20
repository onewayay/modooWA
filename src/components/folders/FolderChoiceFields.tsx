"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import {
  FOLDER_NAME_MAX_LENGTH,
  NEW_FOLDER_VALUE,
  type Folder,
} from "@/lib/folders/types";

type FolderChoiceFieldsProps = {
  folders: Folder[];
  /** fieldset의 legend. "저장할 폴더" / "이동할 폴더"처럼 맥락에 맞게 넣는다. */
  legend: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  /** 지정하면 그 폴더에 "(현재 폴더)"를 덧붙인다. 폴더 이동 화면에서 쓴다. */
  currentFolderId?: string;
};

/**
 * 폴더 선택 라디오 그룹 + "새 폴더 만들기" 입력.
 *
 * 저장 모달(FolderPickerDialog)과 이동 모달(MoveDiagnosisControl)이 공유한다.
 * 두 액션이 folderId / newFolderName이라는 같은 폼 필드 규약을 쓰기 때문에 그대로 재사용된다.
 *
 * 폴더 선택은 fieldset + 네이티브 radio로 만든다. 단일 선택의 올바른 시맨틱이고
 * 화살표 키 이동과 선택 상태 낭독을 브라우저가 그냥 해 준다.
 */
export function FolderChoiceFields({
  folders,
  legend,
  value,
  onChange,
  disabled,
  currentFolderId,
}: FolderChoiceFieldsProps) {
  const newNameRef = useRef<HTMLInputElement>(null);
  const newNameId = `${useId()}-new-folder-name`;

  // "새 폴더 만들기"를 고르면 바로 입력할 수 있어야 한다.
  useEffect(() => {
    if (value === NEW_FOLDER_VALUE) newNameRef.current?.focus();
  }, [value]);

  return (
    <>
      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-sm font-sans text-body-sm font-medium text-navy-deep">
          {legend}
        </legend>

        {folders.map((folder) => (
          <FolderOption
            key={folder.id}
            value={folder.id}
            checked={value === folder.id}
            onSelect={onChange}
            disabled={disabled}
          >
            {folder.name}
            {/* 현재 위치는 색이 아니라 글자로 알린다(DESIGN.md: 색만으로 정보 전달 금지). */}
            {folder.id === currentFolderId ? (
              <span className="text-on-surface-variant">(현재 폴더)</span>
            ) : null}
          </FolderOption>
        ))}

        <FolderOption
          value={NEW_FOLDER_VALUE}
          checked={value === NEW_FOLDER_VALUE}
          onSelect={onChange}
          disabled={disabled}
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
      {value === NEW_FOLDER_VALUE ? (
        <Input
          id={newNameId}
          name="newFolderName"
          label="새 폴더 이름"
          ref={newNameRef}
          maxLength={FOLDER_NAME_MAX_LENGTH}
          autoComplete="off"
          disabled={disabled}
        />
      ) : null}
    </>
  );
}

type FolderOptionProps = {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  disabled: boolean;
  /** "새 폴더 만들기" 행을 기존 폴더와 구분하기 위한 점선 테두리 */
  dashed?: boolean;
  children: ReactNode;
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
