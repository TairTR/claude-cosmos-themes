// The solar system, three ways, with Halley's comet.
// Motion is Keplerian: each planet runs its real elliptical, slightly inclined
// orbit (J2000 mean elements), fast near the Sun and slow far from it, with its
// real sidereal period scaled so one Earth year lasts `yearSec` seconds. Each
// body starts where it really is on the simulated date.
// Distances are compressed (square root, or linear for the inner planets) and
// bodies enlarged so they can be seen.
// The context fill is a long exposure: the longer it runs, the more faint stars,
// Milky Way and nebulae soak onto the "sensor".

const W = 1600
const H = 900
const D2R = Math.PI / 180

export type CosmosId = 'orrery' | 'ecliptic' | 'inner'

type Elements = {
  a: number // semi-major axis, AU
  e: number // eccentricity
  inc: number // inclination to the ecliptic, degrees
  node: number // longitude of the ascending node, degrees
  argPeri: number // argument of perihelion, degrees
  period: number // days
}

type Planet = Elements & {
  name: string
  L0: number // mean longitude at J2000, degrees
  rate: number // degrees per Julian century
  peri: number // longitude of perihelion, degrees
  size: number
  color: string
  ring?: boolean
  moon?: boolean
}

// [name, a, e, inc, node, peri, L0, rate, period, size, color]
const ROWS: [string, number, number, number, number, number, number, number, number, number, string][] = [
  ['Меркурий', 0.38710, 0.20563, 7.005, 48.331, 77.456, 252.25032, 149472.67411, 87.969, 3, '#b5aea4'],
  ['Венера', 0.72333, 0.00677, 3.395, 76.680, 131.533, 181.97910, 58517.81539, 224.701, 5, '#ecd08e'],
  ['Земля', 1.00000, 0.01671, 0.0, 0.0, 102.947, 100.46457, 35999.37245, 365.256, 5.5, '#4f93e6'],
  ['Марс', 1.52368, 0.09340, 1.850, 49.558, 336.041, -4.55343, 19140.30268, 686.98, 4.2, '#d9663a'],
  ['Юпитер', 5.20260, 0.04849, 1.303, 100.464, 14.331, 34.39644, 3034.74612, 4332.59, 11, '#d8b08a'],
  ['Сатурн', 9.55491, 0.05551, 2.489, 113.666, 93.057, 49.95424, 1222.49362, 10759.22, 9, '#e6d29c'],
  ['Уран', 19.21845, 0.04630, 0.773, 74.006, 173.005, 313.23810, 428.48202, 30688.5, 7, '#a3dde3'],
  ['Нептун', 30.11039, 0.00899, 1.770, 131.784, 48.124, -55.12003, 218.45945, 60182, 7, '#5579e0'],
]

const PLANETS: Planet[] = ROWS.map(([name, a, e, inc, node, peri, L0, rate, period, size, color]) => ({
  name, a, e, inc, node, peri, argPeri: peri - node, L0, rate, period, size, color,
  ring: name === 'Сатурн',
  moon: name === 'Земля',
}))

// 1P/Halley: retrograde (i = 162°), perihelion 9 Feb 1986, next July 2061.
const HALLEY: Elements & { periDays: number } = {
  a: 17.834, e: 0.96714, inc: 162.262, node: 58.42, argPeri: 111.332, period: 27509,
  periDays: (Date.UTC(1986, 1, 9, 11) - Date.UTC(2000, 0, 1, 12)) / 86400000,
}

const MOON = { period: 27.3217, L0: 218.316, ratePerDay: 13.176396 }

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
const n0 = (v: number) => Math.round(v)
const n1 = (v: number) => Math.round(v * 10) / 10
const n2 = (v: number) => Math.round(v * 100) / 100
const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)
const mod360 = (v: number) => ((v % 360) + 360) % 360
const mod2pi = (v: number) => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

// ---------- Kepler ----------
function solveKepler(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= d
    if (Math.abs(d) < 1e-10) break
  }
  return E
}
function trueFromMean(M: number, e: number): number {
  const E = solveKepler(mod2pi(M), e)
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
}
function meanFromTrue(nu: number, e: number): number {
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2))
  return mod2pi(E - e * Math.sin(E))
}
/** Heliocentric ecliptic position (AU) at true anomaly nu. */
function position(el: Elements, nu: number): { x: number; y: number; z: number; r: number } {
  const r = (el.a * (1 - el.e * el.e)) / (1 + el.e * Math.cos(nu))
  const u = el.argPeri * D2R + nu
  const O = el.node * D2R
  const i = el.inc * D2R
  return {
    x: r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(i)),
    y: r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(i)),
    z: r * Math.sin(u) * Math.sin(i),
    r,
  }
}

