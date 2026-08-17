"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/** 진단 엔진이 붙기 전까지 화면 흐름만 확인하기 위한 자리표시자 지연 */
const PLACEHOLDER_DURATION_MS = 3000;

type DiagnosisRunnerProps = {
  /** 서버에서 이미 parseDiagnosisUrl로 검증·정규화된 URL */
  url: string;
};

/**
 * 진단 실행 화면.
 * 픽셀이 아니라 실행 수명주기(현재는 타이머, 이슈 #6에서는 fetch + AbortController)를 소유한다.
 * 진단이 끝나면 /result로 빠져나가므로 상태가 "실행 중" 하나뿐이다 —
 * 이슈 #6에서 진단 실패를 표시할 "error" 상태가 추가된다.
 */
export function DiagnosisRunner({ url }: DiagnosisRunnerProps) {
  const router = useRouter();
  const [elapsedMs, setElapsedMs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // 진단 실행 수명주기 — 이슈 #6은 이 useEffect 본문만 교체하면 된다.
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    // 결과 화면으로 나가는 이동. replace이므로 뒤로 가기로 이 화면에 재진입해
    // 진단이 다시 시작되지 않는다 (중단 버튼과 같은 이유).
    const goToResult = () =>
      router.replace(`/result?url=${encodeURIComponent(url)}`);

    // TODO(#6): 아래 setTimeout을 실제 요청으로 교체한다.
    //   fetch("/api/diagnose", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ url }),
    //     signal: controller.signal,
    //   })
    //     .then(goToResult)
    //     .catch((e) => { if (e.name !== "AbortError") setPhase("error"); });
    const timer = setTimeout(goToResult, PLACEHOLDER_DURATION_MS);

    // StrictMode 이중 호출에 대비해 타이머를 먼저 정리한 뒤 abort 한다.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [router, url]);

  // 경과 시간. 카운터를 증가시키지 않고 Date.now() 차이로 계산해
  // 백그라운드 탭 스로틀링이 걸려도 값이 어긋나지 않게 한다.
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, []);

  function handleAbort() {
    abortRef.current?.abort();
    // 입력했던 주소를 메인 페이지에 되돌려준다.
    // replace이므로 뒤로 가기로 /diagnose에 재진입해 진단이 다시 시작되지 않는다.
    router.replace(`/?url=${encodeURIComponent(url)}`);
  }

  return (
    <section
      aria-busy={true}
      className="flex flex-col gap-lg rounded border border-outline-variant bg-surface-container-lowest p-lg"
    >
      <div className="flex flex-col gap-xs">
        <span className="font-heading text-label-caps text-on-surface-variant">
          진단 대상
        </span>
        {/* 링크로 만들지 않는다 — 감사 대상 사이트로 나가는 링크를 여기서 제공할 이유가 없다. */}
        <p className="font-mono text-code-md break-all text-on-surface">{url}</p>
      </div>

      <ScanIndicator />

      <div className="flex flex-col gap-xs">
        {/* role="status" = aria-live="polite". */}
        <p role="status" className="font-sans text-body-md text-on-surface">
          페이지를 분석하는 중입니다. 잠시만 기다려 주세요.
        </p>
        {/* 경과 시간은 라이브 영역 밖에 둔다 — 1초마다 낭독되면 소음이 된다.
            aria-hidden으로 숨기지도 않는다. 필요하면 사용자가 직접 탐색할 수 있어야 한다. */}
        <p className="font-mono text-code-md text-on-surface-variant">
          경과 {formatElapsed(elapsedMs)}
        </p>
      </div>

      <Button variant="secondary" type="button" onClick={handleAbort}>
        진단 중단
      </Button>
    </section>
  );
}

/**
 * 불확정 진행 표시기.
 * aria-valuenow를 생략하는 것이 ARIA 스펙이 정의한 "불확정" 상태 표현이므로
 * aria-valuemin/max도 넣지 않는다.
 */
function ScanIndicator() {
  return (
    <div
      role="progressbar"
      aria-label="진단 진행 상태"
      className="h-1 w-full overflow-hidden rounded-sm bg-surface-container-high"
    >
      {/* 감소 모션 설정에서는 애니메이션 대신 꽉 찬 정적 바가 된다 —
          25% 조각이 멈춰 있으면 "진행률 25%에서 멈춤"으로 오해되기 때문. */}
      <div className="h-full w-1/4 bg-primary-container motion-safe:animate-scan motion-reduce:w-full" />
    </div>
  );
}

/** 밀리초 → mm:ss */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
