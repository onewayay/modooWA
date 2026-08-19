"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FolderPickerDialog } from "@/components/result/FolderPickerDialog";

type SaveToFolderButtonProps = {
  url: string;
};

/**
 * 결과 화면의 "폴더에 저장" 진입점(PLAN.md §5).
 *
 * 저장 완료 메시지를 모달이 아니라 여기서 들고 있는 이유: 저장에 성공하면 모달이 닫히는데,
 * 메시지가 모달 안에 있으면 사용자가 결과를 확인하기도 전에 함께 사라진다.
 *
 * 전역 토스트를 쓰지 않은 이유: 자동으로 사라지는 알림은 스크린리더·저시력 사용자가
 * 읽기 전에 없어질 수 있다. role="status"로 낭독은 시키되 화면에는 계속 남겨 둔다.
 */
export function SaveToFolderButton({ url }: SaveToFolderButtonProps) {
  const [open, setOpen] = useState(false);
  const [savedFolderName, setSavedFolderName] = useState<string | null>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  // FolderPickerDialog의 effect 의존성에 들어가므로 참조가 안정적이어야 한다.
  const handleSaved = useCallback((folderName: string) => {
    setSavedFolderName(folderName);
    setOpen(false);
  }, []);

  return (
    <div className="flex flex-col gap-sm">
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start"
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
          <path d="M5 3h11l3 3v15H5z" />
          <polyline points="8 3 8 9 15 9" />
          <rect x="8" y="13" width="8" height="6" />
        </svg>
        폴더에 저장
      </Button>

      {/* 비어 있을 때도 라이브 리전을 DOM에 남겨 둔다 —
          내용과 함께 영역이 새로 삽입되면 일부 스크린리더가 변경을 놓친다. */}
      <p role="status" className="font-sans text-body-sm text-on-surface-variant">
        {savedFolderName
          ? `'${savedFolderName}' 폴더에 저장했습니다.`
          : ""}
      </p>

      {/* 닫혀 있어도 마운트를 유지한다. 네이티브 <dialog>가 close() 시점에
          포커스를 이 버튼으로 되돌려 주는데, 언마운트되면 그 복귀가 일어나지 않는다. */}
      <FolderPickerDialog
        open={open}
        url={url}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </div>
  );
}
