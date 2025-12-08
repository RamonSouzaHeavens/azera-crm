import NavBar from '../ui/NavBar'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Play, CheckCircle, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function HeroPremium() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [maxTasks, setMaxTasks] = useState(3)
  
  const rotatingWords = ['vender', 'focar', 'crescer']
  
  // Animar palavras rotativas
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex(prev => (prev + 1) % rotatingWords.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [rotatingWords.length])
  
  // Tasks state for dynamic animation
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Ligar para cliente ABC', completed: true, time: 'Concluída há 1 min' },
    { id: 2, text: 'Enviar proposta para XYZ Ltda', completed: true, time: 'Concluída há 3 min' },
    { id: 3, text: 'Agendar reunião com equipe', completed: false, time: 'Hoje às 15:00' },
  ])
  
  // Animate tasks completion
  useEffect(() => {
    const taskTemplates = [
      { text: 'Revisar pipeline de vendas', time: 'Hoje às 16:30' },
      { text: 'Enviar follow-up para lead novo', time: 'Hoje às 17:00' },
      { text: 'Atualizar status do projeto Y', time: 'Amanhã às 09:00' },
      { text: 'Preparar relatório mensal', time: 'Hoje às 18:00' },
      { text: 'Ligar para cliente potencial', time: 'Hoje às 14:00' },
    ]
    
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        const newTasks = [...prevTasks]
        // Mark first task as completed if not already
        if (newTasks.length > 0 && !newTasks[0].completed) {
          newTasks[0] = { ...newTasks[0], completed: true, time: 'Concluída há 1 min' }
        } else if (newTasks.length > 0) {
          // Remove completed task and add new one
          newTasks.shift()
          const randomTemplate = taskTemplates[Math.floor(Math.random() * taskTemplates.length)]
          newTasks.push({
            id: Date.now(),
            text: randomTemplate.text,
            completed: false,
            time: randomTemplate.time
          })
        }
        // Limit to maxTasks
        return newTasks.slice(-maxTasks)
      })
    }, 4000) // Change every 4 seconds
    
    return () => clearInterval(interval)
  }, [maxTasks])

  // Detect screen size for tasks limit
  useEffect(() => {
    const updateMaxTasks = () => {
      setMaxTasks(window.innerWidth < 768 ? 2 : 3)
    }
    
    updateMaxTasks()
    window.addEventListener('resize', updateMaxTasks)
    return () => window.removeEventListener('resize', updateMaxTasks)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Partículas para animação
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
    }> = []

    // Inicializar partículas
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 100,
        size: Math.random() * 2 + 1
      })
    }

    let animationId: number

    const animate = () => {
      // Limpar com fundo preto sólido (premium)
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Desenhar e atualizar partículas
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.life += 0.5

        // Resetar partícula se saiu da tela ou morreu
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height || p.life > p.maxLife) {
          particles[i] = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            life: 0,
            maxLife: 100 + Math.random() * 100,
            size: Math.random() * 2 + 1
          }
        }

        // Desenhar partícula com gradiente
        const alpha = 1 - (p.life / p.maxLife)
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        gradient.addColorStop(0, `rgba(34, 211, 238, ${alpha * 0.8})`)
        gradient.addColorStop(1, `rgba(34, 211, 238, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        // Desenhar linhas entre partículas próximas
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - distance / 120) * 0.15})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="relative overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      <NavBar />

      <main className="relative z-10 min-h-screen flex items-center pt-24 pb-16">
        <div className="w-full px-4 md:px-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
          <div className="px-0 md:px-12 max-w-[1640px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-20">

              {/* Left column: headline */}
              <section className="px-0 lg:px-0 space-y-6 md:space-y-10 order-2 lg:order-1">

                {/* Headline principal */}
                <motion.h1 
                  className="text-5xl md:text-6xl lg:text-7xl xl:text-7xl leading-tight text-white tracking-tight mb-6 font-thin text-center lg:text-left" 
                  style={{ lineHeight: 1.2, fontSize: 'clamp(2.5rem, 9vw, 5.5rem)' }}
                  initial={{ opacity: 0, y: 50, rotateX: 20 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                >
                  Aqui tem tudo o que você precisa para{' '}
                  <motion.span
                    key={currentWordIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300"
                  >
                    {rotatingWords[currentWordIndex]}
                  </motion.span>
                  {' '}mais.
                </motion.h1>

                {/* Subheadline */}
                <motion.p 
                  className="text-base md:text-lg lg:text-xl text-slate-400 max-w-2xl mb-8 font-light text-center lg:text-left leading-relaxed mx-auto lg:mx-0"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                >
                  O CRM minimalista que equipes reais usam para organizar seus leads, automatizar follow-ups e manter o trabalho em sincronia.
                  <br className="hidden md:block" />
                  <span className="md:inline block mt-2 md:mt-0">Rápido, limpo, e poderoso o suficiente para escalar sua operação.</span>
                </motion.p>

                {/* Métricas sociais 
                <div className="flex items-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">15.000+</div>
                    <div className="text-sm text-slate-400">Leads gerenciados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">98%</div>
                    <div className="text-sm text-slate-400">Taxa satisfação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">2.3x</div>
                    <div className="text-sm text-slate-400">Mais conversões</div>
                  </div>
                </div>
                */}
                

                {/* CTAs principais */}
                <motion.div 
                  className="flex flex-row gap-4 mb-8 justify-center lg:justify-start"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.2 } }}
                  >
                    <Link
                      to="/login"
                      className="group inline-flex items-center justify-center gap-2 px-4 py-3 md:px-8 md:py-4 rounded-lg bg-gradient-to-r from-blue-400 to-cyan-300 text-black text-sm md:text-lg font-semibold transition-all duration-300 hover:from-blue-500 hover:to-cyan-400 shadow-lg whitespace-nowrap"
                    >
                      Começar Grátis
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.5)", transition: { duration: 0.3 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.2 } }}
                  >
                    <button
                      onClick={() => setIsVideoPlaying(true)}
                      className="group inline-flex items-center justify-center gap-2 px-4 py-3 md:px-8 md:py-4 rounded-lg border border-white/30 hover:border-white/50 text-white text-sm md:text-lg font-semibold transition-all duration-300 whitespace-nowrap"
                    >
                      <Play className="w-4 h-4" />
                      Ver Demo
                    </button>
                  </motion.div>
                </motion.div>

                {/* Trust signals */}
                <motion.div 
                  className="grid grid-cols-3 gap-4 text-xs md:text-sm text-slate-500 justify-center lg:justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 1.0 }}
                >
                  <motion.div 
                    className="flex items-center gap-1 md:gap-2 justify-center lg:justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.0 }}
                  >
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="text-center lg:text-left">Sem cartão de crédito</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-1 md:gap-2 justify-center lg:justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.2 }}
                  >
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="text-center lg:text-left">Setup em 5 minutos</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-1 md:gap-2 justify-center lg:justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.4 }}
                  >
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="text-center lg:text-left">Cancele quando quiser</span>
                  </motion.div>
                </motion.div>
                
              </section>

              {/* Right column: Dashboard Preview */}
              <motion.div 
                className="px-4 md:px-8 lg:px-14 relative block order-1 lg:order-2"
                initial={{ opacity: 0, x: 0, rotateY: 10, rotateX: 5 }}
                animate={{ opacity: 1, x: 0, rotateY: 15, rotateX: -5 }}
                transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                style={{ perspective: 1000 }}
              >
                <motion.div 
                  className="relative bg-gradient-to-br from-slate-900/50 via-blue-900/10 to-slate-800/30 border border-blue-500/20 rounded-3xl p-4 md:p-6 shadow-2xl"
                  animate={{ 
                    boxShadow: [
                      "0 0 20px rgba(34, 211, 238, 0.05), 0 0 40px rgba(59, 130, 246, 0.025)",
                      "0 0 40px rgba(34, 211, 238, 0.1), 0 0 60px rgba(59, 130, 246, 0.05)",
                      "0 0 20px rgba(34, 211, 238, 0.05), 0 0 40px rgba(59, 130, 246, 0.025)"
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Mock Dashboard */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg flex items-center justify-center border border-blue-500/30">
                          <TrendingUp className="w-4 h-4 text-blue-300" />
                        </div>
                        <div>
                          <div className="text-white font-semibold text-sm">Dashboard Azera</div>
                          <div className="text-slate-400 text-xs">Visão geral das vendas</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-300">R$ 127.500</div>
                        <div className="text-emerald-400 text-xs">+23% vs mês passado</div>
                      </div>
                    </div>

                    {/* Pipeline Visual */}
                    <div className="space-y-2">
                      <div className="text-white font-medium text-xs">Pipeline de Vendas</div>
                      <div className="space-y-1.5">
                        <motion.div 
                          className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-500/5 to-blue-600/10 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-white text-xs">Lead</span>
                          </div>
                          <span className="text-white font-semibold text-sm">45</span>
                        </motion.div>
                        <motion.div 
                          className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-500/5 to-blue-600/10 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-white text-xs">Negociação</span>
                          </div>
                          <span className="text-white font-semibold text-sm">23</span>
                        </motion.div>
                        <motion.div 
                          className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-500/5 to-blue-600/10 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-white text-xs">Fechado</span>
                          </div>
                          <span className="text-white font-semibold text-sm">12</span>
                        </motion.div>
                      </div>
                    </div>

                    {/* Two Column Layout: Team Activity & Tasks */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Team Activity */}
                      <div className="space-y-2">
                        <div className="text-white font-medium text-xs">Atividade da Equipe</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 p-1.5">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-blue-500/30">JS</div>
                            <div className="flex-1">
                              <div className="text-white text-xs">João fechou negócio</div>
                              <div className="text-slate-500 text-[10px]">há 2 minutos</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-1.5">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-blue-500/30">MR</div>
                            <div className="flex-1">
                              <div className="text-white text-xs">Maria adicionou lead</div>
                              <div className="text-slate-500 text-[10px]">há 5 minutos</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="space-y-2">
                        <div className="text-white font-medium text-xs">Tarefas</div>
                        <div className="space-y-1.5">
                          <AnimatePresence mode="popLayout">
                            {tasks.map((task, index) => (
                              <motion.div 
                                key={task.id}
                                className="flex items-center gap-2 p-1.5"
                                initial={{ opacity: 0, x: -20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, x: 20, height: 0 }}
                                transition={{ 
                                  duration: 0.5, 
                                  delay: index * 0.1,
                                  height: { duration: 0.3 }
                                }}
                                layout
                              >
                                {task.completed ? (
                                  <motion.div 
                                    className="w-4 h-4 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded border border-blue-500/30 flex items-center justify-center flex-shrink-0"
                                    animate={{ 
                                      backgroundColor: ["rgba(59, 130, 246, 0.1)", "rgba(34, 211, 238, 0.2)", "rgba(59, 130, 246, 0.1)"]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                                  >
                                    <CheckCircle className="w-3 h-3 text-blue-400" />
                                  </motion.div>
                                ) : (
                                  <div className="w-4 h-4 bg-slate-700 rounded border border-slate-600 flex items-center justify-center flex-shrink-0">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className={`text-white text-xs ${task.completed ? 'line-through opacity-60' : ''}`}>
                                    {task.text}
                                  </div>
                                  <div className="text-slate-500 text-[10px]">{task.time}</div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <motion.div 
                    className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-slate-700 to-blue-900/50 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/20"
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, 0, -5, 0]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    <Zap className="w-8 h-8 text-blue-300" />
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-8 -left-8 w-16 h-16 bg-gradient-to-br from-slate-700 to-blue-900/50 rounded-xl flex items-center justify-center shadow-lg border border-blue-500/20"
                    animate={{ 
                      y: [0, 8, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      delay: 1
                    }}
                  >
                    <TrendingUp className="w-6 h-6 text-blue-300" />
                  </motion.div>
                </motion.div>

                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 to-slate-700/10 rounded-3xl blur-3xl -z-10 transform scale-110"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Video Modal */}
      {isVideoPlaying &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setIsVideoPlaying(false)}
          >
            <video
              src="/videos/tutorial.mp4"
              controls
              autoPlay
              className="max-w-4xl w-full rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}

      {/* Decorative ribbons */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -right-40 -bottom-40 w-[42rem] h-[42rem] rounded-full bg-gradient-to-br from-slate-800/10 to-slate-700/5 blur-3xl transform rotate-12" />
        <div className="absolute -left-40 -top-40 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-slate-900/10 to-slate-800/5 blur-3xl transform -rotate-6" />
      </div>
    </div>
  )
}
