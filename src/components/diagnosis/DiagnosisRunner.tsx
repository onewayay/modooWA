"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/diagnosis/DiagnosisErrorState";
import {
  DIAGNOSE_ERROR_MESSAGE,
  type DiagnoseResponse,
} from "@/lib/diagnosis/api";

type DiagnosisRunnerProps = {
  /** 서버에서 이미 parseDiagnosisUrl로 검증·정규화된 URL */
  url: string;
};

type Phase = { status: "running" } | { status: "error"; message: string };

/**
 * 진단 실행 화면.
 * 픽셀이 아니라 실행 수명주기(fetch + AbortController)를 소유한다.
 * 성공하면 /result로 빠져나가므로, 이 화면에 남는 상태는 "실행 중"과 "실패" 둘뿐이다.
 */
export function DiagnosisRunner({ url }: DiagnosisRunnerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ status: "running" });
  const [elapsedMs, setElapsedMs] = useState(0);
  /** "다시 진단"이 이 값을 올려 실행 effect를 재실행시킨다. */
  const [attempt, setAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // 서버 작업을 지목해 취소하기 위한 실행 식별자.
  // useState 초기화 함수라 StrictMode 재실행에도 값이 유지된다.
  const [runId] = useState(() => crypto.randomUUID());

  // 진단 실행 수명주기
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    // 결과 화면으로 나가는 이동. replace이므로 뒤로 가기로 이 화면에 재진입해
    // 진단이 다시 시작되지 않는다 (중단 버튼과 같은 이유).
    const goToResult = () =>
      router.replace(`/result?url=${encodeURIComponent(url)}`);

    void (async () => {
      try {
        const response = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, runId }),
          signal: controller.signal,
        });

        // proxy가 비로그인 요청을 리다이렉트하면 fetch가 그걸 따라가 로그인 HTML을 200으로
        // 받아온다. 그대로 두면 "진단 성공"으로 오인하므로 여기서 걸러낸다.
        // (proxy도 /api/*에는 401 JSON을 주도록 고쳤다. 이건 2차 방어다.)
        const contentType = response.headers.get("content-type") ?? "";
        if (response.redirected || !contentType.includes("application/json")) {
          setPhase({
            status: "error",
            message: DIAGNOSE_ERROR_MESSAGE.unauthorized,
          });
          return;
        }

        const body = (await response.json()) as DiagnoseResponse;
        if (!response.ok || body.ok !== true) {
          setPhase({
            status: "error",
            message:
              body.ok === false
                ? body.message
                : DIAGNOSE_ERROR_MESSAGE.internal,
          });
          return;
        }

        goToResult();
      } catch (error) {
        // 중단은 실패가 아니다. 사용자가 이미 다른 화면으로 이동했거나 StrictMode 정리 중이다.
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPhase({ status: "error", message: DIAGNOSE_ERROR_MESSAGE.internal });
      }
    })();

    // StrictMode 이중 호출에 대비해 abort만 한다. 여기서 취소 비콘을 보내면
    // 정리될 때마다 서버 진단을 죽이게 된다 — 비콘은 사용자가 버튼을 눌렀을 때만 보낸다.
    return () => {
      controller.abort();
    };
  }, [router, url, runId, attempt]);

  // 경과 시간. 카운터를 증가시키지 않고 Date.now() 차이로 계산해
  // 백그라운드 탭 스로틀링이 걸려도 값이 어긋나지 않게 한다.
  useEffect(() => {
    if (phase.status !== "running") return;

    // 경과 시간 초기화는 "다시 진단" 클릭 핸들러에서 한다 — effect 본문에서 setState 하면
    // 렌더가 연쇄된다.
    const startedAt = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [phase.status, attempt]);

  function handleAbort() {
    abortRef.current?.abort();

    // 연결 종료(request.signal)에만 의존하지 않는다 — 프록시/HTTP2 환경에서는 전달이
    // 보장되지 않는다. keepalive로 보내 화면 전환 중에도 요청이 살아남게 한다.
    void fetch("/api/diagnose", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
      keepalive: true,
    }).catch(() => {});

    // 입력했던 주소를 메인 페이지에 되돌려준다.
    // replace이므로 뒤로 가기로 /diagnose에 재진입해 진단이 다시 시작되지 않는다.
    router.replace(`/?url=${encodeURIComponent(url)}`);
  }

  if (phase.status === "error") {
    return (
      <section className="flex flex-col gap-lg rounded border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex flex-col gap-xs">
          <span className="font-heading text-label-caps text-on-surface-variant">
            진단 대상
          </span>
          <p className="font-mono text-code-md break-all text-on-surface">
            {url}
          </p>
        </div>

        <ErrorAlert message={phase.message}>
          <Button
            type="button"
            onClick={() => {
              setElapsedMs(0);
              setPhase({ status: "running" });
              setAttempt((value) => value + 1);
            }}
          >
            다시 진단
          </Button>
        </ErrorAlert>
      </section>
    );
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
