import { useEffect, useState } from 'react'
import { EffectsPanel } from './components/EffectsPanel'
import { LayersPanel } from './components/LayersPanel'
import { MobileTransport } from './components/MobileTransport'
import { PerformanceDeck } from './components/PerformanceDeck'
import { PresetLibrary } from './components/PresetLibrary'
import { SettingsDialog } from './components/SettingsDialog'
import { TopBar } from './components/TopBar'
import { useStudio } from './store/studio'

type Tab = 'perform' | 'layers' | 'effects' | 'presets'

const TABS: { id: Tab; label: string }[] = [
  { id: 'perform', label: 'Perform' },
  { id: 'layers', label: 'Layers' },
  { id: 'effects', label: 'Space' },
  { id: 'presets', label: 'Presets' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('perform')
  const playing = useStudio((state) => state.playing)
  const play = useStudio((state) => state.play)
  const stop = useStudio((state) => state.stop)
  const mute = useStudio((state) => state.mute)
  const toast = useStudio((state) => state.toast)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      if (event.repeat) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (playing) stop()
        else void play()
      }
      if (event.key.toLowerCase() === 'm') mute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mute, play, playing, stop])

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_420px_at_10%_-10%,rgba(124,92,255,0.2),transparent),radial-gradient(700px_380px_at_100%_0%,rgba(56,189,248,0.14),transparent)]" />
      <div className="relative">
        <TopBar />
        <main className="mx-auto w-full max-w-[1240px] px-4 pt-4 pb-28 lg:px-6 lg:pb-10">
          <div className="mb-4 flex gap-2 lg:hidden">
            {TABS.map((item) => (
              <button
                key={item.id}
                className={`h-10 flex-1 rounded-full text-sm ${tab === item.id ? 'bg-white text-[#101018]' : 'bg-white/5 text-white/70'}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={tab === 'perform' ? 'block' : 'hidden lg:block'}>
            <PerformanceDeck />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
            <div className={tab === 'layers' ? 'block' : 'hidden lg:block'}>
              <LayersPanel />
            </div>
            <div className={tab === 'effects' ? 'block' : 'hidden lg:block'}>
              <EffectsPanel />
            </div>
          </div>
          <div className={`mt-4 ${tab === 'presets' ? 'block' : 'hidden lg:block'}`}>
            <PresetLibrary />
          </div>
        </main>
        <MobileTransport />
        <SettingsDialog />
        {toast ? (
          <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-[#161824] px-4 py-2 text-sm lg:bottom-6">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  )
}
