import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { COSMOS_ALT, cosmosSvg, daysSinceJ2000, halleyYearsToPerihelion } from './cosmos.ts'
import type { CosmosId } from './cosmos.ts'
import { makeColors } from './make-colors.js'
import { PALETTES, SCENES, TITLES } from './palettes.ts'
import type { SceneId } from './palettes.ts'
import { ALT, sceneSvg } from './scenes.ts'
import { SPACE_SOUND } from './sound.ts'

const PLUGIN = 'tair-temy'

const NAMES: Record<string, SceneId> = {
  космос: 'orrery',
  орбиты: 'orrery',
  сверху: 'orrery',
  orrery: 'orrery',
  сбоку: 'ecliptic',
  эклиптика: 'ecliptic',
  ecliptic: 'ecliptic',
  внутренние: 'inner',
  астероиды: 'inner',
  inner: 'inner',
  снег: 'snow',
  зима: 'snow',
  snow: 'snow',
  степь: 'steppe',
  звёзды: 'steppe',
  звезды: 'steppe',
  steppe: 'steppe',
  цех: 'factory',
  завод: 'factory',
  factory: 'factory',
  светлячки: 'fireflies',
  луг: 'fireflies',
  fireflies: 'fireflies',
}

const COSMOS: SceneId[] = ['orrery', 'ecliptic', 'inner']
const isCosmos = (id: SceneId): id is CosmosId => COSMOS.includes(id)

function look(id: SceneId): ThemeSetArgs {
  const p = PALETTES[id]
  const { theme } = makeColors({
    label: TITLES[id],
    id: `tair-${id}`,
    only: 'dark',
    roles: p.roles,
    dark: { gray: { anchors: p.anchors } },
  })
  // The app frosts its panels over the backdrop (default: blur 16, 60% tint),
  // which hides most of a scene under the chat. Space gets a thin veil so the
  // Sun and planets show through; the others a lighter frost than default.
  const glass = isCosmos(id)
    ? { blur: 2, tint: p.anchors['surface-0'], opacity: 0.36 }
    : { blur: 6, tint: p.anchors['surface-0'], opacity: 0.45 }
  return { colors: theme, backdrop: { scene: id, glass }, overrideColorScheme: 'dark' }
}

type Engine = EngineInterface

// Space scenes get a sound; an older build refuses a theme with sound, so
// fall back to the same look without it.
async function setLook($: Engine, id: SceneId) {
  const base = look(id)
  if (isCosmos(id)) {
    try {
      return await $.theme.set({ ...base, sound: SPACE_SOUND })
    } catch {
      // fall through
    }
  }
  return $.theme.set(base)
}

const REAL = 365.25 * 86400
// What a click on the bare backdrop cycles through: seconds per Earth year.
const SPEEDS = [30, 8, 120, REAL]
const speedLabel = (sec: number) => (sec >= REAL ? 'реальное время' : `год = ${sec} с`)

// Module state: rebuilt from $.store and $.session.usage() on every (re)load.
let current: SceneId = 'ecliptic'
let livePercent = 0
let preview: number | null = null
let drawnBucket = -1
// Simulated time for the space scenes: starts at the real date, then one
// Earth year passes every `yearSec` seconds.
let yearSec = 30
let simAnchorMs = 0 // wall clock when the anchor was taken
let simAnchorDays = 0 // simulated days since J2000 at that moment

const fillNow = () => (preview ?? livePercent) / 100
// Redraw in 5% steps, so the scene isn't rebuilt on every token.
const bucket = () => Math.round((preview ?? livePercent) / 5)
const simDays = (nowMs: number) => simAnchorDays + ((nowMs - simAnchorMs) / 1000 / yearSec) * 365.25

function statusLine(nowMs: number): string {
  const days = simDays(nowMs)
  const halley = halleyYearsToPerihelion(days)
  return `☉ ${simDate(days)} · ${speedLabel(yearSec)} · комета Галлея у Солнца через ${halley < 1 ? Math.round(halley * 12) + ' мес.' : halley.toFixed(1) + ' лет'}`
}

function setSpeed(nowMs: number, sec: number) {
  simAnchorDays = simDays(nowMs)
  simAnchorMs = nowMs
  yearSec = sec
}

