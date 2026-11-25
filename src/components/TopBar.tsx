import { Settings } from 'lucide-react'
import { presetList, useStudio } from '../store/studio'

const STATUS_LABEL = {
  silent: 'Ready',
  live: 'Live',
  'fading-in': 'Fading in',
  'fading-out': 'Fading out',
  releasing: 'Releasing',
  muted: 'Muted',
} as const

export function TopBar() {
  const status = useStudio((state) => state.status)
  const activePresetId = useStudio((state) => state.activePresetId)
  const customPresets = useStudio((state) => state.customPresets)
  const dirty = useStudio((state) => state.dirty)
  const setSettingsOpen = useStudio((state) => state.setSettingsOpen)
  const preset = presetList(customPresets).find((item) => item.id === activePresetId)

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07080f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-4 px-4 lg:px-6">
        <div className="min-w-0">
          <div className="font-display text-lg leading-none text-white">Abide</div>
          <div className="mt-1 text-[11px] tracking-[0.18em] text-cyan-100/50 uppercase">ambient pad studio</div>
        </div>
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="truncate text-sm text-white/85">
            {preset?.name ?? 'Custom sound'}
            {dirty ? <span className="text-white/40"> · edited</span> : null}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
            <span className={`h-2 w-2 rounded-full ${status === 'live' ? 'live-dot bg-emerald-300' : 'bg-white/30'}`} />
            <span>{STATUS_LABEL[status]}</span>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
