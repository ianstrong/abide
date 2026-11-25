interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] tracking-[0.16em] text-white/45 uppercase">
        <span>{label}</span>
        <span className="font-medium tracking-normal text-white/80 normal-case tabular-nums">{display}</span>
      </span>
      <input
        className="pad-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
