---
name: modooWA
colors:
  surface: '#f7f9fb'
  surface-dim: '#d9d9e4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fd'
  surface-container: '#ededf8'
  surface-container-high: '#e7e7f2'
  surface-container-highest: '#e2e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#434654'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#f0f0fb'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#1b55d0'
  primary: '#003594'
  on-primary: '#ffffff'
  primary-container: '#004ac6'
  on-primary-container: '#b8c8ff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#d7dff9'
  on-secondary-container: '#5a6278'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c2e02'
  on-tertiary-container: '#ffb9a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fc'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3e465b'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#842500'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e2e2ec'
  navy-deep: '#0f172a'
  critical: '#dc2626'
  warning: '#d97706'
  success: '#059669'
  info: '#0891b2'
typography:
  display-lg:
    fontFamily: Montserrat, Pretendard
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Montserrat, Pretendard
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Montserrat, Pretendard
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Montserrat, Pretendard
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## 브랜드 및 스타일

브랜드 페르소나는 권위 있고, 냉철하며, 사용자에게 확신을 주는 성격을 가집니다. 개발자와 컴플라이언스 담당자를 위한 정밀 도구로서, 명확성을 유지하면서도 높은 정보 밀도를 제공하는 UI를 지향합니다.

이 디자인 시스템은 **기업용 모던(Corporate / Modern)** 스타일과 **고대비(High-Contrast)** 실용주의를 결합했습니다. 엄격한 구조적 그리드와 명확한 시각적 위계를 통해 진단 데이터를 쉽게 소화할 수 있도록 설계되었습니다. 장식적인 그라데이션이나 그림자보다는 화이트 스페이스와 견고한 보더(Border)를 사용하여 콘텐츠 자체를 돋보이게 하는 "언디자인(Un-designed)" 미학을 추구합니다. 이는 도구 자체가 측정 대상인 접근성 표준의 벤치마크 역할을 수행하도록 하기 위함입니다.

## 색상 (Colors)

텍스트 명도 대비에 관한 WCAG AAA 등급을 초과 달성할 수 있도록 고안된 고대비 팔레트를 사용합니다.

