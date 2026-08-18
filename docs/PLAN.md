# 웹 접근성 진단 도구 기획문서 (초안)

---

## 1. 프로젝트 개요

| 항목          | 내용                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| 프로젝트명    | modooWA                                                                                             |
| 프로젝트 소개 | • URL을 입력하면 웹 접근성(WCAG + KWCAG)을 진단하고, 문제 위치와 수정 방법을 그루핑해서 보여줍니다. |

• 로그인한 유저는 페이지 진단 결과를 프로젝트별로 구분해서 저장할 수 있습니다.
• 진단 결과는 PDF로 export 가능합니다. |
| 대상 사용자 | 웹 퍼블리셔 및 프론트엔드 개발자, 프로젝트의 웹 접근성 진단이 필요한 개발자 |
| 개발 인원 | 1인 (개인 프로젝트) |

---

## 2. 배경 및 문제 인식

- 웹 접근성 진단 도구(Lighthouse, WAVE, axe DevTools)는 이미 다수 존재함
- 기존 도구의 공통적인 한계:
  1. 이슈를 나열만 할 뿐, **왜 문제인지 / 어떻게 고쳐야 하는지**에 대한 학습자 친화적 설명이 부족함
  2. **한국형 웹 접근성 지침(KWCAG)** 세부 항목을 반영하지 않음 (국제 표준 WCAG 중심)
  3. 진단이 **일회성**이라 이력 관리나 비교가 어려움
- 본 프로젝트는 위 세 가지 공백을 메우는 데 초점을 둠

---

## 3. 핵심 가치 제안 (차별화 포인트)

1. **학습자 친화적 설명**: 이슈 발생 시나리오(예: 스크린리더 사용자가 겪는 문제) + 코드 Before/After 제공
2. **WCAG + KWCAG 통합 진단**: axe-core 기반 WCAG 검사에 KWCAG 커스텀 룰을 추가하여 국내 실무 기준까지 커버
3. **단계적 정보 노출(Progressive Disclosure)**: 심각도 기준으로 그루핑된 요약 카드 → 클릭 시 상세 가이드
4. **진단 이력 관리**: 폴더별 저장 + PDF 내보내기로 지속적인 접근성 관리 지원

---

## 4. 기능 명세

### Phase 1 (MVP)

- [ ] 회원가입/로그인 (Supabase Auth)
- [ ] 비로그인 접근 차단: 로그인하지 않은 상태에서는 URL 입력/진단 화면 자체에 접근 불가
- [ ] URL 입력 → 단일 페이지 진단 (Playwright로 렌더링 후 axe-core 실행)
- [ ] axe-core(WCAG) + 커스텀 KWCAG 룰 통합 진단
- [ ] 진단 결과 심각도별 그루핑 (치명 / 경고 / 권고)
- [ ] 요약 카드 UI
- [ ] 카드 클릭 시 상세 정보 노출 (위치/설명/수정 가이드)
- [ ] 진단이 길어질 경우 중단할 수 있는 버튼 기능
- [ ] **"저장하기" 버튼**: 클릭 시 폴더 선택 모달 노출 (기존 폴더 목록 + 새 폴더 만들기) → 선택 완료 시 DB 저장
- [ ] **기본 폴더 자동 생성**: 신규 가입 시(또는 첫 저장 시) "기본 폴더" 자동 생성
- [ ] RLS 정책: 사용자 본인 데이터만 접근 가능
- [ ] KWCAG 커스텀 룰 항목 선정 완료 (아래 섹션 참고)

### Phase 2

- [ ] 폴더 관리 고도화
  - [ ] 폴더 이름변경/삭제
  - [ ] 마이페이지에서 폴더별 진단 목록 조회
  - [ ] 저장된 진단을 다른 폴더로 재지정
- [ ] 진단 결과 PDF 내보내기

### Phase 3 (챌린지 요소)

- GitHub App 설치 → PR 생성 시 자동 접근성 진단 → PR 코멘트 등록 (Vercel Preview URL 기반)

