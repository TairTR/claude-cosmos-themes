// The four backdrops as SVG text. `fill` is the context window's fill, 0 to 1:
// every scene grows with it (snow piles up, stars come out, the furnace burns
// hotter, fireflies gather). Pure vector, CSS animation only, slow motion,
// and every moving part has a resting place in the plain markup.
type SceneId = 'snow' | 'steppe' | 'factory' | 'fireflies'

const W = 1600
const H = 900

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n1 = (v: number) => Math.round(v * 10) / 10

function between(r: () => number, lo: number, hi: number): number {
  return lo + r() * (hi - lo)
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

// A smooth ridge through points spaced across the width, closed to the bottom.
function ridge(r: () => number, base: number, wobble: number, step: number): string {
  const pts: [number, number][] = []
  for (let x = -step; x <= W + step; x += step) pts.push([x, base + between(r, -wobble, wobble)])
  let d = `M${pts[0][0]} ${H} L${pts[0][0]} ${n1(pts[0][1])}`
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]
    const [x, y] = pts[i]
    const c = (x - px) / 2
    d += ` C${n1(px + c)} ${n1(py)} ${n1(x - c)} ${n1(y)} ${n1(x)} ${n1(y)}`
  }
  return d + ` L${pts[pts.length - 1][0]} ${H} Z`
}

function svg(defs: string, css: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>${defs}</defs><style>${css}</style>${body}</svg>`
  )
}

function snow(fill: number): string {
  const r = rng(7)
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08111f"/><stop offset="0.6" stop-color="#14263f"/><stop offset="1" stop-color="#2a4366"/></linearGradient>` +
    `<radialGradient id="moonglow"><stop offset="0" stop-color="#dfe9f7" stop-opacity="0.35"/><stop offset="1" stop-color="#dfe9f7" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="drift" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8eef6"/><stop offset="1" stop-color="#a9bcd3"/></linearGradient>`
  const css =
    `.f{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}` +
    `@keyframes fall{0%{transform:translate(0,-1000px);opacity:1}50%{transform:translate(18px,-500px)}90%{opacity:1}100%{transform:translate(0,0);opacity:0}}` +
    `.win{animation:glow 7s ease-in-out infinite alternate}` +
    `@keyframes glow{from{opacity:0.75}to{opacity:1}}`
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  body += `<circle cx="1380" cy="150" r="160" fill="url(#moonglow)"/><circle cx="1380" cy="150" r="46" fill="#eef3fa"/>`
  body += `<path d="${ridge(r, 690, 30, 260)}" fill="#14243a"/>`
  // little houses with warm windows, which the drift slowly buries
  const houses = [
    [110, 660, 90, 60],
    [240, 672, 70, 48],
    [1180, 668, 80, 52],
    [1450, 660, 95, 62],
  ]
  for (const [x, y, w, h] of houses) {
    body += `<path d="M${x} ${y} L${x + w / 2} ${y - h * 0.6} L${x + w} ${y} Z" fill="#0d1828"/>`
    body += `<rect x="${x + 6}" y="${y}" width="${w - 12}" height="${h}" fill="#0f1c2e"/>`
    body += `<rect class="win" x="${x + w / 2 - 9}" y="${y + h * 0.3}" width="18" height="16" fill="#f4c36a"/>`
  }
  const driftTop = H - (30 + fill * 240)
  body += `<path d="${ridge(r, driftTop + 30, 18, 200)}" fill="#8fa4bf"/>`
  body += `<path d="${ridge(r, driftTop + 60, 22, 180)}" fill="url(#drift)"/>`
  const flakes = 70 + Math.round(fill * 110)
  for (let i = 0; i < flakes; i++) {
    const cx = n1(between(r, 0, W))
    const cy = n1(between(r, 20, H - 20))
    const rad = n1(between(r, 1.2, 3.4))
    const dur = n1(between(r, 14, 28))
    const delay = n1(between(r, 0, dur))
    body += `<circle class="f" cx="${cx}" cy="${cy}" r="${rad}" fill="#ffffff" fill-opacity="${n1(between(r, 0.55, 0.95))}" style="animation-duration:${dur}s;animation-delay:-${delay}s"/>`
  }
  return svg(defs, css, body)
}

