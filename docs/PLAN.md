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
- [ ] KWCAG 커스텀 룰 항목 선정 `[TODO]`

```jsx
  // ** 예시 **

  항목명: 반복 영역 건너뛰기 링크
  KWCAG 조항: [원문 대조 후 조항 번호 기입]
  자동화 방식:
    - 페이지 최상단에 "본문 바로가기" 류의 skip link가 있는지 검사
    - 조건: 첫 포커스 가능 요소가 href="#main" 또는 유사 패턴을 가진 앵커인지
    - 통과 조건: skip link 존재 + 대상 요소가 실제로 DOM에 존재
    - 실패 조건: skip link 없음, 또는 있어도 target이 존재하지 않음
```

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

---

## 10. 참고 자료

- axe-core: https://github.com/dequelabs/axe-core
- KWCAG 2.2 (국가표준): https://a11ykr.github.io/kwcag22/
