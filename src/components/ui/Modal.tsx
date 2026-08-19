"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** 제목. h2로 렌더되고 aria-labelledby로 dialog에 연결된다. */
  title: string;
  children: ReactNode;
};

/**
 * 네이티브 <dialog> + showModal() 기반 모달.
 *
 * 포커스 트랩, ESC 닫기, top-layer 렌더, 닫을 때 트리거로의 포커스 복귀를 브라우저가 전부 해 준다.
 * 접근성을 진단하는 제품이 손으로 짠 포커스 트랩을 쓰는 건 자기모순이라 직접 구현하지 않았다.
 *
 * DESIGN.md 고도 규칙: 그림자는 "일시적인 오버레이에만 제한적으로" 허용되므로
 * 여기서만 규정된 값(0 4px 12px rgba(15,23,42,0.1))을 쓴다.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // dialog.open과 대조해 이미 원하는 상태면 건드리지 않는다.
    // 열려 있는 dialog에 showModal()을 다시 부르면 InvalidStateError가 난다.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      // ESC의 기본 동작(네이티브 close)을 막고 부모 상태를 통해서만 닫는다.
      // 막지 않으면 DOM은 닫혔는데 open prop은 true로 남아 상태가 어긋난다.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // 배경(::backdrop) 클릭은 dialog 엘리먼트 자신을 타깃으로 잡힌다.
      // 안쪽 콘텐츠는 별도 div라 여기에 걸리지 않는다.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-[32rem] rounded border border-outline-variant bg-surface-container-lowest p-0 text-on-surface shadow-[0_4px_12px_rgba(15,23,42,0.1)] backdrop:bg-navy-deep/50"
    >
      {/* 패딩을 dialog가 아니라 안쪽 div가 갖는다 — 그래야 배경 클릭 판정이 정확해진다. */}
      <div className="flex max-h-[85vh] flex-col gap-lg overflow-y-auto p-lg">
        <div className="flex items-start justify-between gap-md">
          <h2
            id={headingId}
            className="font-heading text-headline-sm text-navy-deep"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mt-xs -mr-xs inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-navy-deep transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              className="h-5 w-5"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </dialog>
  );
}
