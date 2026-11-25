import { create } from 'zustand'
import { engine } from '../audio/engine'
import { clonePreset, STARTER_PRESETS } from '../audio/presets'
import { LAYER_DEFAULTS, uid } from '../audio/recipes'
import { chordMidis, isChordId, type ChordId } from '../audio/theory'
import {
  DEFAULT_EFFECTS,
  isLayerType,
  MAX_LAYERS,
  type EffectsSettings,
  type EngineMode,
  type EngineSnapshot,
  type LayerSettings,
  type LayerType,
  type Preset,
} from '../audio/types'

const PRESET_KEY = 'waps-custom-presets'
const SESSION_KEY = 'waps-session-v5'

interface Session {
  v: 1
  keyIndex: number
  chordId: ChordId
  transpose: number
  master: number
  effects: EffectsSettings
  layers: LayerSettings[]
  activePresetId: string
}

interface Studio {
  keyIndex: number
  chordId: ChordId
  transpose: number
  master: number
  effects: EffectsSettings
  layers: LayerSettings[]
  activePresetId: string
  dirty: boolean
  customPresets: Preset[]
  status: EngineMode
  playing: boolean
  settingsOpen: boolean
  toast: string | null
  setKey: (index: number) => void
  setChord: (id: ChordId) => void
  setTranspose: (value: number) => void
  setMaster: (value: number) => void
  setEffects: (partial: Partial<EffectsSettings>) => void
  setLayer: (id: string, partial: Partial<LayerSettings>) => void
  addLayer: (type: LayerType) => void
  removeLayer: (id: string) => void
  loadPreset: (id: string) => void
  savePreset: (name: string) => void
  renamePreset: (id: string, name: string) => void
  deletePreset: (id: string) => void
  play: () => Promise<void>
  stop: () => void
  fadeIn: () => Promise<void>
  fadeOut: () => void
  mute: () => void
  setSettingsOpen: (open: boolean) => void
  resetFactory: () => void
  clearCustom: () => void
  dismissToast: () => void
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function isLayer(value: unknown): value is LayerSettings {
  if (!value || typeof value !== 'object') return false
  const layer = value as LayerSettings
  return typeof layer.id === 'string' && isLayerType(layer.type) && typeof layer.volume === 'number'
}

function loadCustom(): Preset[] {
  const parsed = readJSON<Preset[]>(PRESET_KEY)
  if (!Array.isArray(parsed)) return []
  return parsed.filter((preset) => preset && typeof preset.name === 'string' && Array.isArray(preset.layers)).map((preset) => ({
    ...preset,
    builtin: false,
    category: preset.category || 'Custom',
    description: preset.description || 'Saved on this device.',
    effects: { ...DEFAULT_EFFECTS, ...preset.effects },
    layers: preset.layers.filter(isLayer),
  }))
}

function allPresets(custom: Preset[]) {
  return [...STARTER_PRESETS, ...custom]
}

function initialSound() {
  const custom = loadCustom()
  const session = readJSON<Session>(SESSION_KEY)
  const fallback = STARTER_PRESETS[0]
  if (
    session &&
    session.v === 1 &&
    isChordId(session.chordId) &&
    Array.isArray(session.layers) &&
    session.layers.every(isLayer) &&
    session.layers.length > 0
  ) {
    return {
      custom,
      keyIndex: Math.min(11, Math.max(0, session.keyIndex)),
      chordId: session.chordId,
      transpose: Math.min(6, Math.max(-6, session.transpose)),
      master: session.master,
      effects: { ...DEFAULT_EFFECTS, ...session.effects },
      layers: session.layers,
      activePresetId: session.activePresetId || fallback.id,
    }
  }
  const sound = clonePreset(fallback)
  return {
    custom,
    keyIndex: 7,
    chordId: 'major' as ChordId,
    transpose: 0,
    master: sound.master,
    effects: sound.effects,
    layers: sound.layers,
    activePresetId: fallback.id,
  }
}

const boot = initialSound()

let sessionTimer = 0
let toastTimer = 0

function persistSession(state: Studio) {
  window.clearTimeout(sessionTimer)
  const payload: Session = {
    v: 1,
    keyIndex: state.keyIndex,
    chordId: state.chordId,
    transpose: state.transpose,
    master: state.master,
    effects: state.effects,
    layers: state.layers,
    activePresetId: state.activePresetId,
  }
  sessionTimer = window.setTimeout(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  }, 180)
}

function persistCustom(presets: Preset[]) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
}

function snapshot(state: Pick<Studio, 'master' | 'effects' | 'layers' | 'keyIndex' | 'chordId' | 'transpose'>): EngineSnapshot {
  return {
    master: state.master,
    effects: state.effects,
    layers: state.layers,
    midis: chordMidis(state.keyIndex, state.chordId, state.transpose),
  }
}

