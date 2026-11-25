import { RECIPES } from './recipes'
import { midiToFreq } from './theory'
import {
  effectiveAttack,
  effectiveRelease,
  type EffectsSettings,
  type EngineMode,
  type EngineSnapshot,
  type LayerSettings,
} from './types'

interface Voice {
  env: GainNode
  bus: GainNode
  oscs: OscillatorNode[]
  extras: AudioScheduledSourceNode[]
  pans: StereoPannerNode[]
  basePans: number[]
}

interface LayerRuntime {
  id: string
  settings: LayerSettings
  filter: BiquadFilterNode
  smooth: BiquadFilterNode
  gain: GainNode
  rev: GainNode
  del: GainNode
  wide: GainNode
  lfo: OscillatorNode
  depth: GainNode
  voices: Map<number, Voice>
}

const MASTER_CEILING = 0.5

function makeImpulse(ctx: AudioContext) {
  const seconds = 3.1
  const rate = ctx.sampleRate
  const length = Math.floor(rate * seconds)
  const buffer = ctx.createBuffer(2, length, rate)
  const fadeIn = Math.floor(rate * 0.05)
  const fadeOut = Math.floor(rate * 0.1)
  const pole = Math.exp((-2 * Math.PI * 720) / rate)

  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    let a = 0
    let b = 0
    let mean = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      a = a * pole + white * (1 - pole)
      b = b * pole + a * (1 - pole)
      const attack = Math.min(1, i / fadeIn)
      const decay = Math.exp((-4.2 * i) / length)
      data[i] = b * attack * decay
      mean += data[i]
    }
    mean /= length
    let peak = 0
    for (let i = 0; i < length; i += 1) {
      data[i] -= mean
      peak = Math.max(peak, Math.abs(data[i]))
    }
    const scale = peak > 0 ? 0.2 / peak : 1
    for (let i = 0; i < length; i += 1) data[i] *= scale
    for (let i = 0; i < fadeOut; i += 1) data[length - 1 - i] *= i / fadeOut
  }

  return buffer
}

function makeNoise(ctx: AudioContext) {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let brown = 0
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1
    brown = brown * 0.98 + white * 0.02
    data[i] = brown * 3.2
  }
  return buffer
}

function makeDrive() {
  const size = 512
  const curve = new Float32Array(size)
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1
    curve[i] = Math.tanh(x * 1.6)
  }
  return curve
}

