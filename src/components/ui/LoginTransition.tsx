import { useEffect, useRef, useState } from 'react'

export const LoginTransition = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation start slightly after mount to ensure CSS transition catches it
    const timer = setTimeout(() => setIsVisible(true), 50)

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    interface Star {
      x: number
      y: number
      z: number
      size: number
      opacity: number
    }

    const stars: Star[] = []
    const numStars = 150
    const speed = 2

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        size: Math.random() < 0.9 ? 1 : 2,
        opacity: Math.random()
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      stars.forEach((star) => {
        star.z -= speed
        if (star.z <= 0) {
          star.z = width
          star.x = Math.random() * width - width / 2
          star.y = Math.random() * height - height / 2
        }

        const k = 128.0 / star.z
        const x = star.x * k + width / 2
        const y = star.y * k + height / 2

        const scale = (1 - star.z / width)

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const alpha = scale * star.opacity
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fillRect(x, y, star.size * scale, star.size * scale)
        }
      })

      animationId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all duration-[1500ms] ease-out
        ${isVisible ? 'bg-black/90 backdrop-blur-3xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}
      `}
    >
      {/* Text - Fade in with delay */}
      <div className={`relative z-10 transition-all duration-[2000ms] delay-500 ease-out transform
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}>
        <p className="font-['Outfit'] font-light text-white/90 tracking-[0.3em] text-sm uppercase antialiased">
          Iniciando experiência
        </p>
      </div>

      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-[2000ms] ease-in-out
          ${isVisible ? 'opacity-60' : 'opacity-0'}
        `}
      />
    </div>
  )
}
