// GET /api/og/nr?surface=os|forge|aura|ecosystem|civilization
//   Cinematic 1200×630 SVG share card for the public Next Realm surfaces.
//   One file, one design system, varied per surface — so every page on the
//   ecosystem shares with the same premium aesthetic.

export const runtime = "edge";

const W = 1200, H = 630;

type Surface = "os" | "forge" | "aura" | "ecosystem" | "civilization";

const SURFACES: Record<Surface, { title: string; tag: string; tier: string; accent: string }> = {
  os: {
    title:  "Cinematic operator infrastructure for the next civilization.",
    tag:    "OS · INTERNAL COMMAND",
    tier:   "kernel",
    accent: "#FF5A36",
  },
  forge: {
    title:  "We ship the infrastructure your competitors can't.",
    tag:    "FORGE · PUBLIC GATEWAY",
    tier:   "shipping",
    accent: "#FF5A36",
  },
  aura: {
    title:  "What is your aura losing you?",
    tag:    "AURA · ACQUISITION",
    tier:   "scanner",
    accent: "#D6A756",
  },
  ecosystem: {
    title:  "One ecosystem. One narrative. One signal.",
    tag:    "ECOSYSTEM · MAP",
    tier:   "civilization",
    accent: "#FF5A36",
  },
  civilization: {
    title:  "The federation, live.",
    tag:    "CIVILIZATION · PUBLIC",
    tier:   "federation",
    accent: "#D6A756",
  },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const surface = (url.searchParams.get("surface") || "os") as Surface;
  const cfg = SURFACES[surface] ?? SURFACES.os;

  return new Response(renderSvg(cfg), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&apos;" }[c] as string));
}

function renderSvg(cfg: { title: string; tag: string; tier: string; accent: string }): string {
  const title = escapeXml(cfg.title);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="halo" cx="20%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${cfg.accent}" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="${cfg.accent}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${cfg.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg" cx="60%" cy="60%" r="80%">
      <stop offset="0%" stop-color="#0F1014"/>
      <stop offset="100%" stop-color="#0A0A0B"/>
    </radialGradient>
    <linearGradient id="rule" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${cfg.accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${cfg.accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${cfg.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g opacity="0.04">${gridLines()}</g>
  <ellipse cx="200" cy="260" rx="540" ry="340" fill="url(#halo)"/>

  <!-- Wordmark -->
  <g transform="translate(72, 72)">
    <rect x="0" y="0" width="46" height="46" fill="none" stroke="${cfg.accent}" stroke-width="2" opacity="0.75"/>
    <text x="23" y="30" text-anchor="middle"
          font-family="ui-monospace, SFMono-Regular, monospace" font-size="14" font-weight="700"
          fill="${cfg.accent}">NR</text>
    <text x="62" y="29"
          font-family="ui-monospace, SFMono-Regular, monospace" font-size="13" letter-spacing="6"
          fill="#F5F5F2">NEXT REALM</text>
  </g>

  <!-- Surface tag (top-right) -->
  <text x="${W - 72}" y="100" text-anchor="end"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="13" letter-spacing="4"
        fill="${cfg.accent}">— ${cfg.tag}</text>

  <!-- Headline (Cormorant) -->
  ${wrapHeadline(title, 72, 280, 1000, 84)}

  <!-- Hairline rule -->
  <rect x="72" y="${H - 130}" width="320" height="2" fill="url(#rule)"/>

  <!-- Tier word + scan CTA -->
  <text x="72" y="${H - 90}"
        font-family="'Cormorant Garamond', serif" font-size="34" font-style="italic"
        fill="${cfg.accent}">${escapeXml(cfg.tier)}</text>

  <!-- Footer -->
  <text x="72" y="${H - 40}"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" letter-spacing="3"
        fill="#5A5A64">// nextrealmos.pages.dev</text>
  <text x="${W - 72}" y="${H - 40}" text-anchor="end"
        font-family="ui-monospace, SFMono-Regular, monospace" font-size="11" letter-spacing="3"
        fill="${cfg.accent}">SCAN YOUR AURA · /AURA</text>
</svg>`;
}

function wrapHeadline(text: string, x: number, y: number, maxWidth: number, lineHeight: number): string {
  // Naive char-count wrapping — we don't have font metrics in edge runtime.
  // Cormorant at 80px averages ~36-40 chars per line at 1000px width.
  const CHARS_PER_LINE = 32;
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > CHARS_PER_LINE) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);

  return lines.slice(0, 3).map((line, i) =>
    `<text x="${x}" y="${y + i * lineHeight}"
            font-family="'Cormorant Garamond', 'Times New Roman', serif"
            font-size="80" font-weight="500"
            fill="#F5F5F2"
            style="letter-spacing:-0.012em">${line}</text>`,
  ).join("\n  ");
}

function gridLines(): string {
  let s = "";
  for (let x = 0; x < W; x += 40) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#FFFFFF" stroke-width="1"/>`;
  for (let y = 0; y < H; y += 40) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#FFFFFF" stroke-width="1"/>`;
  return s;
}