---

## 5. 화면 구성 (User Flow)

```
[로그인 화면] → 로그인 완료
  └─ [메인 페이지]
       └─ URL 입력 → "진단하기" 클릭
            └─ [로딩 화면] 분석 중 표시
                 └─ [결과 페이지]
                      ├─ 종합 점수/등급
                      ├─ 심각도별 요약 카드
                      │    └─ 클릭 → 상세 이슈
                      └─ "저장하기" 버튼
                           └─ 폴더 선택 모달 (기존 폴더 / 새 폴더 생성)
                                └─ 저장 완료

[마이페이지] (Phase 2)
  ├─ 폴더 목록 (이름변경/삭제)
  └─ 폴더 클릭 → 진단 이력 목록
       └─ 개별 진단 클릭 → 상세 결과 + "PDF로 저장" 버튼(Phase 2)
```

와이어프레임/디자인은 Figma에서 구체화 예정

- v0 및 stitch를 활용하여 디자인 초안 작업

---

## 6. 데이터 모델 (초안)

```sql
-- 사용자 (Supabase Auth 기본 제공)
users (id, email, created_at, ...)

-- 폴더
folders (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  created_at timestamp default now()
)

-- 진단 결과
diagnoses (
  id uuid primary key,
  user_id uuid not null references users(id),
  folder_id uuid not null references folders(id),
  url text not null,
  score integer,
  result_json jsonb,
  created_at timestamp default now()
)
```

result_json 스키마 상세 설계 [추가로 정할 사항(category 개수, severity 단계)]

### result_json 스키마 예시

```json
{
  "meta": {
    "url": "https://example.com",
    "diagnosedAt": "2026-08-13T10:00:00Z",
    "engineVersion": "axe-core@4.x + kwcag-custom@1.0",
    "score": 72
  },
  "summary": {
    "total": 34,
    "bySeverity": {
      "critical": 3,
      "warning": 12,
      "recommendation": 19
    }
  },
  "issues": [
    {
      "id": "image-alt-001",
      "ruleId": "image-alt",
      "ruleType": "wcag",
      "category": "이미지",
      "severity": "critical",
      "title": "이미지 대체 텍스트 누락",
      "description": "시각장애 사용자는 스크린리더로 이 이미지를 인식할 수 없습니다...",
      "location": {
        "selector": "div.banner > img:nth-child(2)",
        "html": "<img src=\"banner.jpg\">",
        "occurrenceCount": 1
      },
      "fixGuide": {
        "before": "<img src=\"banner.jpg\">",
        "after": "<img src=\"banner.jpg\" alt=\"회원가입 50% 할인 배너\">"
      },
      "aiSuggestion": {
        "available": true,
        "suggestedAltText": null,
        "status": "not_requested"
      }
    }
  ]
}
```

### 필드별 설계 의도

**`meta`**

- 진단 자체에 대한 정보. `engineVersion`을 넣어둔 건, 나중에 axe-core나 KWCAG 룰이 업데이트됐을 때 "이 진단 결과가 어떤 버전 기준으로 나온 건지" 구분하기 위함이에요. 신경 안 쓰셔도 되고 나중에 필요 없으면 빼도 돼요.

**`summary`**

- 요약 카드 화면("치명적 3종류 · 총 12곳")에 바로 쓰이는 부분이에요. 매번 `issues` 배열을 순회해서 개수 세지 않아도, 이 필드만 읽으면 요약 카드를 바로 그릴 수 있어요.

**`issues[].id` vs `ruleId`**

- `id`: 이 진단에서 발생한 이슈 인스턴스 고유값 (같은 페이지에 alt 누락이 5번 있으면 5개의 다른 id)
- `ruleId`: 어떤 규칙을 위반했는지 (axe-core 룰 이름 그대로, 예: `image-alt`) → 같은 룰끼리 그루핑할 때 사용

**`ruleType`**

