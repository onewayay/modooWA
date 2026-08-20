"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { renameFolder } from "@/lib/folders/actions";
import {
  FOLDER_NAME_MAX_LENGTH,
  type FolderSummary,
  type RenameFolderState,
} from "@/lib/folders/types";
import { useFreshActionState } from "@/lib/hooks/useFreshActionState";

type FolderListItemProps = {
  folder: FolderSummary;
  onRequestDelete: (folder: FolderSummary) => void;
};

const EMPTY_STATE: RenameFolderState = {};

/**
 * 폴더 한 줄 — 진입 링크 + 진단 개수 + 이름 변경(인라인) + 삭제 트리거.
 *
 * 이름 변경을 모달이 아니라 인라인으로 둔 이유: 고칠 대상이 바로 옆에 있고 입력 칸도 하나뿐이라,
 * 화면을 덮고 포커스를 가두는 비용이 얻는 것보다 크다.
 */
export function FolderListItem({
  folder,
  onRequestDelete,
}: FolderListItemProps) {
  const [state, formAction, isPending] = useActionState(
    renameFolder,
    EMPTY_STATE
  );

  const [editing, setEditing] = useState(false);
  // React 19는 action이 끝나면 제어되지 않는 폼을 초기화한다. 이름이 중복이라 에러로 되돌아왔을 때
  // 방금 친 값이 사라지면 안 되므로 입력을 제어 컴포넌트로 둔다.
  const [name, setName] = useState(folder.name);

  const inputRef = useRef<HTMLInputElement>(null);
  const renameButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  const inputId = `${useId()}-folder-name`;
  const freshState = useFreshActionState(state, editing, EMPTY_STATE);

  // 편집을 열면 입력창으로, 접으면 트리거 버튼으로 포커스를 옮긴다.
  // 사라진 입력창 자리에 포커스가 남으면 키보드 사용자는 자기 위치를 잃는다.
  // 최초 렌더에서 버튼을 낚아채지 않도록 "편집 중이었는지"를 기억해 둔다.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (wasEditing.current) renameButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  // 이름 변경에 성공하면 편집을 접는다.
  // effect가 아니라 렌더 중에 처리하는 이유: effect에서 setState하면 편집 폼이 한 번 더 그려진 뒤
  // 사라져 화면이 깜빡이고, cascading render를 금지하는 react-hooks 규칙에도 걸린다.
  // "직전 값과 달라졌을 때만 조정한다"는 React 공식 패턴이라 무한 루프가 생기지 않는다.
  const [prevRenamedName, setPrevRenamedName] = useState(
    freshState.renamedName
  );
  if (freshState.renamedName !== prevRenamedName) {
    setPrevRenamedName(freshState.renamedName);
    if (freshState.renamedName) setEditing(false);
  }

  function cancelEditing() {
    setName(folder.name);
    setEditing(false);
  }

  return (
    <li className="rounded border border-outline-variant bg-surface-container-lowest p-lg">
      {editing ? (
        <form
          action={formAction}
          className="flex flex-col gap-md"
          onKeyDown={(event) => {
            // ESC로 편집을 접는다. 모달과 달리 브라우저가 대신 해 주지 않는다.
            if (event.key === "Escape") cancelEditing();
          }}
        >
          <input type="hidden" name="folderId" value={folder.id} />

          <Input
            id={inputId}
            name="name"
            label="폴더 이름"
            labelHidden
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={FOLDER_NAME_MAX_LENGTH}
            autoComplete="off"
            disabled={isPending}
            error={freshState.error}
          />

          <div className="flex flex-wrap justify-end gap-sm">
            <Button
              type="button"
              variant="secondary"
              onClick={cancelEditing}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className="flex min-w-0 flex-col gap-xs">
            {/* DESIGN.md: 본문 내 링크는 색맹 사용자를 위해 반드시 밑줄 표시 */}
            <Link
              href={`/my/folders/${folder.id}`}
              className="inline-flex min-h-11 items-center font-heading text-headline-sm break-all text-navy-deep underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              {folder.name}
            </Link>
            <p className="font-sans text-body-sm text-on-surface-variant">
              진단 {folder.diagnosisCount}개
            </p>
          </div>

          {/* 버튼 라벨에 폴더 이름을 숨겨 붙인다 — 화면에서는 위치로 알 수 있지만
              스크린리더로 버튼만 훑으면 "이름 변경"이 몇 개나 나열될 뿐이라 구분되지 않는다. */}
          <div className="flex flex-wrap gap-sm">
            <Button
              type="button"
              variant="ghost"
              ref={renameButtonRef}
              onClick={() => {
                setName(folder.name);
                setEditing(true);
              }}
            >
              이름 변경
              <span className="sr-only"> ({folder.name})</span>
            </Button>
            {/* 파괴적 조작이라 색을 따로 준다. `!`가 붙은 이유: Tailwind는 같은 속성을 다루는
                유틸리티를 클래스 이름 알파벳 순으로 출력하므로 text-error가 ghost의 text-navy-deep보다
                앞에 놓여 그냥은 덮이지 않는다. 색 자체는 critical(#dc2626)이 아니라 error(#ba1a1a)를 쓴다 —
                critical은 DESIGN.md에서 진단 심각도 전용이고, 흰 배경(4.8:1)이나 호버 틴트 위(4.1:1)에서
                본문 대비를 만족하지 못한다. error는 각각 6.5:1 / 5.5:1이다. */}
            <Button
              type="button"
              variant="ghost"
              className="text-error! hover:bg-error/10!"
              onClick={() => onRequestDelete(folder)}
            >
              삭제
              <span className="sr-only"> ({folder.name})</span>
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
