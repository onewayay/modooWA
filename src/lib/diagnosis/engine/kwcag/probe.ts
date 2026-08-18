/**
 * KWCAG 커스텀 룰 프로브 — **대상 페이지 안에서** 실행되는 코드.
 *
 * ⚠ 이 파일의 `kwcagProbe`는 `page.evaluate(kwcagProbe, input)`으로 넘어간다. 즉 함수가
 * **문자열로 직렬화되어** 대상 브라우저에서 다시 파싱된다. 아래 제약을 어기면 서버에서는
 * 멀쩡히 컴파일되고 브라우저에서만 ReferenceError로 조용히 죽는다.
 *
 * 1. import 문 0개, 모듈 스코프 식별자 참조 0개. 헬퍼 함수는 전부 프로브 함수 본문 안에 중첩한다.
 *    (타입 선언은 컴파일 시 사라지므로 모듈 스코프에 있어도 안전하다 — 값만 위험하다.)
 * 2. tsconfig `target: ES2017`이라 **컴파일러가 모듈 스코프에 헬퍼를 만들어 내는 문법은 금지**다:
 *    객체 rest/spread(`__rest`/`__assign`), `for await`, async generator, 클래스 필드/`#private`,
 *    데코레이터. 안전한 것: `async/await`, `for...of`, 배열 spread, `?.`, `??`, 템플릿 리터럴,
 *    `Object.assign`.
 * 3. 인자는 정확히 1개(객체 하나). RegExp·함수·DOM 노드는 인자로도 반환값으로도 넘길 수 없다 →
 *    정규식은 **패턴 문자열**로 받아 브라우저 안에서 `new RegExp(source, "i")` 한다.
 * 4. 임계값·패턴·상한값을 여기서 정의하지 않는다. 전부 rules.ts가 단일 소스로 갖고 input으로
 *    넘긴다. 복제하면 두 파일이 조용히 어긋난다.
 * 5. 룰 4개는 **각각** try/catch로 감싼다. 대상 사이트가 `Array.prototype`을 확장하거나
 *    `getComputedStyle`을 후킹한 경우가 실재하므로, 한 룰이 죽어도 나머지 3개는 돌아야 한다.
 */

/** rules.ts가 만들어 넘기는 프로브 입력. 여기 있는 값은 전부 rules.ts가 단일 소스다. */
export type KwcagProbeInput = {
  /** null이면 4개 룰 전부, 배열이면 그 룰만 실행한다(③ reduced-motion 재측정용). */
  onlyRuleIds: string[] | null;
  ruleIds: {
    focusVisible: string;
    autoplayAudioControl: string;
    pauseStopHide: string;
    noAutoExecution: string;
  };
  /** 코드 스니펫 최대 길이 — engine/rules.ts의 MAX_SNIPPET_LENGTH를 그대로 받는다. */
  maxSnippetLength: number;

  /* ① 포커스 인디케이터 */
  focusableSelector: string;
  /** 스타일 서명 그룹 검사 상한. 전수 순회는 강제 스타일 재계산 폭발이라 금지. */
  focusGroupLimit: number;
  /** 대상/부모/형제에서 비교할 속성 목록(outline·box-shadow는 별도 정규화하므로 제외) */
  focusStyleProperties: string[];
  /** ::before / ::after에서 비교할 속성 목록 */
  focusPseudoProperties: string[];

  /* ② 자동 재생 */
  mediaSelector: string;
  mediaStopControlSelector: string;
  mediaStopControlPattern: string;

  /* ③ 정지 기능 */
  motionLegacySelector: string;
  motionStopControlSelector: string;
  motionStopControlPattern: string;
  /** 이 속성들만 움직이면 장식(스피너·펄스·셔머)으로 보고 제외한다. */
  motionSafeProperties: string[];
  /** 진행 표시/보조기술에서 숨긴 요소 — 제외 대상 */
  motionExcludedRoleSelector: string;
  /** 이 면적(px²) 미만이면 장식으로 보고 제외한다. */
  motionMinArea: number;
  /** class/id 이름 휴리스틱(마지막 수단) */
  motionDecorativeNamePattern: string;

  /* ④ 자동 실행 */
  autoExecChangeSelector: string;
  autoExecFocusSelector: string;
  /** 핸들러 본문에서 찾을 문자열(소문자 비교) */
  autoExecPatterns: string[];
  /** 같은 form 안에 있으면 "확인 버튼이 있다"고 보는 선택자 */
  autoExecConfirmSelector: string;
};