// How a real position lands in a view: compressed radius, then the plane is
// squashed by k (seen at an angle) and heights above it lift the body.
type View = { k: number; radius: (a: number) => number }
function project(v: View, p: { x: number; y: number; z: number; r: number }) {
  const s = v.radius(p.r) / p.r
  const X = p.x * s
  const Y = p.y * s
  const Z = p.z * s
  const c = Math.sqrt(Math.max(0, 1 - v.k * v.k))
  return {
    // inside the squashed frame
    fx: X,
    fy: -Y - (Z * c) / v.k,
    // on screen, relative to the Sun (before the view's tilt)
    sx: X,
    sy: -Y * v.k - Z * c,
    far: Y / Math.max(1e-6, Math.hypot(X, Y)),
  }
}

function unwrap(prev: number | null, a: number): number {
  if (prev === null) return a
  while (a - prev > 180) a -= 360
  while (a - prev < -180) a += 360
  return a
}

// ---------- the long exposure ----------
function starfield(fill: number): { defs: string; body: string } {
  const r = rng(101)
  const defs =
    `<radialGradient id="mw-core"><stop offset="0" stop-color="#d9c7a0" stop-opacity="0.22"/><stop offset="0.5" stop-color="#8f86c4" stop-opacity="0.1"/><stop offset="1" stop-color="#8f86c4" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="neb-red"><stop offset="0" stop-color="#c2415f" stop-opacity="0.55"/><stop offset="1" stop-color="#c2415f" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="neb-blue"><stop offset="0" stop-color="#3f7fd0" stop-opacity="0.5"/><stop offset="1" stop-color="#3f7fd0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="space-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#03040a"/><stop offset="1" stop-color="#070a17"/></linearGradient>`
  let body = `<rect width="${W}" height="${H}" fill="url(#space-bg)"/>`
  const mw = Math.min(1, fill * 1.2)
  if (mw > 0.02) {
    body += `<g transform="rotate(-24 800 450)" opacity="${n2(mw)}">`
    body += `<ellipse cx="800" cy="450" rx="1100" ry="150" fill="url(#mw-core)"/>`
    body += `<ellipse cx="620" cy="440" rx="520" ry="110" fill="url(#mw-core)"/>`
    body += `</g>`
  }
  const neb = Math.max(0, (fill - 0.35) / 0.65)
  if (neb > 0) {
    body += `<ellipse cx="260" cy="170" rx="230" ry="150" fill="url(#neb-red)" opacity="${n2(neb * 0.8)}"/>`
    body += `<ellipse cx="1420" cy="760" rx="260" ry="170" fill="url(#neb-blue)" opacity="${n2(neb * 0.7)}"/>`
    body += `<ellipse cx="330" cy="760" rx="160" ry="110" fill="url(#neb-blue)" opacity="${n2(neb * 0.45)}"/>`
  }
  for (let i = 0; i < 45; i++) {
    const dur = n1(between(r, 4, 9))
    body += `<circle class="tw" cx="${n0(between(r, 0, W))}" cy="${n0(between(r, 0, H))}" r="${n1(between(r, 0.9, 1.8))}" fill="#f4f6ff" style="animation-duration:${dur}s;animation-delay:-${n1(between(r, 0, dur))}s"/>`
  }
  const faint = Math.round(fill * 400)
  const tints = ['#fff', '#cfd9ff', '#ffe9c9', '#ffd2c4']
  for (let i = 0; i < faint; i++) {
    let x: number
    let y: number
    if (i % 2 === 0) {
      const t = between(r, -1100, 1100)
      const off = (r() + r() + r() - 1.5) * 170
      const ang = -24 * D2R
      x = 800 + t * Math.cos(ang) - off * Math.sin(ang)
      y = 450 + t * Math.sin(ang) + off * Math.cos(ang)
    } else {
      x = between(r, 0, W)
      y = between(r, 0, H)
    }
    body += `<circle cx="${n0(x)}" cy="${n0(y)}" r="${n1(between(r, 0.4, 1.05))}" fill="${tints[Math.floor(r() * 4)]}" opacity="${n2(0.15 + 0.75 * fill * r())}"/>`
  }
  return { defs, body }
}