function steppe(fill: number): string {
  const r = rng(11)
  const horizon = 720
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07061a"/><stop offset="0.55" stop-color="#17153a"/><stop offset="0.8" stop-color="#3a2b4c"/><stop offset="1" stop-color="#5b3b45"/></linearGradient>` +
    `<radialGradient id="milky"><stop offset="0" stop-color="#b9b4e6" stop-opacity="0.14"/><stop offset="1" stop-color="#b9b4e6" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="moonglow"><stop offset="0" stop-color="#f6d9a8" stop-opacity="0.35"/><stop offset="1" stop-color="#f6d9a8" stop-opacity="0"/></radialGradient>`
  const css =
    `.s{animation-name:tw;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}` +
    `@keyframes tw{from{opacity:1}to{opacity:0.25}}` +
    `.g{transform-box:fill-box;transform-origin:50% 100%;animation:sway 9s ease-in-out infinite alternate}` +
    `@keyframes sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}` +
    `.meteor{opacity:0;animation:meteor 17s linear infinite}` +
    `@keyframes meteor{0%{opacity:0;transform:translate(0,0)}94%{opacity:0;transform:translate(0,0)}95%{opacity:0.9}100%{opacity:0;transform:translate(-260px,130px)}}`
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  body += `<ellipse cx="800" cy="300" rx="900" ry="110" fill="url(#milky)" opacity="${n1(0.3 + fill * 0.7)}" transform="rotate(-18 800 300)"/>`
  const stars = 80 + Math.round(fill * 260)
  for (let i = 0; i < stars; i++) {
    const cx = n1(between(r, 0, W))
    const cy = n1(Math.pow(r(), 1.4) * (horizon - 40))
    const rad = n1(between(r, 0.6, 1.9))
    const dur = n1(between(r, 3, 8))
    body += `<circle class="s" cx="${cx}" cy="${cy}" r="${rad}" fill="#fdf8ea" style="animation-duration:${dur}s;animation-delay:-${n1(between(r, 0, dur))}s"/>`
  }
  body += `<line class="meteor" x1="1300" y1="120" x2="1360" y2="90" stroke="#fff6e0" stroke-width="2" stroke-linecap="round"/>`
  const moonY = n1(horizon - 70 - fill * 520)
  const moonColor = lerpColor('#f0a75e', '#f5f1e6', Math.min(1, fill * 1.4))
  body += `<circle cx="1180" cy="${moonY}" r="170" fill="url(#moonglow)"/><circle cx="1180" cy="${moonY}" r="50" fill="${moonColor}"/>`
  body += `<path d="${ridge(r, horizon, 14, 320)}" fill="#120f1d"/>`
  // a yurt on the horizon with a lit door
  body += `<path d="M300 ${horizon + 6} L300 ${horizon - 30} Q300 ${horizon - 44} 316 ${horizon - 48} Q350 ${horizon - 78} 384 ${horizon - 48} Q400 ${horizon - 44} 400 ${horizon - 30} L400 ${horizon + 6} Z" fill="#0b0912"/>`
  body += `<rect x="342" y="${horizon - 22}" width="16" height="26" fill="#e8a24a"/>`
  body += `<path d="${ridge(r, horizon + 90, 20, 260)}" fill="#0c0a14"/>`
  for (let i = 0; i < 70; i++) {
    const x = n1(between(r, 0, W))
    const h = n1(between(r, 40, 120))
    const lean = n1(between(r, -30, 30))
    const dur = n1(between(r, 7, 12))
    body += `<path class="g" d="M${x} ${H} Q${n1(x + lean / 3)} ${n1(H - h / 2)} ${n1(x + lean)} ${n1(H - h)}" stroke="#3b3354" stroke-width="2" fill="none" style="animation-duration:${dur}s;animation-delay:-${n1(between(r, 0, dur))}s"/>`
  }
  return svg(defs, css, body)
}

