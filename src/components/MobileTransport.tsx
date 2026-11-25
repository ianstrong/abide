import { useStudio } from '../store/studio'

export function MobileTransport() {
  const playing = useStudio((state) => state.playing)
  const status = useStudio((state) => state.status)
  const play = useStudio((state) => state.play)
  const stop = useStudio((state) => state.stop)
  const mute = useStudio((state) => state.mute)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07080f]/90 p-3 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <div className="grid grid-cols-3 gap-2">
        <button className="h-12 rounded-2xl bg-cyan-200 font-medium text-[#071018]" onClick={() => void play()}>
          {playing ? 'Live' : 'Play'}
        </button>
        <button className="h-12 rounded-2xl border border-white/10" onClick={stop}>
          Stop
        </button>
        <button
          className={`h-12 rounded-2xl border ${status === 'muted' ? 'border-rose-200/50 bg-rose-400/20' : 'border-rose-300/30 text-rose-100'}`}
          onClick={mute}
        >
          Mute
        </button>
      </div>
    </div>
  )
}