function simDate(days: number): string {
  const d = new Date(Date.UTC(2000, 0, 1, 12) + days * 86400000)
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('scene')
    if (typeof saved === 'string' && (SCENES as string[]).includes(saved)) current = saved as SceneId
    const savedYear = await $.store.get('yearSec')
    if (typeof savedYear === 'number' && savedYear >= 2 && savedYear <= REAL) yearSec = savedYear
    const now = await $.clock.now()
    simAnchorMs = now
    simAnchorDays = daysSinceJ2000(now)
    const usage = await $.session.usage()
    livePercent = usage.context.percent ?? 0

    await $.command.register({
      name: 'tema',
      description:
        'Фон: /tema [космос|сбоку|внутренние|снег|степь|цех|светлячки] [0-100 — как при таком заполнении] [год N|реальное — секунд на земной год] [сегодня|авто|выкл]',
    })
    const set = await setLook($, current)
    if (!set.isDrawn) $.ui.status(set.reason)
    else if (isCosmos(current)) $.ui.status(statusLine(now))
    // Every few seconds: follow a scene or speed chosen in another chat (the
    // store is shared by every session), and keep the status line's date fresh.
    $.clock.every(4000, async () => {
      const now = await $.clock.now()
      const scene = await $.store.get('scene')
      if (typeof scene === 'string' && scene !== current && (SCENES as string[]).includes(scene)) {
        current = scene as SceneId
        await setLook($, current)
        $.ui.invalidate('ui.render')
        if (!isCosmos(current)) $.ui.status(undefined)
      }
      const year = await $.store.get('yearSec')
      if (typeof year === 'number' && year !== yearSec && year >= 2 && year <= REAL) {
        setSpeed(now, year)
        $.ui.invalidate('ui.render')
      }
      if (isCosmos(current)) $.ui.status(statusLine(now))
    })

    return next(e)
  })

  on('session.measure', ($, e, next) => {
    livePercent = e.context.percent ?? livePercent
    if (preview === null && bucket() !== drawnBucket) $.ui.invalidate('ui.render')
    return next(e)
  })

  on('command.run', { command: 'tema' }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const now = await $.clock.now()
    let picked: SceneId | null = null
    const notes: string[] = []

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const num = Number(word.replace('%', ''))
      if (NAMES[word]) picked = NAMES[word]
      else if (word === 'выкл' || word === 'off') {
        await $.theme.clear()
        return { text: 'Тема выключена. Вернуть: /tema', isTextDisplayOnly: true }
      } else if (word === 'авто' || word === 'auto') preview = null
      else if (word === 'сегодня' || word === 'today') {
        simAnchorMs = now
        simAnchorDays = daysSinceJ2000(now)
      } else if (word === 'год' || word === 'year') {
        const sec = Number(words[i + 1])
        i++
        const w = words[i] ?? ''
        const want = w.startsWith('реал') || w === 'real' ? REAL : sec
        if (Number.isFinite(want) && want >= 2 && want <= REAL) {
          setSpeed(now, want)
          await $.store.set('yearSec', yearSec)
        } else notes.push('после «год» нужно число секунд (от 2) или «реальное»')
      } else if (Number.isFinite(num) && num >= 0 && num <= 100) preview = num
      else notes.push(`не понял «${word}»`)
    }
    if (words.length === 0) picked = SCENES[(SCENES.indexOf(current) + 1) % SCENES.length]

    if (picked !== null) {
      current = picked
      await $.store.set('scene', current)
      await setLook($, current)
    }
    $.ui.invalidate('ui.render')
    $.ui.status(isCosmos(current) ? statusLine(now) : undefined)

    const fillText =
      preview === null
        ? `заполнение контекста ${Math.round(livePercent)}%`
        : `как при ${preview}% контекста (живое: /tema авто)`
    const spaceText = isCosmos(current)
      ? ` ${speedLabel(yearSec)}, на «часах» системы ${simDate(simDays(now))}. Клик по свободному фону меняет скорость.`
      : ''
    const others = SCENES.filter(id => id !== current)
      .map(id => TITLES[id])
      .join(', ')
    return {
      text: `${TITLES[current]} — ${fillText}.${spaceText}${notes.length ? ' ' + notes.join('; ') + '.' : ''} Ещё: ${others}.`,
      isTextDisplayOnly: true,
    }
  })

  // A click on the bare backdrop of a space scene cycles the speed of time.
  on('ui.pointer', async ($, e, next) => {
    if ((COSMOS as string[]).includes(e.scene)) {
      const now = await $.clock.now()
      const at = SPEEDS.indexOf(yearSec)
      setSpeed(now, SPEEDS[(at + 1) % SPEEDS.length])
      await $.store.set('yearSec', yearSec)
      $.ui.invalidate('ui.render')
      $.ui.status(statusLine(now))
      $.ui.toast(`Скорость: ${speedLabel(yearSec)}`)
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    if (e.props.plugin !== PLUGIN) return next(e)
    const id = (SCENES as string[]).includes(e.props.scene) ? (e.props.scene as SceneId) : current
    drawnBucket = bucket()
    const { Svg } = $.ui.resolve(e)
    if (isCosmos(id)) {
      const now = await $.clock.now()
      const source = cosmosSvg(id, { fill: fillNow(), days: simDays(now), yearSec })
      return Svg({ source, alt: COSMOS_ALT[id], isInteractive: true })
    }
    return Svg({ source: sceneSvg(id as Exclude<SceneId, CosmosId>, fillNow()), alt: ALT[id as Exclude<SceneId, CosmosId>], isInteractive: true })
  })
}
