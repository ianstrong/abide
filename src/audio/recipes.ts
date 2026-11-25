import type { LayerSettings, LayerType } from './types'

export interface OscSpec {
  type: OscillatorType
  semi: number
  detune: number
  gain: number
  pan: number
}

export interface Recipe {
  oscs: OscSpec[]
  /** Extra sine one octave under the lowest chord tone only. */
  sub: number
  noise: number
  hammer: number
  filterQ: number
  lfoRate: number
  lfoDepth: number
  /** Shared pitch movement, in cents. Kept at 0 so stacked layers do not beat. */
  vibrato: number
  vibratoRate: number
  formant: boolean
  drive: boolean
  tremolo: number
}

const tone = (
  type: OscillatorType,
  detune: number,
  pan: number,
  gain: number,
  semi = 0,
): OscSpec => ({ type, semi, detune, gain, pan })

const calm = {
  noise: 0,
  hammer: 0,
  filterQ: 0.45,
  lfoRate: 0.04,
  lfoDepth: 24,
  vibrato: 0,
  vibratoRate: 0.6,
  formant: false,
  drive: false,
  tremolo: 0,
  sub: 0,
} as const

export const RECIPES: Record<LayerType, Recipe> = {
  worship: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.28), tone('sawtooth', 0, 0, 0.14)],
    sub: 0.16,
    lfoDepth: 48,
  },
  piano: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.4), tone('sine', 0, 0, 0.09, 12)],
    hammer: 0.04,
    lfoDepth: 0,
    filterQ: 0.3,
  },
  cinematic: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.2), tone('sawtooth', 0, 0, 0.16)],
    sub: 0.1,
    lfoRate: 0.07,
    lfoDepth: 160,
  },
  analog: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.3), tone('square', 0, 0, 0.07)],
    sub: 0.14,
    lfoDepth: 30,
  },
  choir: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.26), tone('sawtooth', 0, 0, 0.06)],
    formant: true,
    lfoDepth: 18,
  },
  drone: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.4, -12), tone('sine', 0, 0, 0.14)],
    lfoDepth: 12,
  },
  strings: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.18), tone('triangle', 0, 0, 0.16), tone('sawtooth', 0, 0, 0.05)],
    lfoDepth: 36,
  },
  evolving: {
    ...calm,
    oscs: [tone('sine', 0, 0, 0.22), tone('triangle', 0, 0, 0.1)],
    noise: 0.006,
    lfoRate: 0.05,
    lfoDepth: 70,
  },
}

export const LAYER_DEFAULTS: Record<LayerType, Omit<LayerSettings, 'id'>> = {
  worship: {
    type: 'worship',
    name: 'Worship Pad',
    enabled: true,
    volume: 0.7,
    attack: 4.2,
    release: 7,
    reverb: 0.62,
    delay: 0.06,
    width: 0.55,
    cutoff: 980,
  },
  piano: {
    type: 'piano',
    name: 'Soft Piano',
    enabled: true,
    volume: 0.62,
    attack: 1.1,
    release: 4.5,
    reverb: 0.42,
    delay: 0.04,
    width: 0.28,
    cutoff: 2100,
  },
  cinematic: {
    type: 'cinematic',
    name: 'Cinematic',
    enabled: true,
    volume: 0.6,
    attack: 5.5,
    release: 8,
    reverb: 0.7,
    delay: 0.08,
    width: 0.62,
    cutoff: 1400,
  },
  analog: {
    type: 'analog',
    name: 'Analog Pad',
    enabled: true,
    volume: 0.58,
    attack: 3.5,
    release: 6.5,
    reverb: 0.5,
    delay: 0.05,
    width: 0.4,
    cutoff: 640,
  },
  choir: {
    type: 'choir',
    name: 'Ethereal Choir',
    enabled: true,
    volume: 0.58,
    attack: 3.8,
    release: 7.5,
    reverb: 0.78,
    delay: 0.06,
    width: 0.6,
    cutoff: 1600,
  },
  drone: {
    type: 'drone',
    name: 'Deep Drone',
    enabled: true,
    volume: 0.66,
    attack: 6.5,
    release: 9,
    reverb: 0.55,
    delay: 0.04,
    width: 0.22,
    cutoff: 520,
  },
  strings: {
    type: 'strings',
    name: 'Strings',
    enabled: true,
    volume: 0.55,
    attack: 4.8,
    release: 7.5,
    reverb: 0.58,
    delay: 0.05,
    width: 0.58,
    cutoff: 1700,
  },
  evolving: {
    type: 'evolving',
    name: 'Evolving Air',
    enabled: true,
    volume: 0.52,
    attack: 5,
    release: 8,
    reverb: 0.66,
    delay: 0.06,
    width: 0.5,
    cutoff: 1200,
  },
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
}
