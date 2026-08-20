/**
 * ISO 문자열 → "2026년 8월 16일 오후 7:00".
 *
 * 서버와 클라이언트의 기본 로캘·타임존이 달라 하이드레이션 불일치가 나지 않도록
 * ko-KR과 Asia/Seoul을 명시한다. 결과 화면(ScorePanel)과 마이페이지의 진단 목록·상세가
 * 같은 표기를 써야 하므로 lib으로 뺐다.
 */
export function formatDiagnosedAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}