- `"wcag"` 또는 `"kwcag"`. 나중에 "국제 기준으로 볼래, 국내 기준으로 볼래" 필터/탭 기능 만들 때 이 필드로 구분해요.

**`location`**

- `selector`: 실제 페이지에서 그 요소를 다시 찾을 때 씀 (스크린샷 하이라이트 기능을 나중에 추가한다면 여기서 좌표를 계산할 수도 있어요)
- `occurrenceCount`: 같은 유형의 이슈가 페이지 내에서 몇 번 반복되는지. "23곳" 같은 표시에 씀

**`aiSuggestion`**

- Phase 2의 AI alt 추천 기능을 위해 미리 자리를 만들어둔 필드예요. `available`은 이 이슈가 AI 추천이 적용 가능한 종류인지(예: 색상 대비 이슈엔 필요 없음), `status`는 `not_requested` → `pending` → `completed` 흐름으로 관리하면, 사용자가 "AI로 추천받기" 버튼 눌렀을 때의 상태를 추적하기 편해요.

### 추가로 정할 사항

- `category` 값의 종류를 정확히 몇 개로 나눌지 (이미지/색상/구조/폼/키보드 정도가 axe-core 룰 기준으로 자연스러운데, KWCAG 항목이 정해지면 카테고리가 늘 수도 있어요)
- `severity` 3단계(critical/warning/recommendation)가 화면 그루핑 기준과 맞는지

### 등급 체계 (이슈 #5에서 확정)

| 점수 구간 | 등급      |
| --------- | --------- |
| 90점 이상 | 우수      |
| 70~89점   | 양호      |
| 50~69점   | 개선 필요 |
| 49점 이하 | 미흡      |

색상은 severity 토큰 재사용: 우수(success) / 양호(info) / 개선 필요(warning) / 미흡(critical)

---

## 7. 기술 스택

| 영역           | 선택                       | 비고                                     |
| -------------- | -------------------------- | ---------------------------------------- |
| 프론트엔드     | Next.js + TypeScript       |                                          |
| 스타일         | Tailwind CSS               |                                          |
| 접근성 분석    | axe-core + 커스텀 KWCAG 룰 |                                          |
| 렌더링/PDF     | Playwright                 | DOM 렌더링 + PDF 생성(`page.pdf()`) 겸용 |
| 백엔드/DB/Auth | Supabase                   | MCP로 연결하여 스키마 관리 연습          |
| 배포           | Vercel                     |                                          |
| 개발 도구      | Claude Code                |                                          |

---

## 8. 일정 (로드맵)

| 단계                 | 목표                              |
| -------------------- | --------------------------------- |
| 기획/디자인          | 기획문서 확정, Figma 와이어프레임 |
| MVP 개발             | Phase 1 기능 구현                 |
| Phase 2 개발         | 로그인/폴더/PDF 기능 구현         |
| 회고/포트폴리오 정리 | KPT 회고 작성                     |

---

## 9. 리스크 및 오픈 이슈

- KWCAG 자동화 가능 항목 리서치 필요 (색상 대비처럼 기계적 판단 가능한 것 vs 사람 판단 필요한 것 구분)
- axe-core 커스텀 룰 작성 방식 학습 필요
- Playwright 렌더링 시간이 길어질 경우 UX 처리 방안 (로딩 상태 디자인)
  - lottie 이용해서 애니메이션 만들어보기 or canvas 사용해서 애니메이션 만들어보기
  - 중간에 작업을 멈출 수 있는 버튼 만들기
- [ ] 배포 전 Confirm email 다시 켜기 + 커스텀 SMTP 설정 필요
      (기본 SMTP는 시간당 2건 제한 + 팀 멤버 이메일만 발송 가능)

---

## 10. 참고 자료

- axe-core: https://github.com/dequelabs/axe-core
- KWCAG 2.2 (국가표준): https://a11ykr.github.io/kwcag22/

## 11. KWCAG 커스텀 룰 명세 (이슈 #7)