// ---------- bodies ----------
// Ids carry a hyphen: the desktop app drops ids that clash with page built-ins.

function sunArt(core: number): string {
  let rays = ''
  for (let i = 0; i < 14; i++) {
    const len = core * (i % 2 ? 1.9 : 2.6) * (1 + 0.15 * Math.sin(i * 2.3))
    rays += `<ellipse cx="${n1(len * 0.55)}" rx="${n1(len * 0.6)}" ry="${n1(core * (i % 3 ? 0.4 : 0.6))}" fill="url(#sun-ray)" transform="rotate(${n1(i * (360 / 14) + 7 * Math.sin(i))})"/>`
  }
  return (
    `<circle r="${core * 8}" fill="url(#sun-glow)"/>` +
    `<g class="corona">${rays}</g>` +
    `<circle class="pulse" r="${n1(core * 2.4)}" fill="url(#sun-glow)"/>` +
    `<circle r="${core}" fill="url(#sun-core)"/>` +
    `<circle r="${core}" fill="url(#sun-limb)"/>`
  )
}

function surface(p: Planet, s: number): string {
  const c = (id: string, inner: string) =>
    `<clipPath id="cp-${id}"><circle r="${n1(s)}"/></clipPath><g clip-path="url(#cp-${id})">${inner}</g>`
  const e = (cx: number, cy: number, rx: number, ry: number, fill: string, op = 1, rot = 0) =>
    `<ellipse cx="${n1(cx * s)}" cy="${n1(cy * s)}" rx="${n1(rx * s)}" ry="${n1(ry * s)}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}${rot ? ` transform="rotate(${rot})"` : ''}/>`
  switch (p.name) {
    case 'Меркурий':
      return c('mer', `<circle r="${n1(s)}" fill="#9b958d"/>` + e(-0.3, -0.2, 0.22, 0.22, '#78726a') + e(0.3, 0.3, 0.16, 0.16, '#7d776f') + e(0.1, -0.5, 0.12, 0.12, '#837d75') + e(-0.2, 0.5, 0.1, 0.1, '#bdb7ae', 0.6))
    case 'Венера':
      return c('ven', `<circle r="${n1(s)}" fill="#e8d29c"/>` + e(0, -0.35, 1.1, 0.18, '#d4b77a', 0.55, -8) + e(0, 0.15, 1.1, 0.14, '#f4e6bf', 0.6, -8) + e(0, 0.55, 1.1, 0.16, '#d9be86', 0.5, -8))
    case 'Земля':
      return (
        c('ear',
          `<circle r="${n1(s)}" fill="#245fb5"/>` +
          e(-0.3, -0.15, 0.42, 0.3, '#3d7d3f', 1, 25) + e(0.35, 0.35, 0.22, 0.34, '#4c8a46', 1, -15) + e(0.2, -0.55, 0.3, 0.14, '#5b8f4c') +
          e(0, -0.92, 0.7, 0.2, '#f2f6fb', 0.9) + e(-0.1, 0.2, 0.6, 0.07, '#ffffff', 0.4, -12) + e(0.25, -0.3, 0.35, 0.05, '#ffffff', 0.35, 10)) +
        `<circle r="${n1(s + 0.8)}" fill="none" stroke="#8ec0ff" stroke-opacity="0.5" stroke-width="1.3"/>`
      )
    case 'Марс':
      return c('mar', `<circle r="${n1(s)}" fill="#c4572f"/>` + e(-0.2, 0.1, 0.5, 0.22, '#8e3c22', 0.8, -20) + e(0.35, -0.2, 0.25, 0.15, '#9b4426', 0.7) + e(0, -0.92, 0.45, 0.2, '#f6efe8'))
    case 'Юпитер': {
      const bands: [number, number, string, number][] = [
        [-0.78, 0.12, '#b8875c', 0.8], [-0.52, 0.14, '#f0dfc4', 0.8], [-0.28, 0.16, '#a9764c', 0.85], [-0.06, 0.12, '#f3e4cb', 0.7],
        [0.16, 0.18, '#b07b50', 0.85], [0.42, 0.12, '#ecd8ba', 0.7], [0.64, 0.14, '#b98a60', 0.75], [0.86, 0.1, '#d5b48e', 0.7],
      ]
      let inner = `<circle r="${n1(s)}" fill="#d9b48b"/>`
      for (const [y, h, col, op] of bands) inner += `<rect x="${n1(-s)}" y="${n1((y - h / 2) * s)}" width="${n1(2 * s)}" height="${n1(h * s)}" fill="${col}" opacity="${op}"/>`
      inner += e(0.32, 0.3, 0.24, 0.13, '#b4523a') + e(0.32, 0.3, 0.14, 0.07, '#cf7556', 0.8)
      return c('jup', inner)
    }
    case 'Сатурн':
      return c('sat', `<circle r="${n1(s)}" fill="#e2cb92"/>` + e(0, -0.45, 1.1, 0.16, '#cdb075', 0.7) + e(0, 0.05, 1.1, 0.1, '#f0e0b0', 0.6) + e(0, 0.4, 1.1, 0.14, '#c9a96c', 0.6) + e(0, -0.85, 0.5, 0.2, '#b9a98a', 0.6))
    case 'Уран':
      return c('ura', `<circle r="${n1(s)}" fill="#a6dfe4"/>` + e(0, 0.1, 1.1, 0.18, '#c6eef1', 0.45, 80) + e(-0.55, 0, 0.3, 0.3, '#bfe9ec', 0.5))
    case 'Нептун':
      return c('nep', `<circle r="${n1(s)}" fill="#3d62d3"/>` + e(0, -0.3, 1.1, 0.12, '#4e75e0', 0.7) + e(-0.2, 0.25, 0.26, 0.14, '#243c92') + e(0.25, 0.5, 0.2, 0.05, '#e1e9ff', 0.8) + e(0.1, -0.6, 0.25, 0.04, '#dfe8ff', 0.6))
    default:
      return `<circle r="${n1(s)}" fill="${p.color}"/>`
  }
}

