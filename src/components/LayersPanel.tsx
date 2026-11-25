import { LAYER_DEFAULTS } from '../audio/recipes'
import { MAX_LAYERS, effectiveAttack, effectiveRelease, type LayerType } from '../audio/types'
import { useStudio } from '../store/studio'
import { Slider } from './Slider'

const TYPES = Object.keys(LAYER_DEFAULTS) as LayerType[]

function hz(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`
}

export function LayersPanel() {
  const layers = useStudio((state) => state.layers)
  const effects = useStudio((state) => state.effects)
  const setLayer = useStudio((state) => state.setLayer)
  const addLayer = useStudio((state) => state.addLayer)
  const removeLayer = useStudio((state) => state.removeLayer)

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Layers</h2>
          <p className="mt-1 text-sm text-white/45">Up to {MAX_LAYERS} sounds at once.</p>
        </div>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          addLayer(String(data.get('type')) as LayerType)
        }}
      >
        <select className="pad-select" name="type" aria-label="Layer type" defaultValue="worship">
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {LAYER_DEFAULTS[type].name}
            </option>
          ))}
        </select>
        <button
          className="h-11 shrink-0 rounded-2xl bg-white px-4 text-sm font-medium text-[#101018] disabled:opacity-40"
          type="submit"
          disabled={layers.length >= MAX_LAYERS}
        >
          Add
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {layers.map((layer) => (
          <article key={layer.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{layer.name}</div>
                <div className="text-xs tracking-[0.14em] text-white/35 uppercase">{layer.type}</div>
              </div>
              <button
                className={`h-10 rounded-full px-3 text-sm ${layer.enabled ? 'bg-cyan-200/15 text-cyan-50' : 'bg-white/5 text-white/45'}`}
                aria-pressed={layer.enabled}
                onClick={() => setLayer(layer.id, { enabled: !layer.enabled })}
              >
                {layer.enabled ? 'On' : 'Off'}
              </button>
              <button
                className="h-10 rounded-full border border-white/10 px-3 text-sm text-white/60"
                onClick={() => removeLayer(layer.id)}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Slider label="Volume" min={0} max={1} step={0.01} value={layer.volume} display={`${Math.round(layer.volume * 100)}%`} onChange={(volume) => setLayer(layer.id, { volume })} />
              <Slider label="Tone" min={220} max={2800} step={10} value={Math.min(layer.cutoff, 2800)} display={hz(Math.min(layer.cutoff, 2800))} onChange={(cutoff) => setLayer(layer.id, { cutoff })} />
              <Slider label="Attack" min={0.2} max={8} step={0.1} value={layer.attack} display={`${effectiveAttack(layer.attack, effects.attack).toFixed(1)}s`} onChange={(attack) => setLayer(layer.id, { attack })} />
              <Slider label="Release" min={0.3} max={10} step={0.1} value={layer.release} display={`${effectiveRelease(layer.release, effects.release).toFixed(1)}s`} onChange={(release) => setLayer(layer.id, { release })} />
              <Slider label="Reverb" min={0} max={1} step={0.01} value={layer.reverb} display={`${Math.round(layer.reverb * 100)}%`} onChange={(reverb) => setLayer(layer.id, { reverb })} />
              <Slider label="Delay" min={0} max={1} step={0.01} value={layer.delay} display={`${Math.round(layer.delay * 100)}%`} onChange={(delay) => setLayer(layer.id, { delay })} />
              <Slider label="Width" min={0} max={1} step={0.01} value={layer.width} display={`${Math.round(layer.width * 100)}%`} onChange={(width) => setLayer(layer.id, { width })} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
