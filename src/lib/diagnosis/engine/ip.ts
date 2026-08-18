/**
 * IP 주소 차단 대역 판정 — 순수 함수만 둔다.
 *
 * guard.ts에서 분리한 이유는 두 가지다.
 * 1) 이 로직이 SSRF 방어의 핵심이라 단독으로 검증할 수 있어야 한다.
 *    (import가 없으므로 `node --experimental-strip-types`로 그대로 실행해 볼 수 있다)
 * 2) 요청 인터셉트 경로에서 초당 수백 번 호출되므로 부수효과가 없어야 한다.
 */

/** 점 표기 IPv4를 4옥텟으로. 형식이 어긋나면 null. */
function parseIpv4(ip: string): number[] | null {
  const octets = ip.split(".");
  if (octets.length !== 4) return null;

  const parsed: number[] = [];
  for (const octet of octets) {
    // 앞자리 0 채움("010")이나 빈 문자열을 숫자 변환에 맡기지 않는다 — Number("010")은 10이라
    // 8진수 표기를 10진수로 오독하게 된다. 여기서는 순수한 10진수 표기만 받는다.
    if (!/^\d{1,3}$/.test(octet)) return null;
    const value = Number(octet);
    if (value > 255) return null;
    parsed.push(value);
  }
  return parsed;
}

/**
 * IPv4 차단 판정.
 * 통과 조건: 아래 어느 대역에도 속하지 않는 공인 주소.
 * 실패 조건: 아래 대역 중 하나에 속하거나, 형식이 IPv4가 아님.
 */
export function isBlockedIpv4(ip: string): boolean {
  const o = parseIpv4(ip);
  if (!o) return true;

  const [a, b, c] = o;
  if (a === 0) return true; // 0.0.0.0/8 — "this network"
  if (a === 10) return true; // 10.0.0.0/8 — 사설
  if (a === 127) return true; // 127.0.0.0/8 — 루프백
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 — 링크로컬(169.254.169.254 클라우드 메타데이터 포함)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 — 사설
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 — 사설
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 — CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 — IETF 프로토콜 할당
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 — 문서용
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 — 벤치마킹
  if (a >= 224) return true; // 224.0.0.0/4 멀티캐스트 + 240.0.0.0/4 예약 + 255.255.255.255
  return false;
}

/**
 * IPv6 문자열을 8개 hextet으로 확장한다. 파싱 불가면 null.
 * `::ffff:192.168.0.1`처럼 끝에 IPv4가 박힌 형태는 먼저 hextet 2개로 바꿔 통일한다.
 */
export function expandIpv6(input: string): number[] | null {
  let text = input;

  const embeddedV4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(text);
  if (embeddedV4) {
    const parts = parseIpv4(embeddedV4[1]);
    if (!parts) return null;
    const hi = ((parts[0] << 8) | parts[1]).toString(16);
    const lo = ((parts[2] << 8) | parts[3]).toString(16);
    text = `${text.slice(0, embeddedV4.index)}${hi}:${lo}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;

  const toGroups = (value: string) => (value === "" ? [] : value.split(":"));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];

  let groups: string[];
  if (halves.length === 2) {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const hextets: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    hextets.push(Number.parseInt(group, 16));
  }
  return hextets;
}

/** hextet 2개에 들어 있는 IPv4를 점 표기로 되돌린다. */
function hextetsToIpv4(high: number, low: number): string {
  return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join(".");
}

/**
 * IPv6 차단 판정.
 * 실패 조건: 미지정/루프백/ULA/링크로컬/멀티캐스트, 또는 내장 IPv4가 차단 대역인 전이 주소.
 * 파싱 실패도 차단으로 본다(fail-closed) — 판단할 수 없는 주소를 통과시키지 않는다.
 */
export function isBlockedIpv6(ip: string): boolean {
  // zone id(%eth0)와 대괄호를 제거한다.
  const plain = ip.replace(/^\[|\]$/g, "").split("%")[0];
  const h = expandIpv6(plain);
  if (!h) return true;

  if (h.every((x) => x === 0)) return true; // :: — 미지정
  if (h.slice(0, 7).every((x) => x === 0) && h[7] === 1) return true; // ::1 — 루프백
  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 — ULA(사설)
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 — 링크로컬
  if ((h[0] & 0xff00) === 0xff00) return true; // ff00::/8 — 멀티캐스트

  // 아래 3가지는 IPv6 안에 IPv4가 들어 있는 형태다. 내장 v4를 꺼내 v4 규칙으로 다시 본다 —
  // 안 그러면 ::ffff:127.0.0.1 로 루프백 차단을 우회할 수 있다.
  if (h.slice(0, 5).every((x) => x === 0) && h[5] === 0xffff) {
    return isBlockedIpv4(hextetsToIpv4(h[6], h[7])); // ::ffff:0:0/96 — v4-mapped
  }
  if (h[0] === 0x2002) {
    return isBlockedIpv4(hextetsToIpv4(h[1], h[2])); // 2002::/16 — 6to4
  }
  if (h[0] === 0x0064 && h[1] === 0xff9b) {
    return isBlockedIpv4(hextetsToIpv4(h[6], h[7])); // 64:ff9b::/96 — NAT64
  }

  return false;
}