function ringHalf(s: number, front: boolean): string {
  const arc = (R: number, ry: number) =>
    front ? `M${n1(R)} 0A${n1(R)} ${n1(ry)} 0 0 1 ${n1(-R)} 0` : `M${n1(-R)} 0A${n1(R)} ${n1(ry)} 0 0 1 ${n1(R)} 0`
  return (
    `<g transform="rotate(-14)" fill="none">` +
    `<path d="${arc(s * 2.25, s * 0.52)}" stroke="#d6c08a" stroke-width="${n1(s * 0.42)}" opacity="0.85"/>` +
    `<path d="${arc(s * 1.62, s * 0.37)}" stroke="#bea56c" stroke-width="${n1(s * 0.38)}" opacity="0.75"/>` +
    `<path d="${arc(s * 1.3, s * 0.3)}" stroke="#8f7c55" stroke-width="${n1(s * 0.14)}" opacity="0.45"/>` +
    `</g>`
  )
}

type Sim = { fill: number; days: number; yearSec: number }

// One orbiting body: sampled along its true orbit (uniform in true anomaly, so
// the fast perihelion passage gets as many frames as the slow aphelion), each
// sample stamped with its time from Kepler's equation. Three keyframe tracks
// share those stamps: position, which way the lit side faces, and the depth
// scale. The plain markup holds the body's real position on the simulated date.
// A closed Catmull-Rom curve through the samples, as cubic Beziers, so the
// drawn orbit is smooth rather than a polygon.
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length
  let d = `M${n0(pts[0][0])} ${n0(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += `C${n0(p1[0] + (p2[0] - p0[0]) / 6)} ${n0(p1[1] + (p2[1] - p0[1]) / 6)} ${n0(p2[0] - (p3[0] - p1[0]) / 6)} ${n0(p2[1] - (p3[1] - p1[1]) / 6)} ${n0(p2[0])} ${n0(p2[1])}`
  }
  return d + 'Z'
}

type Track = { css: string; pos0: string; lit0: number; dep0: number; dur: number; delay: number; path: string }

function track(id: string, el: Elements, meanNow: number, v: View, yearSec: number, samples: number, depth: boolean, extra?: (r: number, at: string, lit: number) => string): Track {
  const dur = (el.period / 365.25) * yearSec
  let pos = ''
  let lit = ''
  let more = ''
  const pts: [number, number][] = []
  let prev: number | null = null
  for (let j = 0; j <= samples; j++) {
    const nu = (j / samples) * 2 * Math.PI
    const M = j === samples ? 2 * Math.PI : meanFromTrue(nu, el.e)
    const at = `${n1((M / (2 * Math.PI)) * 100)}%`
    const q = project(v, position(el, nu))
    const a = unwrap(prev, Math.atan2(-q.sy, -q.sx) / D2R)
    prev = a
    pos += `${at}{transform:translate(${n1(q.fx)}px,${n1(q.fy)}px)${depth ? ` scale(${n2(1 - 0.16 * q.far)})` : ''}}`
    lit += `${at}{transform:rotate(${n0(a)}deg)}`
    if (extra) more += extra(position(el, nu).r, at, a)
    if (j < samples) pts.push([q.fx, q.fy])
  }
  const nuNow = trueFromMean(meanNow, el.e)
  const q0 = project(v, position(el, nuNow))
  let css = `@keyframes pos-${id}{${pos}}@keyframes lit-${id}{${lit}}`
  if (extra) css += `@keyframes x-${id}{${more}}`
  return {
    css,
    pos0: `translate(${n1(q0.fx)} ${n1(q0.fy)})${depth ? ` scale(${n2(1 - 0.16 * q0.far)})` : ''}`,
    lit0: Math.atan2(-q0.sy, -q0.sx) / D2R,
    dep0: depth ? 1 - 0.16 * q0.far : 1,
    dur,
    delay: (meanNow / (2 * Math.PI)) * dur,
    path: smoothClosed(pts),
  }
}

function anim(name: string, t: Track): string {
  return `style="animation-name:${name};animation-duration:${n2(t.dur)}s;animation-delay:-${n2(t.delay)}s"`
}

function planetBody(p: Planet, idx: number, o: Sim, v: View, scale: number, depth: boolean, labelTilt: number): { body: string; css: string; orbit: string } {
  const meanNow = mod360(p.L0 + p.rate * (o.days / 36525) - p.peri) * D2R
  const t = track(String(idx), p, meanNow, v, o.yearSec, 48, depth)
  const s = p.size * scale
  let art = ''
  if (p.ring) art += ringHalf(s, false)
  art += surface(p, s)
  art += `<g class="kf" ${anim(`lit-${idx}`, t)} transform="rotate(${n1(t.lit0)})"><circle r="${n1(s + 0.3)}" fill="url(#k-shade)"/></g>`
  if (p.ring) art += ringHalf(s, true)
  if (p.moon) {
    const moonDeg = mod360(MOON.L0 + MOON.ratePerDay * o.days)
    const moonDur = (MOON.period / 365.25) * o.yearSec
    art += `<g transform="rotate(${n1(-moonDeg)})"><g class="spin" style="animation-duration:${n2(moonDur)}s"><circle cx="${n1(s + 7 * scale)}" r="${n1(1.5 * scale)}" fill="#cfcfcf"/></g></g>`
  }
  const ly = n1((p.ring ? s * 1.3 : s) + 15)
  art += `<text y="${ly}" text-anchor="middle" font-family="sans-serif" font-size="12" letter-spacing="0.3" fill="#a9b4cc" opacity="0.7"${labelTilt ? ` transform="rotate(${labelTilt})"` : ''}>${p.name}</text>`
  const body = `<g class="kf" ${anim(`pos-${idx}`, t)} transform="${t.pos0}"><g transform="scale(1 ${n2(1 / v.k)})">${art}</g></g>`
  return { body, css: t.css, orbit: `<path class="orbit" d="${t.path}"/>` }
}

// Halley's comet: a bright head, a coma, and two tails that point away from
// the Sun and grow as it nears perihelion.
function comet(o: Sim, v: View, labelTilt: number): { body: string; css: string; orbit: string } {
  const meanNow = mod2pi(((o.days - HALLEY.periDays) / HALLEY.period) * 2 * Math.PI)
  const tailFrame = (r: number, at: string, lit: number) => {
    const len = Math.min(1, 1.6 / r)
    return `${at}{transform:rotate(${n1(lit + 180)}deg) scale(${n2(0.05 + 2.6 * len)},${n2(0.6 + 0.6 * len)});opacity:${n2(Math.min(1, 0.1 + 2.2 / r))}}`
  }
  const t = track('comet', HALLEY, meanNow, v, o.yearSec, 72, false, tailFrame)
  const r0 = position(HALLEY, trueFromMean(meanNow, HALLEY.e)).r
  const len0 = Math.min(1, 1.6 / r0)
  const art =
    `<g class="kf" ${anim('x-comet', t)} transform="rotate(${n1(t.lit0 + 180)}) scale(${n2(0.05 + 2.6 * len0)} ${n2(0.6 + 0.6 * len0)})" opacity="${n2(Math.min(1, 0.1 + 2.2 / r0))}">` +
    `<path d="M0 -3 Q40 -2 80 -16 Q40 6 0 3Z" fill="url(#k-dust)"/>` +
    `<path d="M0 -1.5 L95 -2 L95 2 L0 1.5Z" fill="url(#k-ion)"/>` +
    `<circle r="9" fill="url(#k-coma)"/>` +
    `</g>` +
    `<circle r="1.8" fill="#f4fbff"/>` +
    `<text y="16" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9fc6d9" opacity="0.6"${labelTilt ? ` transform="rotate(${labelTilt})"` : ''}>комета Галлея</text>`
  const body = `<g class="kf" ${anim('pos-comet', t)} transform="${t.pos0}"><g transform="scale(1 ${n2(1 / v.k)})">${art}</g></g>`
  return { body, css: t.css, orbit: `<path class="orbit comet-orbit" d="${t.path}"/>` }
}

