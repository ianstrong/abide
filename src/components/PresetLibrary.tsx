import { useState } from 'react'
import { presetList, useStudio } from '../store/studio'

export function PresetLibrary() {
  const customPresets = useStudio((state) => state.customPresets)
  const activePresetId = useStudio((state) => state.activePresetId)
  const loadPreset = useStudio((state) => state.loadPreset)
  const savePreset = useStudio((state) => state.savePreset)
  const renamePreset = useStudio((state) => state.renamePreset)
  const deletePreset = useStudio((state) => state.deletePreset)
  const clearCustom = useStudio((state) => state.clearCustom)
  const [filter, setFilter] = useState('All')
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const presets = presetList(customPresets)
  const categories = ['All', ...new Set(presets.map((preset) => preset.category))]
  const visible = presets.filter((preset) => filter === 'All' || preset.category === filter)

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Presets</h2>
          <p className="mt-1 text-sm text-white/45">Custom presets stay in this browser.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {customPresets.length > 0 ? (
            confirmClear ? (
              <>
                <button
                  className="h-11 rounded-2xl border border-rose-300/40 bg-rose-400/10 px-4 text-sm text-rose-50"
                  type="button"
                  onClick={() => {
                    clearCustom()
                    setConfirmClear(false)
                    setConfirmId(null)
                  }}
                >
                  Delete {customPresets.length} custom
                </button>
                <button className="h-11 px-2 text-sm text-white/60" type="button" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="h-11 rounded-2xl border border-white/10 px-4 text-sm text-white/75"
                type="button"
                onClick={() => setConfirmClear(true)}
              >
                Delete custom
              </button>
            )
          ) : null}
        <form
          className="flex min-w-0 flex-1 gap-2 sm:flex-none"
          onSubmit={(event) => {
            event.preventDefault()
            savePreset(name)
            setName('')
          }}
        >
          <input
            className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm outline-none sm:w-56"
            placeholder="Save current sound"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            aria-label="Preset name"
          />
          <button className="h-11 rounded-2xl bg-white px-4 text-sm font-medium text-[#101018]" type="submit">
            Save
          </button>
        </form>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            className={`h-9 shrink-0 rounded-full px-3 text-sm ${
              filter === category ? 'bg-white text-[#101018]' : 'bg-white/5 text-white/70'
            }`}
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((preset) => {
          const active = preset.id === activePresetId
          return (
            <article
              key={preset.id}
              className={`rounded-3xl border p-4 ${active ? 'border-cyan-200/40 bg-cyan-200/10' : 'border-white/10 bg-black/20'}`}
            >
              <button className="w-full text-left" onClick={() => loadPreset(preset.id)}>
                <div className="text-[11px] tracking-[0.14em] text-white/40 uppercase">{preset.category}</div>
                <div className="mt-1 text-base font-medium">{preset.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{preset.description}</p>
              </button>
              {!preset.builtin ? (
                <div className="mt-3 flex gap-2">
                  {renaming === preset.id ? (
                    <form
                      className="flex flex-1 gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        renamePreset(preset.id, draft)
                        setRenaming(null)
                      }}
                    >
                      <input
                        className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-2 text-sm"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        aria-label={`Rename ${preset.name}`}
                      />
                      <button className="text-sm text-cyan-100" type="submit">
                        OK
                      </button>
                    </form>
                  ) : (
                    <button
                      className="text-sm text-white/60"
                      onClick={() => {
                        setRenaming(preset.id)
                        setDraft(preset.name)
                      }}
                    >
                      Rename
                    </button>
                  )}
                  {confirmId === preset.id ? (
                    <button
                      className="text-sm text-rose-200"
                      onClick={() => {
                        deletePreset(preset.id)
                        setConfirmId(null)
                      }}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70"
                      onClick={() => setConfirmId(preset.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
