import { Square, VolumeX } from 'lucide-react'
import { CHORDS, KEYS, chordMidis, chordTitle, noteName, transposedKeyIndex } from '../audio/theory'
import { useStudio } from '../store/studio'
import { Slider } from './Slider'
import { Visualizer } from './Visualizer'

function TransportButton({
  label,
  onClick,
  tone = 'ghost',
}: {
  label: string
  onClick: () => void
  tone?: 'ghost' | 'danger'
}) {
  return (
    <button
      className={`h-12 min-w-12 rounded-2xl border px-3 text-sm ${
        tone === 'danger'
          ? 'border-rose-300/30 bg-rose-400/10 text-rose-100'
          : 'border-white/10 bg-white/5 text-white/80'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function PerformanceDeck() {
  const keyIndex = useStudio((state) => state.keyIndex)
  const chordId = useStudio((state) => state.chordId)
  const transpose = useStudio((state) => state.transpose)
  const master = useStudio((state) => state.master)
  const status = useStudio((state) => state.status)
  const playing = useStudio((state) => state.playing)
  const setKey = useStudio((state) => state.setKey)
  const setChord = useStudio((state) => state.setChord)
  const setTranspose = useStudio((state) => state.setTranspose)
  const setMaster = useStudio((state) => state.setMaster)
  const play = useStudio((state) => state.play)
  const stop = useStudio((state) => state.stop)
  const fadeIn = useStudio((state) => state.fadeIn)
  const fadeOut = useStudio((state) => state.fadeOut)
  const mute = useStudio((state) => state.mute)

  const midis = chordMidis(keyIndex, chordId, transpose)
  const sounding = KEYS[transposedKeyIndex(keyIndex, transpose)]
  const live = playing || status === 'releasing'

  return (
    <section className="panel p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-3">
          <button
            className={`grid h-28 w-28 place-items-center rounded-full text-lg font-medium text-[#071018] shadow-[0_0_40px_rgba(125,211,252,0.25)] ${
              playing ? 'bg-cyan-200' : 'bg-gradient-to-br from-cyan-200 to-violet-300'
            }`}
            onClick={() => void (playing ? stop() : play())}
            aria-pressed={playing}
          >
            {playing ? 'Live' : 'Play'}
          </button>
          <div className="grid w-full grid-cols-2 gap-2">
            <TransportButton label="Fade in" onClick={() => void fadeIn()} />
            <TransportButton label="Fade out" onClick={fadeOut} />
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm"
              onClick={stop}
            >
              <Square size={12} fill="currentColor" />
              Stop
            </button>
            <button
              className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm ${
                status === 'muted'
                  ? 'border-rose-300/50 bg-rose-400/20 text-rose-50'
                  : 'border-rose-300/30 bg-rose-400/10 text-rose-100'
              }`}
              onClick={mute}
            >
              <VolumeX size={16} />
              Mute
            </button>
          </div>
          <p className="text-center text-xs leading-relaxed text-white/40">
            Stop lets the pad release. Mute cuts it. Space plays, M mutes.
          </p>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.18em] text-cyan-100/50 uppercase">
            {live ? 'Hearing' : 'Ready to play'}
          </div>
          <h1 className="font-display mt-2 text-4xl text-white sm:text-6xl">{chordTitle(keyIndex, chordId, transpose)}</h1>
          {transpose !== 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-sm text-amber-50">
              <span>
                Song key {KEYS[keyIndex]} · transpose {transpose > 0 ? `+${transpose}` : transpose} · sounding {sounding}
              </span>
              <button className="rounded-full bg-white/10 px-3 py-1" onClick={() => setTranspose(0)}>
                Reset
              </button>
            </div>
          ) : null}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <Visualizer />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
            {midis.map((midi) => (
              <span key={midi} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm tabular-nums">
                {noteName(midi)}
              </span>
            ))}
          </div>
          <div className="mt-5">
            <Slider
              label="Master volume"
              min={0}
              max={1}
              step={0.01}
              value={master}
              display={`${Math.round(master * 100)}%`}
              onChange={setMaster}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-[11px] tracking-[0.16em] text-white/40 uppercase">Key</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {KEYS.map((key, index) => (
            <button
              key={key}
              className={`h-12 rounded-2xl border text-sm ${
                index === keyIndex
                  ? 'border-cyan-200/50 bg-cyan-200/15 text-cyan-50'
                  : 'border-white/10 bg-white/5 text-white/75'
              }`}
              aria-pressed={index === keyIndex}
              onClick={() => setKey(index)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[11px] tracking-[0.16em] text-white/40 uppercase">Chord</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {CHORDS.map((chord) => (
            <button
              key={chord.id}
              className={`h-12 rounded-2xl border text-sm ${
                chord.id === chordId
                  ? 'border-violet-200/50 bg-violet-300/15 text-violet-50'
                  : 'border-white/10 bg-white/5 text-white/75'
              }`}
              aria-pressed={chord.id === chordId}
              onClick={() => setChord(chord.id)}
            >
              {chord.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/35">Shared notes stay held. New chord tones swell in.</p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-[11px] tracking-[0.16em] text-white/40 uppercase">Transpose</span>
        <button
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg"
          aria-label="Transpose down"
          onClick={() => setTranspose(transpose - 1)}
        >
          −
        </button>
        <div className="w-12 text-center text-lg tabular-nums">{transpose > 0 ? `+${transpose}` : transpose}</div>
        <button
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg"
          aria-label="Transpose up"
          onClick={() => setTranspose(transpose + 1)}
        >
          +
        </button>
      </div>
    </section>
  )
}