const CSS =
  `.spin{animation-name:spin;animation-timing-function:linear;animation-iteration-count:infinite}` +
  `.kf{animation-timing-function:linear;animation-iteration-count:infinite}` +
  `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}` +
  `.tw{animation-name:tw;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}` +
  `@keyframes tw{from{opacity:1}to{opacity:0.45}}` +
  `.pulse{animation:pulse 6s ease-in-out infinite alternate}` +
  `@keyframes pulse{from{opacity:0.6}to{opacity:1}}` +
  `.corona{animation:corona 240s linear infinite}` +
  `@keyframes corona{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` +
  `.ast{stroke-linecap:round;vector-effect:non-scaling-stroke}` +
  `.orbit{fill:none;stroke:#9fb4ff;stroke-opacity:0.14;stroke-width:1;vector-effect:non-scaling-stroke}` +
  `.comet-orbit{stroke:#9fd8e8;stroke-opacity:0.07;stroke-dasharray:3 5}`

const DEFS =
  `<radialGradient id="sun-glow"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.45"/><stop offset="0.25" stop-color="#ff9a3c" stop-opacity="0.12"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="sun-core"><stop offset="0" stop-color="#fffdf2"/><stop offset="0.55" stop-color="#ffe08a"/><stop offset="1" stop-color="#ffa53f"/></radialGradient>` +
  `<radialGradient id="sun-limb"><stop offset="0.6" stop-color="#ff7a1a" stop-opacity="0"/><stop offset="1" stop-color="#d8501a" stop-opacity="0.55"/></radialGradient>` +
  `<radialGradient id="sun-ray"><stop offset="0" stop-color="#fff1c8" stop-opacity="0.2"/><stop offset="1" stop-color="#ffd68a" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="k-shade" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.42" stop-color="#000" stop-opacity="0"/><stop offset="0.6" stop-color="#02030a" stop-opacity="0.62"/><stop offset="1" stop-color="#02030a" stop-opacity="0.86"/></linearGradient>` +
  `<radialGradient id="k-zodi"><stop offset="0" stop-color="#ffe7bf" stop-opacity="0.22"/><stop offset="0.5" stop-color="#ffe7bf" stop-opacity="0.06"/><stop offset="1" stop-color="#ffe7bf" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="k-coma"><stop offset="0" stop-color="#e9fbff" stop-opacity="0.9"/><stop offset="0.4" stop-color="#9fe3f5" stop-opacity="0.35"/><stop offset="1" stop-color="#9fe3f5" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="k-ion" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fd7ff" stop-opacity="0.75"/><stop offset="1" stop-color="#6fb4ff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="k-dust" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff1d2" stop-opacity="0.6"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></linearGradient>`

