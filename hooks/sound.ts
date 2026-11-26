import type { ThemeSound } from 'claude-code'

// A quiet space ambience: a low filtered rumble, a soft deep fifth, and now and
// then a distant bell. Cues are short and soft. Numbers only; the app makes it.
export const SPACE_SOUND: ThemeSound = {
  ambience: {
    layers: [
      { wave: 'brown', drone: true, gain: 0.16, filter: { type: 'lowpass', hz: 260, to: 520 }, tremolo: { hz: 0.05, depth: 0.3 } },
      { wave: 'sine', drone: true, notes: ['A1', 'E2'], gain: 0.1, tremolo: { hz: 0.07, depth: 0.4 } },
      { wave: 'bell', notes: ['E5', 'A5', 'B5', 'E6', 'C#6'], scatter: 0.05, gain: 0.07, attack: 0.2, release: 3 },
    ],
    reverb: 0.6,
  },
  cues: {
    send: { layers: [{ wave: 'sine', notes: ['A5'], glide: -3, gain: 0.12, release: 0.35 }] },
    done: { layers: [{ wave: 'bell', notes: ['A4', 'E5'], step: 0.18, gain: 0.22, release: 1.4 }], reverb: 0.5 },
    ask: { layers: [{ wave: 'sine', notes: ['E5', 'A5'], step: 0.12, gain: 0.18, release: 0.6 }] },
    error: { layers: [{ wave: 'triangle', notes: ['E3', 'C3'], step: 0.2, gain: 0.18, release: 0.6 }] },
    compact: { layers: [{ wave: 'pink', gain: 0.14, attack: 0.3, release: 1.2, filter: { type: 'bandpass', hz: 900, to: 200 } }] },
    click: { layers: [{ wave: 'bell', notes: ['A4', 'C#5', 'E5', 'A5', 'C#6'], gain: 0.18, release: 1.2 }], reverb: 0.5 },
  },
}
