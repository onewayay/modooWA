-- folders / diagnoses 테이블 권한(GRANT) 부여
--
-- 왜 이 마이그레이션이 따로 필요한가
--
-- Postgres에서 테이블 접근은 서로 다른 두 개의 층을 "모두" 통과해야 한다.
--   (1) GRANT  : 이 롤이 이 테이블에 손을 댈 수 있는가 (테이블 단위, 행을 보지 않음)
--   (2) RLS 정책: 손을 댈 수 있다면 그중 "어떤 행"까지 허용되는가 (행 단위)
-- 검사 순서는 (1) -> (2)라서, GRANT가 없으면 RLS 정책이 아무리 정확해도 평가 자체에
-- 도달하지 못하고 `42501 permission denied for table ...`로 먼저 끊긴다.
--
-- 20260819000000 마이그레이션은 (2)만 만들었다. 그리고 이 프로젝트에는 public 스키마의
-- 신규 테이블에 anon/authenticated 권한을 자동 부여하는 ALTER DEFAULT PRIVILEGES가 걸려 있지 않다.
-- (확인: information_schema.role_table_grants에서 두 테이블 대상 GRANT 0건, owner는 postgres)
-- 그래서 앱이 publishable key로 접속해 얻는 authenticated 롤은 select/insert가 전부 실패한다.
-- 정책이 옳다는 것과 앱이 동작한다는 것은 별개이며, 이 구멍은 실제 요청을 보내보기 전까지
-- 조용히 숨어 있었다. 아래 GRANT가 (1)층을 채워 넣는다.
--
-- 주의: default privileges가 없는 프로젝트이므로, 앞으로 public 스키마에 테이블을 추가할 때마다
-- RLS 정책과 함께 해당 테이블의 GRANT도 매번 명시해야 한다(자동으로 따라오지 않는다).


-- authenticated: 로그인한 사용자가 앱에서 실제로 쓰는 롤.
-- CRUD 4종을 모두 부여하되, "어떤 행"인지는 여기서 제한하지 않는다.
-- 행 범위 제한은 20260819000000에서 만든 RLS 정책(본인 user_id / 본인 소유 폴더)이 전담한다.
-- 즉 이 GRANT는 문을 여는 것이고, 문 안에서 어디까지 갈 수 있는지는 RLS가 통제한다.
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.diagnoses to authenticated;

-- anon(비로그인)에는 의도적으로 아무 권한도 주지 않는다.
-- modooWA는 로그인 필수 서비스이고(PLAN.md §4 "비로그인 접근 차단"), 두 테이블의 정책은 전부
-- `to authenticated`라 anon으로는 통과할 정책 자체가 없다. 여기에 GRANT만 주면 데이터는 못 읽으면서
-- 테이블 존재와 컬럼 구조만 노출되고 공격 표면이 넓어진다. 권한이 없으면 그 앞단에서 차단된다.

-- service_role에도 부여하지 않는다.
-- 이 앱은 서비스 롤 키를 사용하지 않는다(.env.local에 URL과 publishable key 두 개뿐).
-- service_role은 RLS를 우회하는 롤이라, 쓰지도 않을 경로에 미리 열어둘 이유가 없다.
-- 나중에 관리자 배치/백오피스가 생겨 실제로 필요해지면 그때 별도 마이그레이션으로 추가한다.

-- 시퀀스 GRANT는 넣지 않는다.
-- 두 테이블의 id는 모두 uuid + gen_random_uuid() 기본값이라 시퀀스를 쓰지 않는다.
-- 사용하지 않는 대상에 usage를 부여하면 다음 사람이 "어딘가 serial이 있나" 하고 오해하게 된다.
