-- folders / diagnoses 테이블 생성 + RLS 정책
--
-- PLAN.md §6(데이터 모델 초안)을 기준으로 하되, 아래 4가지는 의도적으로 초안과 다르게 구현했다.
--
-- 1) created_at: timestamp -> timestamptz
--    진단이 실행된 시각은 "절대 시점"이고, 화면에서는 Asia/Seoul로 포맷해 보여준다.
--    타임존이 없는 timestamp는 값을 기록/해석하는 쪽의 TZ 설정(로컬 개발 머신 vs 배포 환경)에
--    따라 같은 순간이 다른 값으로 저장되어 목록 정렬과 표시 시각이 어긋난다.
--
-- 2) result_json: nullable -> not null
--    진단 결과 본문이 없는 진단 행은 상세 화면에서 렌더링할 것이 없어 의미가 없다.
--    "저장하기"를 눌러 만들어지는 행만 존재하므로 저장 시점에 result_json은 항상 확보되어 있다.
--
-- 3) references users(id) -> references auth.users(id) on delete cascade
--    PLAN.md의 `users (id, email, created_at, ...)`는 "Supabase Auth 기본 제공"이라는 서술이지
--    public.users 테이블을 만들라는 뜻이 아니다. 실제 사용자 테이블은 auth.users다.
--    on delete cascade는 회원 탈퇴 시 참조 대상이 사라진 고아 폴더/진단이 남는 것을 막는다.
--
-- 4) folders (user_id, name) unique 인덱스 추가 (PLAN.md에 없는 추가 제약)
--    저장 시 폴더 선택 목록에 같은 이름의 폴더가 둘 뜨면 사용자가 둘을 구분할 방법이 없다.
--    또한 "기본 폴더"를 첫 저장 시점에 지연 생성하는데, 이 유니크 제약이 있어야 동시 호출에도
--    중복 생성 없이 멱등하게(충돌 시 기존 폴더 사용) 처리할 수 있다.


-- ============================================================
-- folders
-- ============================================================

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 공백만 입력한 이름(" ")을 막기 위해 btrim 후 길이를 검사한다.
  name text not null check (char_length(btrim(name)) between 1 and 50),
  created_at timestamptz not null default now()
);

comment on table public.folders is '진단 결과를 담는 사용자별 폴더. 저장하기 시 폴더를 지정한다.';

-- 같은 사용자 안에서 폴더 이름 중복 금지(위 4번 근거). 사용자가 다르면 같은 이름을 써도 된다.
-- name이 아니라 btrim(name)에 거는 이유: 위 check 제약은 검증할 때만 트림하고 저장되는 값은 원본이라,
-- "내 폴더"와 "내 폴더 "(뒤 공백)가 서로 다른 값이 되어 목록에서 육안으로 구분 불가능한 두 폴더가 생긴다.
-- 앱에서도 저장 전에 trim하지만, 이 제약의 존재 이유 자체가 앱을 믿지 않는 것이므로 DB에서 강제한다.
-- 대소문자는 구분한다 — "Test"와 "test"는 사용자가 의도적으로 다르게 지은 이름일 수 있다.
create unique index folders_user_id_name_key on public.folders (user_id, btrim(name));

-- 폴더 목록은 항상 "내 폴더"를 생성순으로 조회하므로 (user_id, created_at) 복합 인덱스를 둔다.
create index folders_user_id_created_at_idx on public.folders (user_id, created_at);

alter table public.folders enable row level security;

-- [SELECT] 조건: 행의 user_id가 로그인한 본인일 것. 남의 폴더는 목록/조회에서 아예 보이지 않는다.
-- auth.uid()를 (select auth.uid())로 감싼 이유: 그냥 auth.uid()로 쓰면 행마다 함수가 재평가되어
-- 폴더 수가 늘수록 느려지고 Supabase performance advisor의 auth_rls_initplan 경고가 뜬다.
-- 서브쿼리로 감싸면 InitPlan으로 한 번만 평가된다. (아래 모든 정책에 동일 적용)
create policy "본인 폴더만 조회" on public.folders
for select to authenticated
using ((select auth.uid()) = user_id);

comment on policy "본인 폴더만 조회" on public.folders is
  '조건: user_id = auth.uid(). 로그인 사용자가 소유한 폴더 행만 반환한다.';

-- [INSERT] 조건: 새로 넣는 행의 user_id가 본인일 것.
-- 클라이언트가 user_id에 남의 uuid를 넣어 대신 폴더를 만들어주는 것을 차단한다.
create policy "본인 폴더만 생성" on public.folders
for insert to authenticated
with check ((select auth.uid()) = user_id);

comment on policy "본인 폴더만 생성" on public.folders is
  '조건: 삽입되는 행의 user_id = auth.uid(). 타인 명의로 폴더를 생성할 수 없다.';

