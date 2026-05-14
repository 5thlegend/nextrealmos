// GET /api/aura/og/[token].svg (or no extension) — open-graph image for share cards
//
// Renders a 1200×630 cinematic SVG: massive Cormorant score, magma gradient
// halo on high scores, gold halo on 70+, vibe + URL host + Next Realm
// wordmark. Served as image/svg+xml — modern social platforms render SVG
// natively in their previews; the result is crisper than any rasterized PNG
// at half the bytes.

import { getAuraScanByToken } from "@/services/aura-service";

export const runtime = "edge";

const W = 1200, H = 630;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Strip optional .svg extension on the token
  const cleanToken = token.replace(/\.svg$/i, "");
  const scan = await getAuraScanByToken(cleanToken);

  if (!scan) {
    return svgResponse(notFoundSvg());
  }

  const score = scan.aura_score ?? 0;
  const host = (() => { try { return new URL(scan.url).host; } catch { return scan.url.slice(0, 64); } })();
  const vibe = scan.vibe ?? "Calibrated.";
  const tier = scoreTier(score);
  const accent = score >= 70 ? "#D6A756" : "#FF5A36";

  return svgResponse(scoreSvg({ score, host, vibe, tier, accent }));
}

function svgResponse(body: string) {
  return new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // 1 hour CDN cache; share images don't need to revalidate often
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  }[c] as string));
}

function scoreSvg(opts: { score: number; host: string; vibe: string; tier: string; accent: string }): string {
  const { score, host, vibe, tier, accent } = opts;
  const safeHost = escapeXml(host);
  const safeVibe = escapeXml(vibe.length > 90 ? vibe.slice(0, 89) + "…" : vibe);
  const safeTier = escapeXml(tier);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="halo" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="${accent}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#0F1014"/>
      <stop offset="100%" stop-color="#0A0A0B"/>
    </radialGradient>
    <linearGradient id="rule" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- Subtle grid texture -->
  <g opacity="0.04">
    ${gridLines()}
  </g>
  <!-- Score halo -->
  <ellipse cx="${W/2}" cy="${H/2 - 30}" rx="520" ry="320" fill="url(#halo)"/>

  <!-- Wordmark top-left -->
  <g transform="translate(60, 60)">
    <rect x="0" y="0" width="44" height="44" fill="none" stroke="${accent}" stroke-width="2" opacity="0.7"/>
    <text x="22" y="29" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, monospace" font-size="14" font-weight="700" fill="${accent}">NR</text>
    <text x="60" y="28" font-family="ui-monospace, SFMono-Regular, monospace" font-size="13" letter-spacing="6" fill="#F5F5F2">NEXT REALM · AURA</text>
  </g>

  <!-- Tier label, top-right -->
  <text x="${W - 60}" y="86" text-anchor="end"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="13" letter-spacing="4"
        fill="${accent}">— ${safeTier.toUpperCase()}</text>

  <!-- Massive score -->
  <text x="${W/2}" y="${H/2 + 30}" text-anchor="middle"
        font-family="'Cormorant Garamond', 'Times New Roman', serif"
        font-size="380" font-weight="500"
        fill="#F5F5F2"
        style="letter-spacing:-0.02em">${score}</text>

  <!-- Hairline rule -->
  <rect x="${W/2 - 200}" y="${H/2 + 60}" width="400" height="2" fill="url(#rule)"/>

  <!-- Vibe -->
  <text x="${W/2}" y="${H/2 + 110}" text-anchor="middle"
        font-family="'Cormorant Garamond', 'Times New Roman', serif"
        font-size="36" font-style="italic"
        fill="#F5F5F2" opacity="0.92">${safeVibe}</text>

  <!-- URL host -->
  <text x="${W/2}" y="${H - 80}" text-anchor="middle"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="22" letter-spacing="3"
        fill="#8E9196">${safeHost}</text>

  <!-- Footer mark -->
  <text x="60" y="${H - 40}"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" letter-spacing="3"
        fill="#5A5A64">// scan your aura at</text>
  <text x="${W - 60}" y="${H - 40}" text-anchor="end"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" letter-spacing="3"
        fill="${accent}">NEXTREALMOS.PAGES.DEV/AURA</text>
</svg>`;
}

function gridLines(): string {
  let lines = "";
  for (let x = 0; x < W; x += 40) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#FFFFFF" stroke-width="1"/>`;
  for (let y = 0; y < H; y += 40) lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#FFFFFF" stroke-width="1"/>`;
  return lines;
}

function notFoundSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0A0A0B"/>
    <text x="${W/2}" y="${H/2 - 10}" text-anchor="middle"
          font-family="'Cormorant Garamond', serif" font-size="80" fill="#F5F5F2">Aura unavailable.</text>
    <text x="${W/2}" y="${H/2 + 50}" text-anchor="middle"
          font-family="ui-monospace, monospace" font-size="14" fill="#8E9196" letter-spacing="3">SCAN AT NEXTREALMOS.PAGES.DEV/AURA</text>
  </svg>`;
}

function scoreTier(s: number): string {
  if (s >= 85) return "Sovereign";
  if (s >= 70) return "Architect";
  if (s >= 55) return "Operator";
  if (s >= 40) return "Initiate";
  return "Cold start";
}