KWCAG 2.2 원문 33개 검사항목을 axe-core(105개 룰, WCAG 태그 73개) 대조 후, "axe-core가 커버하지 않으면서 자동 판별 가능한" 4개 항목을 선정함.

선정 기준
axe-core의 73개 WCAG 태그 룰과 중복되지 않을 것
사람의 주관적 판단(의미 이해, 시각 예술적 판단) 없이 코드/DOM/CSS로 기계적 판별 가능할 것
단일 페이지 정적 분석(+ Playwright 상호작용) 범위 내에서 검증 가능할 것
제외된 항목 중 짚어둘 것
6.4.1 반복 영역 건너뛰기(skip link): axe-core의 bypass 룰이 이미 WCAG 2.4.1을 커버하므로 제외
5.2.1 자막 제공: <track> 존재 여부만 확인 가능하나, 자막 내용의 정확성은 검증 불가 — "자막 있음 = 통과"라는 잘못된 안심을 줄 위험이 있어 제외
항목 ① — 초점 인디케이터 제거 감지
항목명: 포커스 인디케이터 제거 감지
KWCAG 조항: 6.1.2 (초점 이동과 표시)
대응 WCAG: 2.4.7 (Focus Visible)
axe-core 미커버 이유: focus-order-semantics 룰은 포커스 가능 요소의 마크업
유효성만 검사하고, outline: none으로 시각적 표시가 제거됐는지는 검사하지 않음

자동화 방식:

- 포커스 가능 요소(a, button, input, select, textarea, [tabindex]) 순회
- Playwright로 각 요소에 focus() 호출
- getComputedStyle로 포커스 전/후 outline, box-shadow, border 비교

통과 조건: 포커스 시 outline 또는 box-shadow/border 등 대체 시각 표시가
포커스 전과 다르게 나타남
실패 조건: 포커스 전후 스타일 변화 없음 (outline: none만 있고 대체 표시 없음)
항목 ② — 자동 재생 소리 정지 수단 확인
항목명: 자동 재생 소리 정지 수단 확인
KWCAG 조항: 5.4.2 (자동 재생 금지)
대응 WCAG: 1.4.2 (Audio Control)
axe-core 미커버 이유: 재생 시간 경과 판단이 필요한 룰이라 axe-core 기본
룰셋에 없음

자동화 방식:

- <audio>, <video> 요소 중 autoplay 속성 존재 + muted 속성 없음인 것 탐지
- 해당 요소에 controls 속성 존재 여부 확인

통과 조건: autoplay 요소가 없거나, 있다면 muted이거나 controls 속성 존재
실패 조건: autoplay + 소리 있음(muted 아님) + controls 없음
항목 ③ — 자동 갱신/스크롤 콘텐츠 정지 수단 확인
항목명: 자동 갱신/스크롤 콘텐츠 정지 수단 확인
KWCAG 조항: 6.2.2 (정지 기능 제공)
대응 WCAG: 2.2.2 (Pause, Stop, Hide)
axe-core 미커버 이유: 레거시 태그·무한 반복 애니메이션에 대한 정지 수단
검사가 axe-core 기본 룰에 없음

자동화 방식:

- <marquee>, <blink> 태그 존재 여부
- CSS animation-iteration-count: infinite 적용 요소 탐지 (getComputedStyle)
- 위 요소 근처에 정지/일시정지 버튼(aria-label에 "정지"/"일시정지"/"pause"
  포함하는 button) 존재 여부 확인

통과 조건: 무한 반복 애니메이션/marquee가 없거나, 있다면 정지 컨트롤 존재
실패 조건: 무한 반복 애니메이션/marquee 존재 + 정지 컨트롤 없음
항목 ④ — 초점/입력만으로 자동 실행되는 기능 감지 (휴리스틱, 신뢰도 낮음)
항목명: 초점/입력만으로 자동 실행되는 기능 감지
KWCAG 조항: 7.2.1 (사용자 요구에 따른 실행)
대응 WCAG: 3.2.1 (On Focus), 3.2.2 (On Input)
axe-core 미커버 이유: 이벤트 핸들러의 의미(자동 제출/이동 여부) 판단이
필요한 룰이라 axe-core 기본 룰셋에 없음