-- [UPDATE] 조건: using = 수정 대상이 본인 행일 것, with check = 수정 결과도 여전히 본인 행일 것.
-- with check가 없으면 본인 폴더의 user_id를 남의 uuid로 바꿔 폴더를 넘겨버릴 수 있다.
create policy "본인 폴더만 수정" on public.folders
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on policy "본인 폴더만 수정" on public.folders is
  '조건: 수정 전 행과 수정 후 행 모두 user_id = auth.uid(). 소유권 이전(user_id 변경)을 막는다.';

-- [DELETE] 조건: 삭제 대상 행이 본인 폴더일 것.
-- 폴더가 지워지면 FK on delete cascade로 그 안의 진단 행도 함께 삭제된다.
create policy "본인 폴더만 삭제" on public.folders
for delete to authenticated
using ((select auth.uid()) = user_id);

comment on policy "본인 폴더만 삭제" on public.folders is
  '조건: user_id = auth.uid(). 본인 소유 폴더만 삭제 가능하다.';


-- ============================================================
-- diagnoses
-- ============================================================

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 저장은 항상 폴더를 지정해서 이뤄지므로 folder_id는 not null이다.
  -- 폴더 삭제 시 그 안의 진단도 함께 사라지는 것이 사용자 기대에 맞아 cascade로 둔다.
  folder_id uuid not null references public.folders (id) on delete cascade,
  url text not null,
  -- score는 0~100 점수. 채점이 불가능한 예외 상황을 위해 null은 허용하되 범위는 강제한다.
  score integer check (score between 0 and 100),
  -- 결과 본문 없는 진단 행은 의미가 없다(위 2번 근거).
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.diagnoses is '저장된 진단 결과. 자동 저장이 아니라 "저장하기" 시에만 행이 생긴다.';

-- 폴더 상세: 특정 폴더의 진단을 최신순으로 조회한다.
create index diagnoses_folder_id_created_at_idx on public.diagnoses (folder_id, created_at desc);

-- 전체 목록/대시보드: 내 진단 전체를 최신순으로 조회한다.
create index diagnoses_user_id_created_at_idx on public.diagnoses (user_id, created_at desc);

alter table public.diagnoses enable row level security;

-- [SELECT] 조건: 행의 user_id가 본인일 것. 남의 진단 결과는 id를 알아도 조회되지 않는다.
create policy "본인 진단만 조회" on public.diagnoses
for select to authenticated
using ((select auth.uid()) = user_id);

comment on policy "본인 진단만 조회" on public.diagnoses is
  '조건: user_id = auth.uid(). 본인이 저장한 진단 결과만 반환한다.';

-- [INSERT] 조건: (1) 새 행의 user_id가 본인 + (2) folder_id가 "본인 소유" 폴더일 것.
-- (2)가 핵심이다. FK는 folder_id가 실재하는 폴더인지만 보장할 뿐 그 폴더의 주인이 누구인지는 보지 않는다.
-- user_id만 검사하면, 남의 폴더 uuid를 알아낸 사용자가 그 폴더 안에 자기 진단을 밀어넣어
-- 폴더 주인의 화면을 오염시킬 수 있다(쓰기 방향의 IDOR).
create policy "본인 진단만, 본인 폴더에만 저장" on public.diagnoses
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.folders f
    where f.id = folder_id
      and f.user_id = (select auth.uid())
  )
);

comment on policy "본인 진단만, 본인 폴더에만 저장" on public.diagnoses is
  '조건: 삽입 행의 user_id = auth.uid() AND folder_id가 auth.uid() 소유 폴더일 것. FK는 폴더 존재만 보장하고 소유자는 검사하지 않으므로 타인 폴더로의 삽입을 여기서 막는다.';

-- [UPDATE] 조건: using = 본인 행일 것, with check = 수정 후에도 본인 행이면서 목적지 폴더도 본인 소유일 것.
-- 폴더 이동(folder_id 변경)이 UPDATE로 일어나므로 INSERT와 동일한 폴더 소유권 검사가 필요하다.
-- 이게 없으면 본인 진단을 남의 폴더로 옮겨 넣을 수 있다.
create policy "본인 진단만 수정" on public.diagnoses
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.folders f
    where f.id = folder_id
      and f.user_id = (select auth.uid())
  )
);

comment on policy "본인 진단만 수정" on public.diagnoses is
  '조건: 수정 전 행 user_id = auth.uid() AND 수정 후 행도 user_id = auth.uid() AND 변경된 folder_id가 본인 소유 폴더일 것. 타인 폴더로의 이동을 막는다.';

-- [DELETE] 조건: 삭제 대상 진단이 본인 행일 것.
create policy "본인 진단만 삭제" on public.diagnoses
for delete to authenticated
using ((select auth.uid()) = user_id);

comment on policy "본인 진단만 삭제" on public.diagnoses is
  '조건: user_id = auth.uid(). 본인이 저장한 진단만 삭제 가능하다.';