/** 룰 1개 = 결과 0~1개. 반복은 occurrenceCount로 접는다(map.ts의 집계 철학). */
export type KwcagProbeFinding = {
  ruleId: string;
  occurrenceCount: number;
  selector: string;
  html: string;
  /** fixGuide 분기용 부가 정보. ②는 "audio"|"video", ③은 "marquee"|"animation", ④는 "onchange"|"onfocus" */
  variant: string;
};

export type KwcagProbeResult = {
  findings: KwcagProbeFinding[];
  /** 예외로 죽었거나 판정 전제가 무너져 건너뛴 룰. 비어 있지 않으면 결과가 부분적이라는 뜻이다. */
  skipped: string[];
};

export function kwcagProbe(input: KwcagProbeInput): KwcagProbeResult {
  const findings: KwcagProbeFinding[] = [];
  const skipped: string[] = [];

  /* ---------------------------------------------------------------- */
  /* 공용 헬퍼 — 전부 본문 안에 중첩 (모듈 스코프 참조 금지)            */
  /* ---------------------------------------------------------------- */

  const isEnabled = (ruleId: string): boolean =>
    input.onlyRuleIds === null || input.onlyRuleIds.indexOf(ruleId) !== -1;

  /** engine/rules.ts의 truncateSnippet과 같은 동작. DOM 노드는 반환할 수 없으므로 여기서 자른다. */
  const truncate = (html: string): string => {
    const source = html.trim();
    if (source.length <= input.maxSnippetLength) return source;
    return source.slice(0, input.maxSnippetLength) + "…";
  };

  /**
   * CSS 선택자. `analyze()` 직후라 axe 소스는 페이지에 그대로 남아 있으므로 그 유틸을 먼저 쓴다.
   *
   * 다만 실측해 보면 대개 폴백으로 내려간다 — `axe.utils.getSelector`는 실행 중에만 유지되는
   * `axe._selectorData`를 요구하는데 finishRun()이 그것을 정리하고 나가기 때문에
   * "Expect axe._selectorData to be set up"으로 던진다. 그래서 폴백(tag + id + nth-child)이
   * 사실상의 기본 경로다. 내부 상태를 우리가 다시 세팅해 주는 방법도 있지만, 전체 DOM을 한 번
   * 더 훑어야 하고 axe 내부 구조에 결합된다 — 셀렉터 4개를 위해 치를 값이 아니다.
   */
  const selectorOf = (el: Element): string => {
    const view = window as unknown as {
      axe?: { utils?: { getSelector?: (node: Element) => string } };
    };
    const getSelector =
      view.axe && view.axe.utils ? view.axe.utils.getSelector : undefined;
    if (typeof getSelector === "function") {
      try {
        const selector = getSelector(el);
        if (typeof selector === "string" && selector.length > 0) return selector;
      } catch {
        // axe 내부 구조가 바뀐 경우 — 폴백으로 내려간다.
      }
    }

    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 5) {
      const parent: Element | null = node.parentElement;
      let part = node.tagName.toLowerCase();
      const id = node.getAttribute("id");
      if (id && /^[A-Za-z][\w-]*$/.test(id)) {
        parts.unshift(part + "#" + id);
        break;
      }
      if (parent) {
        const index = Array.prototype.indexOf.call(parent.children, node) + 1;
        part += ":nth-child(" + index + ")";
      }
      parts.unshift(part);
      node = parent;
      depth += 1;
    }
    return parts.join(" > ");
  };

  /** 버튼류에서 "정지 수단"으로 읽을 만한 텍스트를 모은다(aria-label / title / 본문 / value). */
  const controlText = (el: Element): string => {
    const label = el.getAttribute("aria-label") || "";
    const title = el.getAttribute("title") || "";
    const value = el.getAttribute("value") || "";
    const text = el.textContent || "";
    return (label + " " + title + " " + value + " " + text)
      .replace(/\s+/g, " ")
      .trim();
  };

  /** selector에 해당하는 컨트롤 중 pattern에 걸리는 것이 하나라도 있는지 */
  const hasStopControl = (selector: string, patternSource: string): boolean => {
    const pattern = new RegExp(patternSource, "i");
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const node of nodes) {
      if (pattern.test(controlText(node))) return true;
    }
    return false;
  };

  const addFinding = (
    ruleId: string,
    first: Element | null,
    occurrenceCount: number,
    variant: string
  ): void => {
    if (occurrenceCount <= 0) return;
    findings.push({
      ruleId: ruleId,
      occurrenceCount: occurrenceCount,
      selector: first ? selectorOf(first) : "",
      html: first ? truncate(first.outerHTML) : "",
      variant: variant,
    });
  };

  /* ---------------------------------------------------------------- */
  /* ① kwcag-focus-visible — 포커스 인디케이터 제거                     */
  /*                                                                    */
  /* 통과 조건: 포커스 전후로 대상/가상요소/부모/형제의 지정 속성 중                */
  /*   하나라도 값이 달라짐 — 또는 값이 같아도 진행 중인 애니메이션이 있음         */
  /*   (`transition: box-shadow .2s`는 focus() 직후 computed value가 아직          */
  /*    이전 값이라, 이 예외가 없으면 대량 오탐이 난다).                          */
  /* 실패 조건: 대상·가상요소·부모·형제 어디에도 변화가 없고, 진행 중인             */
  /*   애니메이션도 없음 (= outline: none만 있고 대체 표시가 없는 상태).           */
  /* 판정 제외: 포커스가 실제로 들어가지 않은 요소(disabled/hidden/포커스 트랩),     */
  /*   :focus-visible이 붙지 않은 요소(부트스트랩 실패 신호).                      */
  /* ---------------------------------------------------------------- */

  if (isEnabled(input.ruleIds.focusVisible)) {
    try {
      /** "rgba(0,0,0,0)" / "transparent"처럼 알파가 0이면 보이지 않는 색이다. */
      const isVisibleColor = (value: string): boolean => {
        const color = value.trim().toLowerCase();
        if (color === "" || color === "transparent") return false;
        const matched = /^rgba?\(([^)]+)\)$/.exec(color);
        if (!matched) return true;
        const channels = matched[1].split(/[\s,/]+/).filter((part) => part !== "");
        if (channels.length < 4) return true;
        return parseFloat(channels[3]) > 0;
      };

      /**
       * outline 유효성. 문자열 비교 금지 — `outline-color: transparent`로 링을 "지운"
       * 사이트는 값이 달라지므로 단순 비교로는 통과 처리되어 버린다.
       * 통과(=보이는 outline): style !== none AND (style === auto OR width > 0) AND 색 알파 > 0.
       * UA 기본 포커스 링은 `outline-style: auto`로 계산되므로 width 파싱 실패를 허용한다.
       */
      const outlineSignature = (style: CSSStyleDeclaration): string => {
        const outlineStyle = style.getPropertyValue("outline-style");
        const width = parseFloat(style.getPropertyValue("outline-width"));
        const color = style.getPropertyValue("outline-color");
        if (outlineStyle === "" || outlineStyle === "none") return "none";
        if (outlineStyle !== "auto" && !(width > 0)) return "none";
        if (!isVisibleColor(color)) return "none";
        return (
          outlineStyle +
          "|" +
          style.getPropertyValue("outline-width") +
          "|" +
          color +
          "|" +
          style.getPropertyValue("outline-offset")
        );
      };

      /**
       * box-shadow 분해. 다중 그림자는 콤마로 나뉘지만 `rgba(0,0,0,.5)` 안의 콤마와
       * 구분해야 하므로 **괄호 깊이를 세며** 분할한다.
       */
      const splitShadows = (value: string): string[] => {
        const parts: string[] = [];
        let depth = 0;
        let buffer = "";
        for (const char of value) {
          if (char === "(") depth += 1;
          if (char === ")") depth -= 1;
          if (char === "," && depth === 0) {
            parts.push(buffer);
            buffer = "";
            continue;
          }
          buffer += char;
        }
        if (buffer.trim() !== "") parts.push(buffer);
        return parts;
      };

      /**
       * 그림자 유효성. 무효인 것은 `none` / 길이값이 전부 0 / 완전 투명 뿐이다.
       * `inset`도 포커스 표시로 유효하므로 배제하지 않는다.
       */
      const isVisibleShadow = (shadow: string): boolean => {
        const source = shadow.trim();
        if (source === "" || source === "none") return false;

        const colorMatch = /rgba?\([^)]*\)/i.exec(source);
        if (colorMatch && !isVisibleColor(colorMatch[0])) return false;

        const lengths = source
          .replace(/rgba?\([^)]*\)/gi, " ")
          .match(/-?\d*\.?\d+/g);
        if (lengths && lengths.length > 0) {
          let allZero = true;
          for (const length of lengths) {
            if (parseFloat(length) !== 0) {
              allZero = false;
              break;
            }
          }
          if (allZero) return false;
        }
        return true;
      };

      const shadowSignature = (value: string): string => {
        const visible: string[] = [];
        for (const shadow of splitShadows(value)) {
          if (isVisibleShadow(shadow)) visible.push(shadow.trim());
        }
        return visible.length > 0 ? visible.join(",") : "none";
      };

      const styleSignature = (
        el: Element,
        pseudo: string | null,
        properties: string[]
      ): string => {
        let style: CSSStyleDeclaration | null = null;
        try {
          style = window.getComputedStyle(el, pseudo);
        } catch {
          return "";
        }
        if (!style) return "";

        const parts: string[] = [
          "outline=" + outlineSignature(style),
          "shadow=" + shadowSignature(style.getPropertyValue("box-shadow")),
        ];
        for (const property of properties) {
          parts.push(property + "=" + style.getPropertyValue(property));
        }
        return parts.join(";");
      };

      /**
       * 대상만 보면 오탐이 난다: 부모 `:focus-within` 래퍼, `input:focus + label`,
       * `li:has(a:focus)` 패턴이 실제로 흔하다. 그래서 부모 1~2단계 + 인접 형제까지 본다.
       */
      const snapshot = (el: Element): string => {
        const parts: string[] = [
          styleSignature(el, null, input.focusStyleProperties),
          styleSignature(el, "::before", input.focusPseudoProperties),
          styleSignature(el, "::after", input.focusPseudoProperties),
        ];
        const parent = el.parentElement;
        if (parent) {
          parts.push(styleSignature(parent, null, input.focusStyleProperties));
          parts.push(styleSignature(parent, "::before", input.focusPseudoProperties));
          parts.push(styleSignature(parent, "::after", input.focusPseudoProperties));
          const grandParent = parent.parentElement;
          if (grandParent) {
            parts.push(styleSignature(grandParent, null, input.focusStyleProperties));
          }
        }
        const previous = el.previousElementSibling;
        if (previous) {
          parts.push(styleSignature(previous, null, input.focusStyleProperties));
        }
        const next = el.nextElementSibling;
        if (next) {
          parts.push(styleSignature(next, null, input.focusStyleProperties));
        }
        return parts.join("§");
      };

      const animationCount = (el: Element | null, subtree: boolean): number => {
        if (!el) return 0;
        const animatable = el as Element & {
          getAnimations?: (options?: { subtree?: boolean }) => Animation[];
        };
        if (typeof animatable.getAnimations !== "function") return 0;
        try {
          return animatable.getAnimations({ subtree: subtree }).length;
        } catch {
          return 0;
        }
      };

      const hasRunningAnimation = (el: Element): boolean => {
        // 대상은 subtree까지(가상요소·아이콘), 부모/형제는 자기 자신만 본다.
        // 부모를 subtree로 보면 같은 부모 아래 로딩 스피너가 있을 때 전부 통과가 된다.
        if (animationCount(el, true) > 0) return true;
        if (animationCount(el.parentElement, false) > 0) return true;
        if (animationCount(el.previousElementSibling, false) > 0) return true;
        if (animationCount(el.nextElementSibling, false) > 0) return true;
        return false;
      };

      const isProbablyVisible = (el: Element): boolean => {
        const checkable = el as Element & {
          checkVisibility?: (options?: {
            checkOpacity?: boolean;
            checkVisibilityCSS?: boolean;
          }) => boolean;
        };
        if (typeof checkable.checkVisibility === "function") {
          try {
            return checkable.checkVisibility({
              checkOpacity: true,
              checkVisibilityCSS: true,
            });
          } catch {
            return true;
          }
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      };

      /*
       * 전수 순회 금지 — "스타일 서명 기반 대표 표본".
       * 요소당 getComputedStyle이 6~8회라 200개를 전수 검사하면 강제 스타일 재계산이
       * 1,500회를 넘어 예산을 혼자 다 쓴다. tagName + type + 정렬된 classList를 키로
       * 묶고 그룹당 1개만 검사하면, 이슈가 "이 버튼 컴포넌트 전체"라는 실제 의미도 갖는다.
       */
      const groupKeys: string[] = [];
      const groupIndex: { [key: string]: number } = {};
      const groups: { representative: Element; size: number; visible: boolean }[] = [];

      const focusables = Array.from(
        document.querySelectorAll(input.focusableSelector)
      );
      for (const el of focusables) {
        const classes = Array.prototype.slice
          .call(el.classList)
          .sort()
          .join(".");
        const key =
          el.tagName.toLowerCase() +
          "|" +
          (el.getAttribute("type") || "") +
          "|" +
          classes;

        const visible = isProbablyVisible(el);
        if (Object.prototype.hasOwnProperty.call(groupIndex, key)) {
          const group = groups[groupIndex[key]];
          group.size += 1;
          // 보이지 않는 요소는 focus()가 들어가지 않아 그룹 전체가 건너뛰어진다.
          // 대표는 "보이는 것"으로 승격시킨다.
          if (!group.visible && visible) {
            group.representative = el;
            group.visible = true;
          }
          continue;
        }
        groupIndex[key] = groups.length;
        groupKeys.push(key);
        groups.push({ representative: el, size: 1, visible: visible });
      }

      const originalActive = document.activeElement as HTMLElement | null;
      const originalScrollX = window.scrollX;
      const originalScrollY = window.scrollY;

      let checked = 0;
      let occurrenceCount = 0;
      let firstFailing: Element | null = null;
      let bootstrapFailed = false;

      for (const group of groups) {
        if (checked >= input.focusGroupLimit) break;

        const el = group.representative as HTMLElement;
        if (typeof el.focus !== "function") continue;

        /*
         * 스냅샷 전에 현재 포커스를 반드시 뺀다. 두 가지가 동시에 걸린다.
         *
         * 1) Tab 부트스트랩이 **첫 번째 포커스 가능 요소**를 이미 포커스한 상태다.
         *    그대로 두면 그 요소의 before가 이미 "포커스된 모습"이라 after와 같아져
         *    첫 요소가 항상 오탐으로 잡힌다.
         * 2) 직전에 검사한 요소의 포커스 스타일이 아직 남아 있다. 스냅샷은 부모와 인접
         *    형제까지 보므로(`:focus-within` 래퍼 때문에 필요하다), 직전 요소가 형제나
         *    부모 쪽이면 "이번 요소를 포커스했더니 옆 요소의 링이 사라진" 변화가 잡혀
         *    실패해야 할 요소가 통과로 새어 나간다.
         */
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          active !== document.body &&
          typeof active.blur === "function"
        ) {
          active.blur();
        }

        const before = snapshot(el);
        try {
          // preventScroll 필수. 없으면 요소마다 스크롤이 튀어 lazy-load가 발동하고,
          // 무한 스크롤 사이트에서는 검사 도중 DOM이 계속 자란다.
          el.focus({ preventScroll: true });
        } catch {
          continue;
        }
        // disabled / hidden / 포커스 트랩 — 판정 근거가 없으므로 건너뛴다.
        if (document.activeElement !== el) continue;

        checked += 1;

        let focusVisible = false;
        let matchesSupported = true;
        try {
          focusVisible = el.matches(":focus-visible");
        } catch {
          matchesSupported = false;
        }

        if (!matchesSupported || !focusVisible) {
          // 첫 대표 요소부터 :focus-visible이 안 붙으면 Tab 부트스트랩이 실패한 것이다.
          // 이 상태로 계속하면 모든 요소가 오탐이 되므로 룰 전체를 스킵한다 —
          // 부분적으로 잘못된 결과보다 결과가 없는 편이 낫다.
          if (checked === 1) {
            bootstrapFailed = true;
            break;
          }
          continue;
        }

        const after = snapshot(el);
        if (after !== before) continue; // 통과: 시각적 변화가 있다.
        if (hasRunningAnimation(el)) continue; // 통과: transition이 아직 진행 중이다.

        occurrenceCount += group.size;
        if (!firstFailing) firstFailing = el;
      }

      // 복원 — 대상 페이지 상태를 검사 전으로 되돌린다(뒤이어 도는 룰과 재측정에 영향을 준다).
      if (originalActive && typeof originalActive.focus === "function") {
        try {
          originalActive.focus({ preventScroll: true });
        } catch {
          // 무시: 복원 실패는 판정에 영향을 주지 않는다.
        }
      } else {
        const active = document.activeElement as HTMLElement | null;
        if (active && typeof active.blur === "function") active.blur();
      }
      window.scrollTo(originalScrollX, originalScrollY);

      if (bootstrapFailed) {
        skipped.push(input.ruleIds.focusVisible);
      } else {
        addFinding(
          input.ruleIds.focusVisible,
          firstFailing,
          occurrenceCount,
          "focus"
        );
      }
    } catch {
      skipped.push(input.ruleIds.focusVisible);
    }
  }

  /* ---------------------------------------------------------------- */
  /* ② kwcag-autoplay-audio-control — 자동 재생 소리 정지 수단          */
  /*                                                                    */
  /* 통과 조건: autoplay 요소가 없음 / muted / controls 있음 /            */
  /*   페이지에 정지·음소거 컨트롤로 볼 만한 버튼이 존재.                 */
  /* 실패 조건: autoplay && !muted && !controls 이고 정지 컨트롤도 없음.  */
  /*                                                                    */
  /* 속성이 아니라 프로퍼티(el.autoplay/muted/controls)를 읽는다 —        */
  /* JS로 `video.muted = true`를 설정한 경우를 getAttribute로는 못 잡는다.*/
  /* ---------------------------------------------------------------- */

  if (isEnabled(input.ruleIds.autoplayAudioControl)) {
    try {
      const media = Array.from(
        document.querySelectorAll(input.mediaSelector)
      ) as HTMLMediaElement[];

      const offenders: HTMLMediaElement[] = [];
      for (const el of media) {
        if (el.autoplay && !el.muted && !el.controls) offenders.push(el);
      }

      if (offenders.length > 0) {
        const controlled = hasStopControl(
          input.mediaStopControlSelector,
          input.mediaStopControlPattern
        );
        if (!controlled) {
          const first = offenders[0];
          addFinding(
            input.ruleIds.autoplayAudioControl,
            first,
            offenders.length,
            first.tagName.toLowerCase()
          );
        }
      }
    } catch {
      skipped.push(input.ruleIds.autoplayAudioControl);
    }
  }

  /* ---------------------------------------------------------------- */
  /* ③ kwcag-pause-stop-hide — 자동 갱신/스크롤 정지 수단                */
  /*                                                                    */
  /* 통과 조건: 필터를 통과한 무한 반복 애니메이션·marquee가 없음 /       */
  /*   있어도 정지 컨트롤이 존재 / reduced-motion에서 멈춤(index.ts 재측정).*/
  /* 실패 조건: 후보 존재 + 정지 컨트롤 없음 + reduced-motion에서도 계속.  */
  /*                                                                    */
  /* getComputedStyle 전수 순회 금지 — 5,000노드 페이지에서 5,000회 강제   */
  /* 재계산이라 그것만으로 예산을 다 쓴다. document.getAnimations()는      */
  /* O(실행 중인 애니메이션 수)이고 playState·iterations·target·keyframes를*/
  /* 그대로 준다.                                                        */
  /* ---------------------------------------------------------------- */

  if (isEnabled(input.ruleIds.pauseStopHide)) {
    try {
      const normalizeProperty = (name: string): string =>
        name.replace(/-/g, "").toLowerCase();

      // getKeyframes()가 항상 실어 보내는 타이밍 키 — 애니메이션 대상 속성이 아니다.
      const timingKeys = ["offset", "computedoffset", "easing", "composite"];
      const safeProperties = input.motionSafeProperties.map(normalizeProperty);

      /**
       * 필터 1(효과 가장 큼) — 애니메이션 속성.
       * transform/opacity/stroke-dashoffset/background-position/filter만 움직이면
       * 스피너·셔머·펄스다. left/top/margin이 변하거나 visibility가 토글되면 진짜 이동/점멸.
       * 키프레임을 못 읽으면(크로스 오리진 등) 후보로 남긴다 — 모르면 보고하는 쪽이 안전하다.
       */
      const isDecorativeMotion = (effect: AnimationEffect): boolean => {
        const keyframed = effect as AnimationEffect & {
          getKeyframes?: () => Record<string, unknown>[];
        };
        if (typeof keyframed.getKeyframes !== "function") return false;

        let frames: Record<string, unknown>[] = [];
        try {
          frames = keyframed.getKeyframes();
        } catch {
          return false;
        }

        const properties: string[] = [];
        for (const frame of frames) {
          for (const key of Object.keys(frame)) {
            const property = normalizeProperty(key);
            if (timingKeys.indexOf(property) !== -1) continue;
            if (properties.indexOf(property) === -1) properties.push(property);
          }
        }
        if (properties.length === 0) return false;

        for (const property of properties) {
          if (safeProperties.indexOf(property) === -1) return false;
        }
        return true;
      };

      /** 필터 3 — 크기/가시성. 48×48 미만은 장식으로 본다. */
      const isTooSmallOrHidden = (el: Element): boolean => {
        const rect = el.getBoundingClientRect();
        if (rect.width * rect.height < input.motionMinArea) return true;

        const checkable = el as Element & {
          checkVisibility?: (options?: {
            checkOpacity?: boolean;
            checkVisibilityCSS?: boolean;
          }) => boolean;
        };
        if (typeof checkable.checkVisibility === "function") {
          try {
            if (
              !checkable.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              })
            ) {
              return true;
            }
          } catch {
            return false;
          }
        }
        return false;
      };

      /** 필터 4(마지막 수단) — class/id 이름 휴리스틱. 대상과 부모까지만 본다. */
      const hasDecorativeName = (el: Element): boolean => {
        const pattern = new RegExp(input.motionDecorativeNamePattern, "i");
        let node: Element | null = el;
        let depth = 0;
        while (node && depth < 2) {
          const name =
            (node.getAttribute("class") || "") +
            " " +
            (node.getAttribute("id") || "");
          if (pattern.test(name)) return true;
          node = node.parentElement;
          depth += 1;
        }
        return false;
      };

      const candidates: Element[] = [];
      const pushCandidate = (el: Element): void => {
        if (candidates.indexOf(el) === -1) candidates.push(el);
      };

      // 레거시 태그는 필터 없이 무조건 후보다(오탐 0).
      const legacy = Array.from(
        document.querySelectorAll(input.motionLegacySelector)
      );
      for (const el of legacy) pushCandidate(el);
      const legacyCount = candidates.length;

      const animatableDocument = document as Document & {
        getAnimations?: () => Animation[];
      };
      const animations =
        typeof animatableDocument.getAnimations === "function"
          ? animatableDocument.getAnimations()
          : [];

      for (const animation of animations) {
        if (animation.playState !== "running") continue;

        const effect = animation.effect;
        if (!effect) continue;

        let iterations = 0;
        try {
          iterations = effect.getComputedTiming().iterations || 0;
        } catch {
          continue;
        }
        if (iterations !== Infinity) continue;

        const target = (effect as KeyframeEffect).target as Element | null;
        if (!target || target.nodeType !== 1) continue;

        if (isDecorativeMotion(effect)) continue; // 필터 1
        if (target.closest(input.motionExcludedRoleSelector)) continue; // 필터 2
        if (isTooSmallOrHidden(target)) continue; // 필터 3
        if (hasDecorativeName(target)) continue; // 필터 4

        pushCandidate(target);
      }

      if (candidates.length > 0) {
        const controlled = hasStopControl(
          input.motionStopControlSelector,
          input.motionStopControlPattern
        );
        if (!controlled) {
          addFinding(
            input.ruleIds.pauseStopHide,
            candidates[0],
            candidates.length,
            legacyCount > 0 ? "marquee" : "animation"
          );
        }
      }
    } catch {
      skipped.push(input.ruleIds.pauseStopHide);
    }
  }

  /* ---------------------------------------------------------------- */
  /* ④ kwcag-no-auto-execution — 초점/입력만으로 자동 실행               */
  /*                                                                    */
  /* 통과 조건: 핸들러에 이동·제출 패턴이 없음 / 있어도 같은 form 안에      */
  /*   제출·확인 버튼이 함께 존재.                                        */
  /* 실패 조건: onchange/onfocus만으로 페이지 이동·제출이 일어나는 코드가   */
  /*   있고 같은 form에 확인 버튼이 없음.                                 */
  /*                                                                    */
  /* getAttribute가 아니라 el.onchange 프로퍼티를 읽고 String()으로 본문을  */
  /* 얻는다. 인라인 속성은 브라우저가 래퍼 함수로 만들어 주므로 본문이       */
  /* 그대로 나오고, JS로 `el.onchange = function(){...}`를 할당한 경우까지   */
  /* 잡힌다(국내 레거시 사이트에서 매우 흔하다). addEventListener 등록분은   */
  /* 여전히 미탐 — description 마지막 문장으로 한계를 밝힌다.              */
  /* ---------------------------------------------------------------- */

  if (isEnabled(input.ruleIds.noAutoExecution)) {
    try {
      const handlerSource = (el: Element, property: string): string => {
        const handler = (el as unknown as Record<string, unknown>)[property];
        if (typeof handler !== "function") return "";
        try {
          return String(handler).toLowerCase();
        } catch {
          return "";
        }
      };

      const hasAutoExecPattern = (source: string): boolean => {
        if (source === "") return false;
        for (const pattern of input.autoExecPatterns) {
          if (source.indexOf(pattern.toLowerCase()) !== -1) return true;
        }
        return false;
      };

      /** 같은 form 안에 사용자가 직접 누르는 확인 버튼이 있으면 자동 실행이 아니다. */
      const hasConfirmButton = (el: Element): boolean => {
        const form = (el as HTMLInputElement).form;
        if (!form) return false;
        return form.querySelector(input.autoExecConfirmSelector) !== null;
      };

      const offenders: Element[] = [];
      let variant = "";

      const changeTargets = Array.from(
        document.querySelectorAll(input.autoExecChangeSelector)
      );
      for (const el of changeTargets) {
        if (!hasAutoExecPattern(handlerSource(el, "onchange"))) continue;
        if (hasConfirmButton(el)) continue;
        offenders.push(el);
        if (variant === "") variant = "onchange";
      }

      const focusTargets = Array.from(
        document.querySelectorAll(input.autoExecFocusSelector)
      );
      for (const el of focusTargets) {
        if (!hasAutoExecPattern(handlerSource(el, "onfocus"))) continue;
        if (hasConfirmButton(el)) continue;
        if (offenders.indexOf(el) !== -1) continue;
        offenders.push(el);
        if (variant === "") variant = "onfocus";
      }

      addFinding(
        input.ruleIds.noAutoExecution,
        offenders.length > 0 ? offenders[0] : null,
        offenders.length,
        variant
      );
    } catch {
      skipped.push(input.ruleIds.noAutoExecution);
    }
  }

  return { findings: findings, skipped: skipped };
}