⚠️ 한계: 인라인 이벤트 핸들러(onchange, onfocus 속성)만 탐지 가능.
별도 JS 파일에서 addEventListener로 등록된 핸들러는 탐지 불가.
false negative가 있을 수 있는 휴리스틱 룰로 간주할 것.

자동화 방식:

- select, input[type=radio], input[type=checkbox]의 onchange 속성 내
  submit(), location.href, window.open 패턴 문자열 탐지
- 폼 요소의 onfocus 속성 내 동일 패턴 탐지

통과 조건: 위 패턴이 없거나, 있어도 별도 확인 버튼이 함께 존재
실패 조건: onchange/onfocus만으로 페이지 이동/제출이 발생하는 코드 존재
### 구현 확정 사항 (이슈 #7에서 결정)

**구현 방식: axe.configure 커스텀 룰이 아니라 "axe 실행 후 별도 후처리 패스"**

axe의 룰 모델은 단일 패스·DOM 읽기 전용을 전제하는데, 이 4개 룰은 그 밖을 요구한다 —
룰 ①은 `focus()`로 DOM 상태를 바꾸고 트랜지션 진행 여부(시간 축)를 봐야 하며, 룰 ③은
`prefers-reduced-motion`을 에뮬레이션한 뒤 재측정해야 한다(Playwright 레벨 API).
특히 axe 평가 도중 수백 개 요소를 포커스하면 대상 사이트의 focus 핸들러가 DOM을 바꿔
이후 axe 룰(실제 렌더 색을 읽는 `color-contrast` 등)의 결과를 오염시킨다.

구현 위치: `src/lib/diagnosis/engine/kwcag/` (probe / rules / index),
`engine/run.ts`가 axe 뒤에 **선택 단계**로 호출하고 `engine/map.ts`가 정렬 전에 합류시킨다.
예산이 부족하면 KWCAG 패스는 통째로 스킵되며, 그 사실은 `meta.engineVersion`의
`kwcag@1.0(skipped)` 표기로 남는다 — "검사 못 했음"이 "위반 0건"과 똑같이 보이면 안 되기 때문.

**ruleId · severity · category (확정)**

| 항목 | ruleId | severity | category |
| --- | --- | --- | --- |
| ① 포커스 인디케이터 | `kwcag-focus-visible` | 치명 | 키보드 |
| ② 자동 재생 소리 | `kwcag-autoplay-audio-control` | 치명 | 멀티미디어 |
| ③ 정지 기능 | `kwcag-pause-stop-hide` | 경고 | 구조 |
| ④ 자동 실행 | `kwcag-no-auto-execution` | 경고 | 폼 |

- ruleId는 `kwcag-` 접두사 규약을 따른다 (이슈 #6의 `toRuleType()`이 이 접두사로 판별).
- ③④를 경고로 둔 이유: 점수 산식상 치명 1건이면 69점 상한이라 등급이 즉시 두 단계 떨어진다.
  ③은 로딩 스피너 오탐, ④는 인라인 핸들러만 보는 휴리스틱이라 오탐 비용이 비대칭이다.
- ③의 category는 신규 "타이밍"을 만들지 않고 기존 "구조"를 재사용한다 — 룰 하나 때문에
  카테고리를 늘리면 대다수 페이지에서 항목이 0건인 필터가 생긴다.
- ④는 description 마지막에 탐지 범위 한계를 한 문장 명시한다("이벤트 속성과 프로퍼티만 확인").
  가장 위험한 오해가 "검출 0건 = 준수"이기 때문이다.
- category 어휘는 실제로 **9종 + 폴백 "기타"** 다(위 본문의 "13종"은 오기).
  단일 소스는 `engine/rules.ts`의 `ISSUE_CATEGORY`.
