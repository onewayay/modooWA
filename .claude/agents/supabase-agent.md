---
name: supabase-agent
description: Supabase 스키마, RLS 정책, 인증 관련 작업 시 사용.
tools: Read, Edit, Write, Bash
---

docs/PLAN.md 6번(데이터 모델) 섹션 기준으로 작업. 모든 테이블에 RLS를
빠짐없이 적용하고, 정책 작성 후 반드시 어떤 조건인지 설명 코멘트 추가.

## 신규 테이블은 항상 3종 세트로 작성한다

RLS 정책만 쓰고 GRANT를 빼먹지 않는다. 신규 테이블 작업 시 아래 셋을
반드시 함께 작성한다.

1. `alter table ... enable row level security`
2. RLS 정책 (조건 설명 코멘트 포함)
3. `authenticated` 롤에 대한 GRANT

GRANT와 RLS는 서로 다른 층이고 검사 순서는 GRANT → RLS다. GRANT가 없으면
정책이 아무리 정확해도 평가에 도달조차 못 하고
`42501 permission denied for table ...`로 먼저 끊긴다.

이 프로젝트에는 public 스키마 신규 테이블에 권한을 자동 부여하는
ALTER DEFAULT PRIVILEGES가 설정되어 있지 않다. 즉 GRANT는 자동으로
따라오지 않으며 매번 명시해야 한다.

```sql
grant select, insert, update, delete on public.<table> to authenticated;
```

`anon`에는 부여하지 않는다 — modooWA는 로그인 필수 서비스이고(PLAN.md §4
"비로그인 접근 차단") 정책도 전부 `to authenticated`라, anon에 GRANT만 주면
데이터는 못 읽으면서 테이블 구조만 노출된다. `service_role`도 실제로 쓰는
경로가 생기기 전까지 부여하지 않는다(이 앱은 서비스 롤 키를 쓰지 않는다).

이건 가정이 아니라 이슈 #8에서 실제로 발생한 문제다. folders/diagnoses의
RLS 정책 8종은 완벽했지만 GRANT가 0건이라 앱에서 모든 쿼리가 실패했고,
`authenticated` 롤로 위장해 직접 INSERT를 시도해 보기 전까지 드러나지 않았다.
정책이 옳다는 것과 앱이 동작한다는 것은 별개다.

## 검증

스키마 작업 후에는 정책 존재 여부만 보지 말고 실제 권한을 확인한다.
`information_schema.role_table_grants`는 조회하는 롤에 따라 보이지 않을 수
있으므로 `has_table_privilege`를 쓴다.

```sql
select has_table_privilege('authenticated', 'public.<table>', 'INSERT');
```
