"use client";

import { useState } from "react";

/**
 * useActionState의 "지난 회차 결과"를 걸러 낸다.
 *
 * useActionState는 폼이 사라져도(모달을 닫아도, 인라인 편집을 접어도) 마지막 결과를 계속 들고 있다.
 * 그대로 두면 두 가지가 깨진다.
 *   - 실패 후 다시 열면 이전 에러가 그대로 떠 있다.
 *   - 성공 후 다시 열면 성공 처리(닫기 등)가 즉시 재실행되어 열리자마자 닫힌다.
 *
 * active(모달의 open, 편집 폼의 editing)가 켜지는 순간의 state를 "이미 본 것"으로 기억해 두고,
 * 그것과 같은 참조인 동안은 emptyState를 돌려준다. prop 변화에 맞춰 렌더 중에 상태를 조정하는
 * React 공식 패턴이라 추가 렌더 한 번으로 끝나고 effect가 필요 없다.
 *
 * emptyState는 참조가 안정적인 모듈 상수여야 한다(매 렌더 새 객체를 넘기면 소비 측 effect가 계속 돈다).
 */
export function useFreshActionState<T>(
  state: T,
  active: boolean,
  emptyState: T
): T {
  const [staleState, setStaleState] = useState(state);
  const [prevActive, setPrevActive] = useState(active);

  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setStaleState(state);
  }

  return state === staleState ? emptyState : state;
}
