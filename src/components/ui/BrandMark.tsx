/**
 * modooWA 로고 마크.
 * DESIGN.md 아이콘 규칙(2px 선형 스트로크 + 각진 끝)을 따르며,
 * 색은 항상 currentColor를 쓰므로 사용하는 쪽에서 text-* 유틸리티로 지정한다.
 * 의미는 항상 옆의 워드마크가 전달하므로 aria-hidden 처리한다.
 */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className={className}
    >
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="7" y1="10" x2="17" y2="10" />
      <line x1="12" y1="13" x2="8" y2="21" />
      <line x1="12" y1="13" x2="16" y2="21" />
    </svg>
  );
}
