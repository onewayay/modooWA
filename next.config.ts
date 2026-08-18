import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // playwright / playwright-core는 Next 기본 external 목록에 이미 들어 있지만
  // axe-core 계열은 없어서 직접 지정한다 — axe-core는 브라우저에 주입할 UMD 소스(약 1.3MB)를
  // 문자열 필드(axe.source)로 들고 있어, 번들러가 건드리면 용량만 늘고 주입 소스가 깨진다.
  serverExternalPackages: ["@axe-core/playwright", "axe-core"],
};

export default nextConfig;
