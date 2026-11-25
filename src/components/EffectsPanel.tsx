import { useStudio } from '../store/studio'
import { Slider } from './Slider'

function hz(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`
}

export function EffectsPanel() {
  const effects = useStudio((state) => state.effects)
  const setEffects = useStudio((state) => state.setEffects)

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="font-display text-2xl">Space</h2>
      <p className="mt-1 text-sm text-white/45">These shape every layer. Moves are smoothed, so the pad does not click.</p>
      <div className="mt-4 grid gap-3">
        <Slider label="Reverb" min={0} max={1} step={0.01} value={effects.reverb} display={`${Math.round(effects.reverb * 100)}%`} onChange={(reverb) => setEffects({ reverb })} />
        <Slider label="Delay" min={0} max={1} step={0.01} value={effects.delay} display={`${Math.round(effects.delay * 100)}%`} onChange={(delay) => setEffects({ delay })} />
        <Slider label="Low-pass" min={400} max={14000} step={20} value={effects.lowpass} display={hz(effects.lowpass)} onChange={(lowpass) => setEffects({ lowpass })} />
        <Slider label="High-pass" min={20} max={800} step={1} value={effects.highpass} display={hz(effects.highpass)} onChange={(highpass) => setEffects({ highpass })} />
        <Slider label="Stereo width" min={0} max={1} step={0.01} value={effects.width} display={`${Math.round(effects.width * 100)}%`} onChange={(width) => setEffects({ width })} />
        <Slider label="Attack" min={0.4} max={8} step={0.1} value={effects.attack} display={`${effects.attack.toFixed(1)}s`} onChange={(attack) => setEffects({ attack })} />
        <Slider label="Release" min={0.4} max={12} step={0.1} value={effects.release} display={`${effects.release.toFixed(1)}s`} onChange={(release) => setEffects({ release })} />
        <Slider label="Fade time" min={1} max={12} step={0.1} value={effects.fade} display={`${effects.fade.toFixed(1)}s`} onChange={(fade) => setEffects({ fade })} />
      </div>
    </section>
  )
}