- **프라이머리 블루 (#004ac6):** 주요 액션 및 활성 상태에 사용됩니다.
- **딥 네이비 (#0F172A):** 글로벌 헤더, 네비게이션 사이드바, 주요 헤드라인에 사용되어 전문적이고 안정적인 중심을 잡아줍니다.
- **시맨틱 팔레트 (Semantic Palette):** 진단 결과의 심각도를 엄격하게 구분합니다.
  - **치명 (#DC2626):** 우선순위가 높은 접근성 위반 사항.
  - **경고 (#D97706):** 중간 우선순위 또는 수동 확인이 필요한 사항.
  - **권고 (#0891b2):** 감사 통과 및 낮은 우선순위의 개선 권장 사항.
- **서피스 팔레트 (Surface Palette):** 시각적 노이즈를 최소화하면서 콘텐츠 영역을 구분하기 위해 쿨 그레이(Slate) 계열을 활용합니다.

## 타이포그래피

국문 텍스트에는 **Pretendard**를, 영문 및 숫자에는 **Montserrat**를 우선 적용하여 가독성과 현대적인 인상을 동시에 확보합니다. 코드 스니펫, DOM 경로 검사, 기술 메타데이터에는 **JetBrains Mono**를 사용합니다.

- **스케일:** 모듈러 스케일을 적용하여 작은 사이즈(body-sm)에서도 충분한 x-height를 확보함으로써 판독성을 높였습니다.
- **헤딩:** 명확한 정보 위계 형성을 위해 딥 네이비(#0F172A) 색상을 적용합니다.
- **링크:** 본문 내 링크는 색맹 사용자의 식별을 돕기 위해 반드시 밑줄(underline)을 표시해야 합니다.
- **대비 확인:** 유색 배경(예: 배지) 위에 배치되는 모든 텍스트는 AAA 등급 대비를 준수하는지 상시 확인해야 합니다.

## 레이아웃 및 간격

메인 대시보드는 진단 보고서의 일관성을 위해 **고정 그리드(Fixed Grid)** 모델을 따르며, 인스펙터 사이드 패널은 **유동 그리드(Fluid Grid)**를 채택합니다.

- **데스크탑:** 스크린샷의 풀 너비 구조를 따름 (사이드바 스펙은 이번 프로젝트에 적용하지 않음)
- **태블릿:** 8컬럼 그리드, 접이식 사이드바.
- **모바일:** 4컬럼 그리드, 전체 너비 카드 스택.
- **리듬:** 논리적인 수직 리듬을 위해 8px 선형 스케일(조밀한 컴포넌트의 경우 4px 단위)을 사용합니다. 데이터가 많은 감사 과정에서의 인지 부하를 줄이기 위해 카드의 패딩은 24px 이상으로 여유 있게 설정합니다.

## 고도 및 깊이 (Elevation & Depth)

시각적 혼란과 대비 문제를 방지하기 위해 복잡한 그림자 사용을 지양합니다. 깊이감은 **톤 레이어(Tonal Layers)**와 **저대비 외곽선(Low-Contrast Outlines)**을 통해 표현합니다.

- **Surface 0:** 메인 배경 (#F8FAFC).
- **Surface 1:** 주요 카드 및 컨테이너 (White #FFFFFF), Slate-200 1px 보더 적용.
- **Surface 2:** 활성 또는 호버 상태의 아이템, 프라이머리 컬러의 미세한 틴트(Tint) 사용.
- **초점 상태 (Focus States):** 고대비 포커스 링은 필수입니다. 모든 대화형 요소에는 2px 화이트 오프셋이 포함된 2px 직선 프라이머리 블루(#004ac6)를 적용합니다.
- **그림자:** 툴팁이나 드롭다운 메뉴와 같은 일시적인 오버레이에만 제한적으로 사용하며, 부드럽고 중립적인 그레이 확산광을 적용합니다 (0px 4px 12px rgba(15, 23, 42, 0.1)).

## 모양 (Shapes)

구조적이고 전문적인 인상을 유지하면서도 현대적인 느낌을 주기 위해 **소프트(Soft)** 쉐이프 언어를 사용합니다.

- **컴포넌트:** 표준 버튼, 입력 필드, 카드는 4px(0.25rem) 반경을 사용합니다.
- **배지:** 심각도 배지는 일반 버튼과 구분되도록 2px 반경을 적용합니다.
- **아이콘:** 타이포그래피의 구조적인 특성에 맞춰 선형의 2px 스트로크와 각진 끝(square caps)을 가진 아이콘을 사용합니다.

## 컴포넌트

### 버튼 (Buttons)

- **Primary:** 솔리드 #004ac6 배경에 화이트 텍스트. 터치 타겟 확보를 위해 최소 높이 44px 권장.
- **Secondary:** 화이트 배경에 #0F172A 보더 및 텍스트.
- **Ghost:** 보더 없음, 네이비 텍스트, 호버 시 Slate-100 배경.

### 심각도 배지 (Severity Badges)

- `label-caps`를 사용한 소문자 형태의 레이블.
- **치명:** 레드 배경 + 화이트 텍스트 + "!" 아이콘.
- **경고:** 앰버 배경 + 블랙 텍스트 + "△" 아이콘.
- **권고:** cyan/teal 배경 + 화이트 텍스트 + "–" 아이콘.

### 카드 (Cards)

- **확장형 카드:** 감사 결과 표시에 사용. 헤더에는 심각도 배지, 이슈 제목, "코드" 토글 포함. 본문에는 `code-md`를 적용한 HTML 스니펫과 조치 권고 사항 포함.

### 네비게이션 (Navigation)

- **폴더 네비게이션:** 사이트 전체 감사를 위한 수직 트리 스타일. 활성화된 페이지/섹션은 왼쪽 2px 블루 보더로 표시.

### 입력 필드 (Inputs)

- **양식:** 고대비 보더 (Slate-400). 레이블은 항상 가시적이어야 함 (플로팅 레이블 금지). 에러 상태는 색상 변화와 에러 아이콘을 동시에 제공하여 접근성 확보.

### 초점 표시기 (Focus Indicators)

- 모든 대화형 요소는 명확하고 높은 대비를 가진 `:focus-visible` 상태를 가져야 합니다. 브라우저 기본 포커스 스타일을 제거할 경우, 반드시 그보다 더 눈에 띄는 커스텀 스타일로 대체해야 합니다.

## 스크린샷 참고 시 예외사항

docs/design-reference/\*.jpg (v0 프로토타입)를 참고할 때, 아래 항목은
스크린샷이 아닌 이 문서(DESIGN.md) 기준을 따른다.

- 브랜드명: 스크린샷마다 "A11yScope"/"A11y Inspector"로 혼재되어 있음
  → "modooWA"로 통일
- 테마: 스크린샷은 대시보드 다크 / 로그인 라이트로 혼재되어 있음
  → 전체 라이트 테마로 통일 (본 문서 색상 팔레트 기준)
- 헤더의 숫자 배지("11 11" 등): 스크린샷에 있으나 기획에 없는 요소 → 제외
- 첫화면은 프로젝트 소개문구와 로그인 화면으로 하고, 로그인 이후에 진단 URL을 넣을 수 있도록 한다.
- 진단 결과는 스크린샷의 심각/경고/주의/통과 4단계가 아닌, 치명/경고/권고 3단계로 한다.