type SystemOpts = {
  cx: number
  cy: number
  k: number
  tilt: number
  radius: (a: number) => number
  planets: Planet[]
  scale: number
  sun: number
  depth: boolean
  extra?: string
  under?: string
}

function system(o: Sim, so: SystemOpts): { body: string; css: string } {
  const v: View = { k: so.k, radius: so.radius }
  let orbits = ''
  let bodies = ''
  let css = ''
  so.planets.forEach((p, idx) => {
    const made = planetBody(p, idx, o, v, so.scale, so.depth, -so.tilt)
    orbits += made.orbit
    bodies += made.body
    css += made.css
  })
  const c = comet(o, v, -so.tilt)
  css += c.css
  let out = `<g transform="translate(${so.cx} ${so.cy}) rotate(${so.tilt}) scale(1 ${so.k})">`
  out += so.under ?? ''
  out += orbits + c.orbit
  out += so.extra ?? ''
  out += `<g transform="scale(1 ${n2(1 / so.k)})">${sunArt(so.sun)}</g>`
  out += bodies + c.body
  return { body: out + `</g>`, css }
}

function wrap(fill: number, made: { body: string; css: string }): string {
  const sky = starfield(fill)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>${sky.defs}${DEFS}</defs><style>${CSS}${made.css}</style>${sky.body}${made.body}</svg>`
  )
}

// Asteroids on circular orbits with Kepler's third law (period = a^1.5 years),
// drawn as round dots whatever the squash.
function belt(o: Sim, radius: (a: number) => number, count: number, seed: number, width: [number, number]): string {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const a = between(r, 2.15, 3.3)
    const dur = Math.pow(a, 1.5) * o.yearSec
    out +=
      `<g transform="rotate(${n0(-between(r, 0, 360))})"><g class="spin" style="animation-duration:${n1(dur)}s">` +
      `<path class="ast" d="M${n1(radius(a))} 0h.01" stroke="#c4b79f" stroke-width="${n1(between(r, width[0], width[1]))}" stroke-opacity="${n2(between(r, 0.45, 0.9))}"/></g></g>`
  }
  return out
}

function orrery(o: Sim): string {
  return wrap(o.fill, system(o, { cx: 1060, cy: 450, k: 1, tilt: 0, radius: a => 40 + 75 * Math.sqrt(a), planets: PLANETS, scale: 1.1, sun: 14, depth: false }))
}

function ecliptic(o: Sim): string {
  const radius = (a: number) => 55 + 130 * Math.sqrt(a)
  return wrap(
    o.fill,
    system(o, {
      cx: 800, cy: 470, k: 0.27, tilt: -6, radius, planets: PLANETS, scale: 1.35, sun: 18, depth: true,
      under: `<ellipse rx="820" ry="190" fill="url(#k-zodi)"/>`,
      extra: belt(o, radius, 85, 303, [1.2, 2.4]),
    }),
  )
}

function inner(o: Sim): string {
  const radius = (a: number) => 45 + 165 * a
  return wrap(
    o.fill,
    system(o, { cx: 800, cy: 450, k: 1, tilt: 0, radius, planets: PLANETS.slice(0, 4), scale: 2, sun: 24, depth: false, extra: belt(o, radius, 200, 202, [2, 4.5]) }),
  )
}

export const COSMOS_ALT: Record<CosmosId, string> = {
  orrery: 'Солнечная система сверху: восемь планет и комета Галлея на своих орбитах',
  ecliptic: 'Солнечная система сбоку, в плоскости эклиптики, с кометой Галлея',
  inner: 'Внутренние планеты и пояс астероидов в настоящем масштабе расстояний',
}

export function cosmosSvg(id: CosmosId, o: Sim): string {
  const f = Math.max(0, Math.min(1, o.fill))
  const opts = { ...o, fill: f }
  if (id === 'orrery') return orrery(opts)
  if (id === 'ecliptic') return ecliptic(opts)
  return inner(opts)
}

/** Days since J2000.0 for a time in milliseconds. */
export function daysSinceJ2000(ms: number): number {
  return (ms - Date.UTC(2000, 0, 1, 12)) / 86400000
}

/** Years until Halley's next perihelion from a simulated date. */
export function halleyYearsToPerihelion(days: number): number {
  const phase = mod2pi(((days - HALLEY.periDays) / HALLEY.period) * 2 * Math.PI) / (2 * Math.PI)
  return ((1 - phase) * HALLEY.period) / 365.25
}
