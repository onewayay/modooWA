/**
 * uuid 형태인지만 본다(버전·variant는 따지지 않는다).
 *
 * 동적 세그먼트를 그대로 Postgres에 넘기면 /my/folders/abc 같은 주소가 22P02(invalid_text_representation)로
 * 터진다. 사용자에게는 "불러오지 못했습니다"라는 서버 오류처럼 보이지만 실제로는 그냥 잘못된 주소이므로,
 * 쿼리를 보내기 전에 걸러 "찾을 수 없습니다"로 안내한다.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