function factory(fill: number): string {
  const r = rng(23)
  const ground = 760
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c26"/><stop offset="0.45" stop-color="#3d1838"/><stop offset="0.75" stop-color="#8a2d38"/><stop offset="1" stop-color="#d4572a"/></linearGradient>` +
    `<radialGradient id="heat"><stop offset="0" stop-color="#ffb347"/><stop offset="0.4" stop-color="#ff6a1a" stop-opacity="0.7"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>`
  const css =
    `.heat{transform-box:fill-box;transform-origin:50% 50%;animation:breathe 5s ease-in-out infinite alternate}` +
    `@keyframes breathe{from{transform:scale(0.94);opacity:0.85}to{transform:scale(1.04);opacity:1}}` +
    `.sp{animation-name:rise;animation-timing-function:ease-out;animation-iteration-count:infinite}` +
    `@keyframes rise{0%{transform:translate(0,0);opacity:0}10%{opacity:1}100%{transform:translate(var(--dx),-340px);opacity:0}}` +
    `.sm{transform-box:fill-box;transform-origin:50% 50%;animation-name:smoke;animation-timing-function:linear;animation-iteration-count:infinite}` +
    `@keyframes smoke{0%{transform:translate(0,0) scale(0.6);opacity:0}15%{opacity:0.4}100%{transform:translate(160px,-260px) scale(2.2);opacity:0}}`
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  body += `<circle cx="330" cy="${ground - 40}" r="110" fill="#f08a3c" opacity="0.55"/>`
  // smoke behind the chimneys
  const chimneys = [
    [880, 330, 34],
    [960, 280, 38],
    [1050, 360, 30],
  ]
  for (const [x, top] of chimneys) {
    for (let k = 0; k < 4; k++) {
      const dur = n1(between(r, 14, 20))
      body += `<ellipse class="sm" cx="${x + 18}" cy="${top - 20}" rx="40" ry="26" fill="#4a3434" opacity="0.3" style="animation-duration:${dur}s;animation-delay:-${n1((dur / 4) * k)}s"/>`
    }
  }
  // the works, in silhouette
  const sil = '#120b0b'
  body += `<rect x="560" y="560" width="300" height="${ground - 560}" fill="${sil}"/>`
  body += `<path d="M560 560 L610 520 L660 560 L710 520 L760 560 L810 520 L860 560 Z" fill="${sil}"/>`
  for (const [x, top, w] of chimneys) body += `<rect x="${x}" y="${top}" width="${w}" height="${ground - top}" fill="${sil}"/>`
  body += `<rect x="1080" y="600" width="160" height="${ground - 600}" fill="${sil}"/>`
  body += `<path d="M1280 ${ground} L1300 470 L1300 380 L1340 340 L1400 340 L1440 380 L1440 470 L1460 ${ground} Z" fill="${sil}"/>`
  body += `<path d="M1240 640 L1300 430 L1316 436 L1258 646 Z" fill="${sil}"/>`
  body += `<rect x="1355" y="250" width="30" height="100" fill="${sil}"/>`
  // lit windows
  for (let i = 0; i < 14; i++) {
    const x = n1(between(r, 580, 840))
    const y = n1(between(r, 590, 730))
    body += `<rect x="${x}" y="${y}" width="10" height="14" fill="#ffb35a" opacity="${n1(between(r, 0.5, 0.95))}"/>`
  }
  // the furnace glow grows hotter with the context
  const heat = n1(0.15 + fill * 0.85)
  body += `<ellipse class="heat" cx="1370" cy="${ground}" rx="${n1(220 + fill * 160)}" ry="${n1(70 + fill * 60)}" fill="url(#heat)" opacity="${heat}"/>`
  body += `<rect x="0" y="${ground}" width="${W}" height="${H - ground}" fill="#0c0707"/>`
  body += `<rect x="0" y="${ground}" width="${W}" height="3" fill="#ff7a2a" opacity="${n1(0.15 + fill * 0.5)}"/>`
  const sparks = 12 + Math.round(fill * 70)
  for (let i = 0; i < sparks; i++) {
    const cx = n1(between(r, 1290, 1450))
    const cy = n1(between(r, ground - 60, ground - 5))
    const dur = n1(between(r, 2.5, 5.5))
    const dx = Math.round(between(r, -120, 60))
    body += `<circle class="sp" cx="${cx}" cy="${cy}" r="${n1(between(r, 1, 2.4))}" fill="#ffd27a" style="--dx:${dx}px;animation-duration:${dur}s;animation-delay:-${n1(between(r, 0, dur))}s"/>`
  }
  return svg(defs, css, body)
}