export const useStudio = create<Studio>((set, get) => {
  const push = (partial: Partial<Studio>, dirty = true) => {
    set({ ...partial, dirty })
    const next = get()
    engine.update(snapshot(next))
    persistSession(next)
  }

  const toast = (message: string) => {
    window.clearTimeout(toastTimer)
    set({ toast: message })
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600)
  }

  return {
    keyIndex: boot.keyIndex,
    chordId: boot.chordId,
    transpose: boot.transpose,
    master: boot.master,
    effects: boot.effects,
    layers: boot.layers,
    activePresetId: boot.activePresetId,
    dirty: false,
    customPresets: boot.custom,
    status: 'silent',
    playing: false,
    settingsOpen: false,
    toast: null,
    setKey: (keyIndex) => push({ keyIndex }),
    setChord: (chordId) => push({ chordId }),
    setTranspose: (transpose) => push({ transpose: Math.min(6, Math.max(-6, transpose)) }),
    setMaster: (master) => push({ master }),
    setEffects: (partial) => push({ effects: { ...get().effects, ...partial } }),
    setLayer: (id, partial) =>
      push({
        layers: get().layers.map((layer) => (layer.id === id ? { ...layer, ...partial } : layer)),
      }),
    addLayer: (type) => {
      if (get().layers.length >= MAX_LAYERS) {
        toast(`Four layers is the limit, so the pad stays smooth.`)
        return
      }
      const base = LAYER_DEFAULTS[type]
      push({
        layers: [...get().layers, { ...base, id: uid(type) }],
      })
    },
    removeLayer: (id) => {
      if (get().layers.length <= 1) {
        toast('Keep at least one layer.')
        return
      }
      push({ layers: get().layers.filter((layer) => layer.id !== id) })
    },
    loadPreset: (id) => {
      const preset = allPresets(get().customPresets).find((item) => item.id === id)
      if (!preset) return
      const sound = clonePreset(preset)
      push(
        {
          activePresetId: preset.id,
          layers: sound.layers,
          effects: sound.effects,
        },
        false,
      )
    },
    savePreset: (name) => {
      const trimmed = name.trim().slice(0, 40)
      if (!trimmed) return
      const current = get()
      if (current.customPresets.length >= 24) {
        toast('Delete a saved preset before adding another.')
        return
      }
      const preset: Preset = {
        id: uid('custom'),
        name: trimmed,
        category: 'Custom',
        builtin: false,
        description: 'Saved on this device.',
        layers: current.layers.map((layer) => ({ ...layer, id: uid(layer.type) })),
        effects: { ...current.effects },
        master: current.master,
      }
      const customPresets = [...current.customPresets, preset]
      persistCustom(customPresets)
      push({ customPresets, activePresetId: preset.id }, false)
      toast(`Saved “${trimmed}”.`)
    },
    renamePreset: (id, name) => {
      const trimmed = name.trim().slice(0, 40)
      if (!trimmed) return
      const customPresets = get().customPresets.map((preset) =>
        preset.id === id ? { ...preset, name: trimmed } : preset,
      )
      persistCustom(customPresets)
      set({ customPresets })
    },
    deletePreset: (id) => {
      const removed = get().customPresets.find((preset) => preset.id === id)
      const customPresets = get().customPresets.filter((preset) => preset.id !== id)
      persistCustom(customPresets)
      const activePresetId = get().activePresetId === id ? '' : get().activePresetId
      set({ customPresets, activePresetId })
      persistSession(get())
      toast(removed ? `Deleted “${removed.name}”.` : 'Custom preset deleted.')
    },
    play: async () => {
      try {
        await engine.play(snapshot(get()))
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Audio could not start.')
      }
    },
    stop: () => engine.stop(),
    fadeIn: async () => {
      try {
        await engine.fadeIn(snapshot(get()))
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Audio could not start.')
      }
    },
    fadeOut: () => engine.fadeOut(),
    mute: () => engine.mute(),
    setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    resetFactory: () => {
      const sound = clonePreset(STARTER_PRESETS[0])
      localStorage.removeItem(SESSION_KEY)
      push(
        {
          keyIndex: 7,
          chordId: 'major',
          transpose: 0,
          master: sound.master,
          effects: sound.effects,
          layers: sound.layers,
          activePresetId: STARTER_PRESETS[0].id,
        },
        false,
      )
      toast('Reset to Warm Worship Pad in G.')
    },
    clearCustom: () => {
      const activeIsBuiltin = STARTER_PRESETS.some((preset) => preset.id === get().activePresetId)
      persistCustom([])
      set({ customPresets: [], activePresetId: activeIsBuiltin ? get().activePresetId : '' })
      persistSession(get())
      toast('Custom presets deleted.')
    },
    dismissToast: () => set({ toast: null }),
  }
})

engine.subscribe((status) => {
  useStudio.setState({
    status,
    playing: status === 'live' || status === 'fading-in' || status === 'fading-out',
  })
})

export function presetList(custom: Preset[]) {
  return allPresets(custom)
}