/**
 * One AudioContext for the life of the page.
 * Layers sum into a shared high-pass, low-pass, reverb, and delay.
 * Chord changes only release notes that left the chord; common tones keep ringing.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sum: GainNode | null = null
  private hp: BiquadFilterNode | null = null
  private lp: BiquadFilterNode | null = null
  private delayFeedback: GainNode | null = null
  private reverbIn: GainNode | null = null
  private delayIn: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private noise: AudioBuffer | null = null
  private driveCurve: Float32Array | null = null
  private layers = new Map<string, LayerRuntime>()
  private snapshot: EngineSnapshot | null = null
  private playing = false
  private mode: EngineMode = 'silent'
  private timer = 0
  private fadeEnd = 0
  private listener: ((mode: EngineMode) => void) | null = null

  subscribe(listener: (mode: EngineMode) => void) {
    this.listener = listener
  }

  getMode() {
    return this.mode
  }

  analyserNode() {
    return this.analyser
  }

  debug() {
    let voices = 0
    let oscs = 0
    this.layers.forEach((layer) => {
      voices += layer.voices.size
      layer.voices.forEach((voice) => {
        oscs += voice.oscs.length
      })
    })
    return {
      state: this.ctx?.state ?? 'none',
      voices,
      oscs,
      layers: this.layers.size,
      playing: this.playing,
      mode: this.mode,
    }
  }

  update(snapshot: EngineSnapshot) {
    this.snapshot = snapshot
    if (!this.ctx) return
    this.applyEffects(snapshot.effects)
    this.applyMaster(snapshot.master)
    this.syncLayers()
  }

  async play(snapshot: EngineSnapshot) {
    this.ensure()
    const ctx = this.ctx
    if (!ctx) return
    if (ctx.state !== 'running') await ctx.resume()
    this.clearTimer()
    this.snapshot = snapshot
    this.playing = true
    this.mode = 'live'
    this.applyEffects(snapshot.effects)
    this.rampMaster(this.level(snapshot.master), 0.08)
    this.syncLayers()
    this.emit()
  }

  async fadeIn(snapshot: EngineSnapshot) {
    this.ensure()
    const ctx = this.ctx
    if (!ctx) return
    if (ctx.state !== 'running') await ctx.resume()
    this.clearTimer()
    this.snapshot = snapshot
    this.playing = true
    this.mode = 'fading-in'
    this.applyEffects(snapshot.effects)
    const seconds = Math.max(0.4, snapshot.effects.fade)
    const now = ctx.currentTime
    this.fadeEnd = now + seconds
    const gain = this.master!.gain
    gain.cancelScheduledValues(now)
    gain.setValueAtTime(0.0001, now)
    gain.linearRampToValueAtTime(this.level(snapshot.master), this.fadeEnd)
    this.syncLayers()
    this.emit()
    this.timer = window.setTimeout(() => {
      if (this.mode === 'fading-in' && this.playing) {
        this.mode = 'live'
        this.emit()
      }
    }, seconds * 1000)
  }

  stop() {
    if (!this.ctx) {
      this.mode = 'silent'
      this.emit()
      return
    }
    this.clearTimer()
    const release = this.longestRelease()
    this.playing = false
    this.releaseAll(release)
    this.mode = 'releasing'
    this.emit()
    this.timer = window.setTimeout(() => {
      if (!this.playing) {
        this.mode = 'silent'
        this.emit()
      }
    }, release * 1000)
  }

  fadeOut() {
    if (!this.ctx || !this.playing || !this.snapshot) return
    this.clearTimer()
    const seconds = Math.max(0.4, this.snapshot.effects.fade)
    this.mode = 'fading-out'
    this.fadeEnd = this.ctx.currentTime + seconds
    this.rampMaster(0.0001, seconds)
    this.emit()
    this.timer = window.setTimeout(() => {
      this.playing = false
      this.releaseAll(0.05)
      window.setTimeout(() => {
        if (!this.playing && this.ctx && this.snapshot) {
          this.master?.gain.setValueAtTime(this.level(this.snapshot.master), this.ctx.currentTime)
          this.mode = 'silent'
          this.emit()
        }
      }, 90)
    }, seconds * 1000)
  }

  mute() {
    this.clearTimer()
    if (!this.ctx) {
      this.playing = false
      this.mode = 'muted'
      this.emit()
      return
    }
    this.playing = false
    this.releaseAll(0.06)
    this.rampMaster(0.0001, 0.05)
    this.mode = 'muted'
    this.emit()
    window.setTimeout(() => {
      if (!this.playing && this.ctx && this.snapshot && this.mode === 'muted') {
        this.master?.gain.setValueAtTime(this.level(this.snapshot.master), this.ctx.currentTime)
      }
    }, 120)
  }

  private emit() {
    this.listener?.(this.mode)
  }

  private clearTimer() {
    if (this.timer) {
      window.clearTimeout(this.timer)
      this.timer = 0
    }
  }

  private level(master: number) {
    return Math.max(0, Math.min(1, master)) * MASTER_CEILING
  }

  private ensure() {
    if (this.ctx) return
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    this.noise = makeNoise(ctx)
    this.driveCurve = makeDrive()

    const sum = ctx.createGain()
    sum.gain.value = 1
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 46
    hp.Q.value = 0.5
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    lp.Q.value = 0.45

    const delayIn = ctx.createGain()
    const delay = ctx.createDelay(2.5)
    delay.delayTime.value = 0.34
    const damp = ctx.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 700
    const delayFeedback = ctx.createGain()
    delayFeedback.gain.value = 0.22
    delayIn.connect(delay)
    delay.connect(damp)
    damp.connect(delayFeedback)
    delayFeedback.connect(delay)
    const delayReturn = ctx.createGain()
    delayReturn.gain.value = 0.22
    damp.connect(delayReturn)

    const reverbIn = ctx.createGain()
    const predelay = ctx.createDelay(0.2)
    predelay.delayTime.value = 0.04
    const convolver = ctx.createConvolver()
    convolver.normalize = false
    convolver.buffer = makeImpulse(ctx)
    const reverbTone = ctx.createBiquadFilter()
    reverbTone.type = 'lowpass'
    reverbTone.frequency.value = 1800
    reverbTone.Q.value = 0.4
    const reverbReturn = ctx.createGain()
    reverbReturn.gain.value = 0.46
    reverbIn.connect(predelay)
    predelay.connect(convolver)
    convolver.connect(reverbTone)
    reverbTone.connect(reverbReturn)

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -16
    compressor.knee.value = 18
    compressor.ratio.value = 2
    compressor.attack.value = 0.08
    compressor.release.value = 0.55

    const master = ctx.createGain()
    master.gain.value = 0
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.86

    sum.connect(hp)
    hp.connect(lp)
    lp.connect(compressor)
    compressor.connect(master)
    reverbReturn.connect(hp)
    delayReturn.connect(hp)
    master.connect(analyser)
    analyser.connect(ctx.destination)

    this.sum = sum
    this.hp = hp
    this.lp = lp
    this.delayFeedback = delayFeedback
    this.delayIn = delayIn
    this.reverbIn = reverbIn
    this.master = master
    this.analyser = analyser
  }

  private applyEffects(effects: EffectsSettings) {
    const ctx = this.ctx
    if (!ctx || !this.hp || !this.lp || !this.delayFeedback) return
    const now = ctx.currentTime
    let high = effects.highpass
    let low = effects.lowpass
    if (high > low - 120) high = Math.max(20, low - 120)
    this.hp.frequency.setTargetAtTime(high, now, 0.06)
    this.lp.frequency.setTargetAtTime(low, now, 0.06)
    const feedback = Math.min(0.22, 0.05 + effects.delay * 0.12)
    this.delayFeedback.gain.setTargetAtTime(feedback, now, 0.08)
  }

  private applyMaster(master: number) {
    if (!this.ctx || !this.master) return
    const target = this.level(master)
    if (this.mode === 'live') {
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05)
      return
    }
    if (this.mode === 'fading-in') {
      const remaining = Math.max(0.15, this.fadeEnd - this.ctx.currentTime)
      this.rampMaster(target, remaining)
      return
    }
    if (this.mode === 'silent' || this.mode === 'muted' || this.mode === 'releasing') {
      this.master.gain.setValueAtTime(target, this.ctx.currentTime)
    }
  }

  private rampMaster(target: number, seconds: number) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(target, now + Math.max(0.02, seconds))
  }

  private syncLayers() {
    const snapshot = this.snapshot
    if (!snapshot || !this.ctx) return
    const incoming = new Map(snapshot.layers.map((layer) => [layer.id, layer]))

    for (const [id, runtime] of [...this.layers]) {
      if (!incoming.has(id)) {
        const release = this.playing
          ? effectiveRelease(runtime.settings.release, snapshot.effects.release)
          : 0.2
        this.disposeLayer(runtime, release)
      }
    }

    snapshot.layers.forEach((layer) => {
      let runtime = this.layers.get(layer.id)
      if (!runtime) runtime = this.buildLayer(layer)
      runtime.settings = layer
      this.applyLayer(runtime, snapshot.effects)
      if (this.playing && layer.enabled) this.syncNotes(runtime, snapshot)
      else this.releaseLayer(runtime)
    })
  }

  private buildLayer(layer: LayerSettings) {
    const ctx = this.ctx!
    const recipe = RECIPES[layer.type]
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = layer.cutoff
    filter.Q.value = recipe.filterQ
    const smooth = ctx.createBiquadFilter()
    smooth.type = 'lowpass'
    smooth.frequency.value = layer.cutoff
    smooth.Q.value = 0.35
    const gain = ctx.createGain()
    gain.gain.value = 0
    const rev = ctx.createGain()
    rev.gain.value = 0
    const del = ctx.createGain()
    del.gain.value = 0
    const wide = ctx.createGain()
    wide.gain.value = 0
    const left = ctx.createGain()
    const right = ctx.createGain()
    const leftPan = ctx.createStereoPanner()
    leftPan.pan.value = -0.75
    const rightPan = ctx.createStereoPanner()
    rightPan.pan.value = 0.75
    const wideDelay = ctx.createDelay(0.05)
    wideDelay.delayTime.value = 0.014
    filter.connect(smooth)
    smooth.connect(gain)
    gain.connect(this.sum!)
    gain.connect(rev)
    gain.connect(del)
    gain.connect(wide)
    wide.connect(left)
    left.connect(leftPan)
    leftPan.connect(this.sum!)
    wide.connect(wideDelay)
    wideDelay.connect(right)
    right.connect(rightPan)
    rightPan.connect(this.sum!)
    rev.connect(this.reverbIn!)
    del.connect(this.delayIn!)

    const lfo = ctx.createOscillator()
    lfo.frequency.value = recipe.lfoRate
    const depth = ctx.createGain()
    depth.gain.value = recipe.lfoDepth
    lfo.connect(depth)
    depth.connect(filter.frequency)
    depth.connect(smooth.frequency)
    lfo.start()

    const runtime: LayerRuntime = {
      id: layer.id,
      settings: layer,
      filter,
      smooth,
      gain,
      rev,
      del,
      wide,
      lfo,
      depth,
      voices: new Map(),
    }
    this.layers.set(layer.id, runtime)
    return runtime
  }

  private applyLayer(runtime: LayerRuntime, effects: EffectsSettings) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const layer = runtime.settings
    const volume = layer.enabled ? layer.volume * 0.5 : 0.0001
    runtime.filter.frequency.setTargetAtTime(layer.cutoff, now, 0.08)
    runtime.smooth.frequency.setTargetAtTime(layer.cutoff, now, 0.08)
    runtime.gain.gain.setTargetAtTime(volume, now, 0.05)
    const reverb = Math.min(1, Math.max(0, layer.reverb)) * Math.min(1, Math.max(0, effects.reverb))
    const delay = Math.min(1, Math.max(0, layer.delay)) * Math.min(1, Math.max(0, effects.delay))
    runtime.rev.gain.setTargetAtTime(reverb * 0.18, now, 0.08)
    runtime.del.gain.setTargetAtTime(delay * 0.12, now, 0.08)
    const width = Math.min(1, Math.max(0, layer.width)) * Math.min(1, Math.max(0, effects.width))
    runtime.wide.gain.setTargetAtTime(width * 0.05, now, 0.08)
    this.applyWidth(runtime, layer.width * effects.width)
  }

  private applyWidth(runtime: LayerRuntime, width: number) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    runtime.voices.forEach((voice) => {
      voice.pans.forEach((pan, index) => {
        pan.pan.setTargetAtTime(voice.basePans[index] * width, now, 0.05)
      })
    })
  }

  private syncNotes(runtime: LayerRuntime, snapshot: EngineSnapshot) {
    const wanted = new Set(snapshot.midis)
    const lowest = snapshot.midis.length ? Math.min(...snapshot.midis) : 0
    for (const midi of [...runtime.voices.keys()]) {
      if (!wanted.has(midi)) this.releaseVoice(runtime, midi)
    }
    wanted.forEach((midi) => {
      if (!runtime.voices.has(midi)) this.startVoice(runtime, midi, snapshot.effects, midi === lowest)
    })
  }

  private clampNote(midi: number) {
    let note = midi
    while (note > 76) note -= 12
    while (note < 40) note += 12
    return note
  }

  private startVoice(runtime: LayerRuntime, midi: number, effects: EffectsSettings, isBass: boolean) {
    const ctx = this.ctx
    if (!ctx) return
    const recipe = RECIPES[runtime.settings.type]
    const now = ctx.currentTime
    const attack = effectiveAttack(runtime.settings.attack, effects.attack)
    const width = runtime.settings.width * effects.width

    const bus = ctx.createGain()
    bus.gain.value = 1
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, now)
    env.gain.exponentialRampToValueAtTime(1, now + attack)

    const oscs: OscillatorNode[] = []
    const extras: AudioScheduledSourceNode[] = []
    const pans: StereoPannerNode[] = []
    const basePans: number[] = []

    recipe.oscs.forEach((spec) => {
      const osc = ctx.createOscillator()
      osc.type = spec.type
      osc.frequency.value = midiToFreq(this.clampNote(midi + spec.semi))
      osc.detune.value = 0
      const gain = ctx.createGain()
      gain.gain.value = spec.gain
      const pan = ctx.createStereoPanner()
      pan.pan.value = spec.pan * 0.4 * width
      osc.connect(gain)
      gain.connect(pan)
      pan.connect(bus)
      osc.start()
      oscs.push(osc)
      pans.push(pan)
      basePans.push(spec.pan * 0.4)
    })

    if (recipe.sub > 0 && isBass && midi - 12 >= 36) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = midiToFreq(midi - 12)
      const gain = ctx.createGain()
      gain.gain.value = recipe.sub
      osc.connect(gain)
      gain.connect(bus)
      osc.start()
      oscs.push(osc)
    }

    if (recipe.vibrato > 0 && oscs.length > 0) {
      const vibrato = ctx.createOscillator()
      vibrato.frequency.value = recipe.vibratoRate
      const amount = ctx.createGain()
      amount.gain.value = recipe.vibrato
      vibrato.connect(amount)
      oscs.forEach((osc) => amount.connect(osc.detune))
      vibrato.start()
      extras.push(vibrato)
    }

    if (recipe.noise > 0 && this.noise) {
      const source = ctx.createBufferSource()
      source.buffer = this.noise
      source.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 640
      filter.Q.value = 0.4
      const gain = ctx.createGain()
      gain.gain.value = recipe.noise
      const pan = ctx.createStereoPanner()
      pan.pan.value = 0.2 * width
      source.connect(filter)
      filter.connect(gain)
      gain.connect(pan)
      pan.connect(bus)
      source.start()
      extras.push(source)
      pans.push(pan)
      basePans.push(0.2)
    }

    let tail: AudioNode = bus
    if (recipe.formant) tail = this.formants(bus)
    if (recipe.drive && this.driveCurve) {
      const shaper = ctx.createWaveShaper()
      shaper.curve = this.driveCurve
      shaper.oversample = '2x'
      tail.connect(shaper)
      tail = shaper
    }

    if (recipe.tremolo > 0) {
      const tremolo = ctx.createGain()
      tremolo.gain.value = 1
      tail.connect(env)
      env.connect(tremolo)
      tremolo.connect(runtime.filter)
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.08
      const depth = ctx.createGain()
      depth.gain.value = recipe.tremolo
      lfo.connect(depth)
      depth.connect(tremolo.gain)
      lfo.start()
      extras.push(lfo)
    } else {
      tail.connect(env)
      env.connect(runtime.filter)
    }

    if (recipe.hammer > 0 && this.noise) {
      const source = ctx.createBufferSource()
      source.buffer = this.noise
      const felt = ctx.createBiquadFilter()
      felt.type = 'lowpass'
      felt.frequency.value = 700
      felt.Q.value = 0.4
      const hit = ctx.createGain()
      hit.gain.setValueAtTime(0.0001, now)
      hit.gain.exponentialRampToValueAtTime(recipe.hammer, now + 0.03)
      hit.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
      source.connect(felt)
      felt.connect(hit)
      hit.connect(runtime.filter)
      source.start()
      source.stop(now + 0.42)
      extras.push(source)
    }

    runtime.voices.set(midi, { env, bus, oscs, extras, pans, basePans })
  }

  private formants(input: AudioNode) {
    const ctx = this.ctx!
    const mix = ctx.createGain()
    const bands = [
      { frequency: 420, q: 0.8, gain: 0.4 },
      { frequency: 860, q: 0.6, gain: 0.12 },
    ]
    bands.forEach((band) => {
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = band.frequency
      filter.Q.value = band.q
      const gain = ctx.createGain()
      gain.gain.value = band.gain
      input.connect(filter)
      filter.connect(gain)
      gain.connect(mix)
    })
    const dry = ctx.createGain()
    dry.gain.value = 0.62
    input.connect(dry)
    dry.connect(mix)
    return mix
  }

  private releaseVoice(runtime: LayerRuntime, midi: number, releaseOverride?: number) {
    const voice = runtime.voices.get(midi)
    const snapshot = this.snapshot
    if (!voice || !this.ctx || !snapshot) return
    runtime.voices.delete(midi)
    const release =
      releaseOverride ??
      effectiveRelease(runtime.settings.release, snapshot.effects.release)
    const now = this.ctx.currentTime
    voice.env.gain.cancelScheduledValues(now)
    voice.env.gain.setValueAtTime(Math.max(voice.env.gain.value, 0.0001), now)
    voice.env.gain.exponentialRampToValueAtTime(0.0001, now + release)
    const stopAt = now + release + 0.06
    voice.oscs.forEach((osc) => {
      try {
        osc.stop(stopAt)
      } catch {
        /* already stopped */
      }
    })
    voice.extras.forEach((node) => {
      try {
        node.stop(stopAt)
      } catch {
        /* already stopped */
      }
    })
    window.setTimeout(() => {
      try {
        voice.env.disconnect()
        voice.bus.disconnect()
      } catch {
        /* already disconnected */
      }
    }, (release + 0.15) * 1000)
  }

  private releaseLayer(runtime: LayerRuntime, seconds?: number) {
    for (const midi of [...runtime.voices.keys()]) {
      this.releaseVoice(runtime, midi, seconds)
    }
  }

  private releaseAll(seconds?: number) {
    this.layers.forEach((runtime) => this.releaseLayer(runtime, seconds))
  }

  private disposeLayer(runtime: LayerRuntime, release: number) {
    this.layers.delete(runtime.id)
    this.releaseLayer(runtime, release)
    window.setTimeout(() => {
      try {
        runtime.lfo.stop()
      } catch {
        /* already stopped */
      }
      runtime.filter.disconnect()
      runtime.smooth.disconnect()
      runtime.gain.disconnect()
      runtime.rev.disconnect()
      runtime.del.disconnect()
      runtime.wide.disconnect()
      runtime.depth.disconnect()
    }, (release + 0.25) * 1000)
  }

  private longestRelease() {
    const snapshot = this.snapshot
    if (!snapshot) return 1
    return snapshot.layers.reduce((longest, layer) => {
      return Math.max(longest, effectiveRelease(layer.release, snapshot.effects.release))
    }, 0.4)
  }
}

export const engine = new AudioEngine()

if (import.meta.env.DEV) {
  window.__pad = engine
}

declare global {
  interface Window {
    __pad?: AudioEngine
  }
}
