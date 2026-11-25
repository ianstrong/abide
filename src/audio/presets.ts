import { LAYER_DEFAULTS } from './recipes'
import {
  DEFAULT_EFFECTS,
  type EffectsSettings,
  type LayerSettings,
  type LayerType,
  type Preset,
} from './types'

function layer(
  id: string,
  type: LayerType,
  extra: Partial<LayerSettings> = {},
): LayerSettings {
  return { id, ...LAYER_DEFAULTS[type], ...extra, type }
}

function preset(
  id: string,
  name: string,
  category: string,
  description: string,
  layers: LayerSettings[],
  effects: Partial<EffectsSettings>,
): Preset {
  return {
    id,
    name,
    category,
    description,
    builtin: true,
    layers,
    master: 0.5,
    effects: { ...DEFAULT_EFFECTS, ...effects },
  }
}

export const STARTER_PRESETS: Preset[] = [
  preset(
    'warm-worship',
    'Warm Worship Pad',
    'Worship',
    'A rounded synth pad. Soft saw warmth under a steady tone.',
    [layer('warm-worship-a', 'worship', { volume: 0.78, cutoff: 980 })],
    { reverb: 0.62, delay: 0.04, lowpass: 1800, highpass: 48, width: 0.42, attack: 4.2, release: 7 },
  ),
  preset(
    'deep-atmosphere',
    'Deep Atmosphere',
    'Atmosphere',
    'Just the low organ tone. Slow, still, and close.',
    [layer('deep-a', 'drone', { volume: 0.8, cutoff: 480 })],
    { reverb: 0.5, delay: 0.02, lowpass: 780, highpass: 40, width: 0.2, attack: 6.5, release: 9 },
  ),
  preset(
    'soft-piano',
    'Soft Piano Pad',
    'Keys',
    'A soft bell tone with a felt attack. Much drier than the pads.',
    [layer('piano-a', 'piano', { volume: 0.74, attack: 0.9, release: 4.2, cutoff: 2200 })],
    { reverb: 0.38, delay: 0.03, lowpass: 2600, highpass: 70, width: 0.24, attack: 1.6, release: 4.5 },
  ),
  preset(
    'ethereal-choir',
    'Ethereal Choir',
    'Choir',
    'A hummed oo vowel. Low and warm, not a whisper.',
    [layer('choir-a', 'choir', { volume: 0.72, cutoff: 1500 })],
    { reverb: 0.74, delay: 0.04, lowpass: 2000, highpass: 90, width: 0.48, attack: 3.6, release: 7.5 },
  ),
  preset(
    'cinematic-worship',
    'Cinematic Worship',
    'Cinematic',
    'The pad slowly opens and closes. You can hear the filter breathe.',
    [layer('cine-a', 'cinematic', { volume: 0.74, cutoff: 1300 })],
    { reverb: 0.66, delay: 0.05, lowpass: 1900, highpass: 52, width: 0.5, attack: 5, release: 8 },
  ),
  preset(
    'ambient-strings',
    'Ambient Strings',
    'Strings',
    'A soft bowed tone. Brighter than the worship pad, still rounded.',
    [layer('str-a', 'strings', { volume: 0.74, cutoff: 1750, attack: 4.6 })],
    { reverb: 0.55, delay: 0.03, lowpass: 2400, highpass: 80, width: 0.46, attack: 4.4, release: 7 },
  ),
  preset(
    'heavenly',
    'Heavenly Atmosphere',
    'Atmosphere',
    'Choir and soft piano together. The brightest of the set.',
    [
      layer('heav-a', 'choir', { volume: 0.48, cutoff: 1700 }),
      layer('heav-b', 'piano', { volume: 0.42, attack: 1.4, release: 5, cutoff: 2400 }),
    ],
    { reverb: 0.68, delay: 0.04, lowpass: 2800, highpass: 80, width: 0.46, attack: 2.8, release: 6.5 },
  ),
  preset(
    'dark-drone',
    'Dark Drone',
    'Drone',
    'A low sine with a muffled analog pulse underneath.',
    [
      layer('dark-a', 'drone', { volume: 0.7, cutoff: 420 }),
      layer('dark-b', 'analog', { volume: 0.28, cutoff: 480, attack: 5 }),
    ],
    { reverb: 0.42, delay: 0.02, lowpass: 700, highpass: 36, width: 0.18, attack: 6.5, release: 9 },
  ),
]

export function clonePreset(preset: Preset): Pick<Preset, 'layers' | 'effects' | 'master'> {
  return {
    master: preset.master,
    effects: { ...preset.effects },
    layers: preset.layers.map((item) => ({ ...item })),
  }
}
