export const LAYER_TYPES = [
  'worship',
  'piano',
  'cinematic',
  'analog',
  'choir',
  'drone',
  'strings',
  'evolving',
] as const

export type LayerType = (typeof LAYER_TYPES)[number]

export interface LayerSettings {
  id: string
  type: LayerType
  name: string
  enabled: boolean
  volume: number
  attack: number
  release: number
  reverb: number
  delay: number
  width: number
  cutoff: number
}

export interface EffectsSettings {
  reverb: number
  delay: number
  lowpass: number
  highpass: number
  width: number
  attack: number
  release: number
  fade: number
}

export interface Preset {
  id: string
  name: string
  category: string
  builtin: boolean
  description: string
  layers: LayerSettings[]
  effects: EffectsSettings
  master: number
}

export interface EngineSnapshot {
  master: number
  effects: EffectsSettings
  layers: LayerSettings[]
  midis: number[]
}

export type EngineMode =
  | 'silent'
  | 'live'
  | 'fading-in'
  | 'fading-out'
  | 'releasing'
  | 'muted'

export const BASE_ATTACK = 5.5
export const BASE_RELEASE = 8
export const MAX_LAYERS = 4

export const DEFAULT_EFFECTS: EffectsSettings = {
  reverb: 0.82,
  delay: 0.14,
  lowpass: 1400,
  highpass: 46,
  width: 0.62,
  attack: BASE_ATTACK,
  release: BASE_RELEASE,
  fade: 8,
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function effectiveAttack(layerAttack: number, globalAttack: number) {
  return clamp(layerAttack * (globalAttack / BASE_ATTACK), 0.08, 12)
}

export function effectiveRelease(layerRelease: number, globalRelease: number) {
  return clamp(layerRelease * (globalRelease / BASE_RELEASE), 0.12, 16)
}

export function isLayerType(value: string): value is LayerType {
  return (LAYER_TYPES as readonly string[]).includes(value)
}
