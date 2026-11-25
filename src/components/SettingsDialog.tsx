import { useEffect } from 'react'
import { useStudio } from '../store/studio'

export function SettingsDialog() {
  const open = useStudio((state) => state.settingsOpen)
  const setSettingsOpen = useStudio((state) => state.setSettingsOpen)
  const resetFactory = useStudio((state) => state.resetFactory)
  const clearCustom = useStudio((state) => state.clearCustom)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setSettingsOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/50 p-4 sm:place-items-center" onClick={() => setSettingsOpen(false)}>
      <div
        className="panel w-full max-w-md p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-title" className="font-display text-3xl">Settings</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Sound is made in this browser. Nothing is uploaded. The first Play or Fade in starts audio, which phones require from a tap.
          Chord changes hold the notes both chords share.
        </p>
        <div className="mt-5 grid gap-2">
          <button
            className="h-12 rounded-2xl bg-white text-sm font-medium text-[#101018]"
            onClick={() => {
              resetFactory()
              setSettingsOpen(false)
            }}
          >
            Reset to Warm Worship Pad
          </button>
          <button
            className="h-12 rounded-2xl border border-white/10 text-sm"
            onClick={clearCustom}
          >
            Delete custom presets
          </button>
          <button className="h-12 rounded-2xl text-sm text-white/60" onClick={() => setSettingsOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
