"use client";

import { useCallback, useRef, useState } from "react";
import { DeleteFolderDialog } from "@/components/my/DeleteFolderDialog";
import { EmptyState } from "@/components/my/EmptyState";
import { FolderListItem } from "@/components/my/FolderListItem";
import type { FolderSummary } from "@/lib/folders/types";

type FolderListProps = {
  folders: FolderSummary[];
};

/**
 * 폴더 목록 섹션 전체.
 *
 * 삭제 모달을 여기서 하나만 들고 있는 이유는 DeleteFolderDialog 주석에 적어 두었다.
 * 그 결정의 대가로 삭제 성공 시 포커스를 되돌릴 책임도 이 컴포넌트가 진다 —
 * 트리거였던 버튼이 행과 함께 사라지므로, 살아남는 섹션 제목으로 옮긴다.
 */
export function FolderList({ folders }: FolderListProps) {
  const [deleteTarget, setDeleteTarget] = useState<FolderSummary | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  // DeleteFolderDialog의 effect 의존성에 들어가므로 참조가 안정적이어야 한다.
  const handleDeleted = useCallback(() => {
    setDeleteTarget(null);
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="folders-heading" className="flex flex-col gap-md">
      <h2
        id="folders-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-heading text-headline-md text-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        폴더
      </h2>

      {folders.length === 0 ? (
        <EmptyState
          message="아직 저장한 폴더가 없습니다. 진단 결과 화면에서 '폴더에 저장'을 누르면 폴더가 만들어집니다."
          actionHref="/"
          actionLabel="진단하러 가기"
        />
      ) : (
        <ul className="flex flex-col gap-md">
          {folders.map((folder) => (
            <FolderListItem
              key={folder.id}
              folder={folder}
              onRequestDelete={setDeleteTarget}
            />
          ))}
        </ul>
      )}

      {/* 닫혀 있어도 마운트를 유지한다. 네이티브 dialog가 close() 시점에 포커스를
          트리거로 되돌려 주는데, 언마운트되면 그 복귀가 일어나지 않는다. */}
      <DeleteFolderDialog
        folder={deleteTarget}
        onClose={closeDelete}
        onDeleted={handleDeleted}
      />
    </section>
  );
}
