import { useEffect, useRef } from 'react'
import { engine } from '../audio/engine'

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    const samples = new Uint8Array(1024)

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const ratio = window.devicePixelRatio || 1
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio)
        canvas.height = Math.floor(height * ratio)
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      const analyser = engine.analyserNode()
      if (analyser) analyser.getByteTimeDomainData(samples)

      context.beginPath()
      const mid = height / 2
      for (let i = 0; i < 180; i += 1) {
        const x = (i / 179) * width
        let y = mid
        if (analyser) {
          const sample = samples[Math.floor((i / 179) * (samples.length - 1))] / 128 - 1
          y = mid + sample * (height * 0.42)
        } else {
          y = mid + Math.sin(i * 0.08 + time / 700) * 6
        }
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      const gradient = context.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, 'rgba(125, 211, 252, 0.15)')
      gradient.addColorStop(0.5, 'rgba(186, 230, 253, 0.95)')
      gradient.addColorStop(1, 'rgba(196, 181, 253, 0.2)')
      context.strokeStyle = gradient
      context.lineWidth = 2
      context.stroke()
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="h-24 w-full"
      aria-hidden="true"
    />
  )
}
