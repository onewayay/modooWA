import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // probe.ts는 page.evaluate로 브라우저에 **문자열 직렬화되어** 전달된다.
  // import한 식별자를 본문에서 참조하면 tsc도 next build도 통과하고 브라우저에서만
  // ReferenceError가 난다. 이 저장소에 테스트 러너가 없는 상황에서 lint가 실제로 잡아 줄 수 있는
  // 몇 안 되는 실수 유형이라 룰로 못 박는다.
  {
    files: ["src/lib/diagnosis/engine/kwcag/probe.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration",
          message:
            "probe.ts는 page.evaluate로 직렬화된다. import한 식별자는 브라우저에서 ReferenceError가 난다 — 값은 evaluate 인자로 넘기고 헬퍼는 함수 본문 안에 중첩할 것.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
