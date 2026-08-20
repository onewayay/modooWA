import Link from "next/link";

type Crumb = {
  label: string;
  /** 없으면 현재 위치로 보고 링크 대신 텍스트로 렌더한다(마지막 항목). */
  href?: string;
};

type BreadcrumbProps = {
  items: Crumb[];
};

/**
 * 마이페이지 하위 화면의 이동 경로.
 *
 * 목록으로 돌아가는 길을 브라우저 뒤로 가기에만 맡기지 않기 위한 것이다 —
 * 진단 상세는 북마크나 주소 직접 입력으로도 들어올 수 있고, 그때는 뒤로 갈 곳이 없다.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="이동 경로">
      <ol className="flex flex-wrap items-center gap-sm font-sans text-body-sm text-on-surface-variant">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-sm">
            {index > 0 ? (
              // 색을 따로 주지 않고 ol의 on-surface-variant를 그대로 물려받는다.
              // outline(#737685)은 보더용 토큰이라 본문 크기 글자로 쓰면 페이지 배경 대비 4.4:1로 AA에 못 미친다.
              <span aria-hidden="true">/</span>
            ) : null}

            {item.href ? (
              // DESIGN.md: 본문 내 링크는 색맹 사용자를 위해 반드시 밑줄 표시.
              // 목록형 내비게이션이라 본문 인라인 링크 예외가 적용되지 않는다 —
              // 다른 조작 요소와 같은 44px 터치 타깃을 준다.
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center text-primary-container underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="break-all">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