function fireflies(fill: number): string {
  const r = rng(31)
  const horizon = 640
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08121f"/><stop offset="0.55" stop-color="#162634"/><stop offset="0.85" stop-color="#2f3e3a"/><stop offset="1" stop-color="#4d4a32"/></linearGradient>` +
    `<radialGradient id="ff"><stop offset="0" stop-color="#fff3a0" stop-opacity="0.9"/><stop offset="0.35" stop-color="#e8e06a" stop-opacity="0.35"/><stop offset="1" stop-color="#e8e06a" stop-opacity="0"/></radialGradient>`
  const css =
    `.w{animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}` +
    `@keyframes w1{0%{transform:translate(0,0)}33%{transform:translate(40px,-30px)}66%{transform:translate(-20px,-60px)}100%{transform:translate(30px,-20px)}}` +
    `@keyframes w2{0%{transform:translate(0,0)}33%{transform:translate(-50px,20px)}66%{transform:translate(-10px,-40px)}100%{transform:translate(-40px,-10px)}}` +
    `@keyframes w3{0%{transform:translate(0,0)}50%{transform:translate(60px,30px)}100%{transform:translate(20px,-50px)}}` +
    `.p{animation-name:pulse;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}` +
    `@keyframes pulse{from{opacity:0.15}to{opacity:1}}` +
    `.g{transform-box:fill-box;transform-origin:50% 100%;animation:sway 8s ease-in-out infinite alternate}` +
    `@keyframes sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}`
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  for (let i = 0; i < 40; i++) {
    body += `<circle cx="${n1(between(r, 0, W))}" cy="${n1(between(r, 0, 330))}" r="${n1(between(r, 0.6, 1.4))}" fill="#e9f0f5" opacity="${n1(between(r, 0.3, 0.8))}"/>`
  }
  body += `<path d="${ridge(r, horizon, 30, 300)}" fill="#13221b"/>`
  // an old tree on the left
  const tree = '#0a130e'
  body += `<path d="M150 ${horizon + 40} L170 470 L150 430 L180 440 L190 400 L205 445 L235 425 L210 480 L222 ${horizon + 40} Z" fill="${tree}"/>`
  for (const [cx, cy, rad] of [[190, 380, 90], [120, 420, 70], [260, 410, 75], [190, 320, 70], [110, 350, 55], [270, 340, 60]]) {
    body += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${tree}"/>`
  }
  body += `<path d="${ridge(r, horizon + 120, 25, 240)}" fill="#0e1a13"/>`
  for (let i = 0; i < 110; i++) {
    const x = n1(between(r, 0, W))
    const h = n1(between(r, 30, 110))
    const lean = n1(between(r, -25, 25))
    const dur = n1(between(r, 6, 11))
    body += `<path class="g" d="M${x} ${H} Q${n1(x + lean / 3)} ${n1(H - h / 2)} ${n1(x + lean)} ${n1(H - h)}" stroke="#1d3324" stroke-width="2.5" fill="none" style="animation-duration:${dur}s;animation-delay:-${n1(between(r, 0, dur))}s"/>`
  }
  const flies = 12 + Math.round(fill * 110)
  for (let i = 0; i < flies; i++) {
    const cx = n1(between(r, 0, W))
    const cy = n1(between(r, 380, 860))
    const path = ['w1', 'w2', 'w3'][Math.floor(r() * 3)]
    const wd = n1(between(r, 10, 22))
    const pd = n1(between(r, 2.5, 5))
    body +=
      `<g class="w" style="animation-name:${path};animation-duration:${wd}s;animation-delay:-${n1(between(r, 0, wd))}s">` +
      `<g class="p" style="animation-duration:${pd}s;animation-delay:-${n1(between(r, 0, pd))}s">` +
      `<circle cx="${cx}" cy="${cy}" r="14" fill="url(#ff)"/><circle cx="${cx}" cy="${cy}" r="1.8" fill="#fffbd0"/></g></g>`
  }
  return svg(defs, css, body)
}

export const ALT: Record<SceneId, string> = {
  snow: 'Зимний вечер: падает снег, у домиков с тёплыми окнами растёт сугроб',
  steppe: 'Ночная степь: звёзды, восходящая луна и юрта на горизонте',
  factory: 'Цех на закате: трубы, домна, искры и свечение расплава',
  fireflies: 'Летний луг в сумерках: старое дерево, трава и светлячки',
}

export function sceneSvg(id: SceneId, fill: number): string {
  const f = Math.max(0, Math.min(1, fill))
  switch (id) {
    case 'snow':
      return snow(f)
    case 'steppe':
      return steppe(f)
    case 'factory':
      return factory(f)
    case 'fireflies':
      return fireflies(f)
  }
}
