import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import logoHorizontal from '../../images/identidade visual/Azera Logo Horizontal.png'

export default function NavBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="fixed w-full top-0 left-0 z-50">
        <motion.div
          className="backdrop-blur-sm bg-background/80 border-b border-slate-200 dark:border-slate-800"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          <div className="w-full px-4 md:px-6 py-4 flex items-center justify-between" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logoHorizontal}
                alt="Azera CRM"
                className="h-8 md:h-10 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-text opacity-80 text-sm">
              <a href="#servicos" className="hover:text-primary transition-colors">Serviços</a>
              <a href="#precos" className="hover:text-primary transition-colors">Preços</a>
              <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
              <Link
                to="/login"
                className="ml-2 px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-300 shadow-lg shadow-primary/20"
              >
                Entrar
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-text hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Abrir menu"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Menu className="w-6 h-6" />
            </motion.button>
          </div>
        </motion.div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
          {/* Backdrop with blur */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Sidebar */}
          <motion.div
            className="fixed top-0 right-0 h-full w-64 bg-surface border-l border-slate-200 dark:border-slate-800 z-[70] md:hidden shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex flex-col h-full p-6" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              {/* Close button */}
              <motion.button
                onClick={() => setIsMobileMenuOpen(false)}
                className="self-end p-2 text-text hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mb-8"
                aria-label="Fechar menu"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-6 h-6" />
              </motion.button>

              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Link to="/" className="mb-8 block" onClick={() => setIsMobileMenuOpen(false)}>
                  <img
                    src={logoHorizontal}
                    alt="Azera CRM"
                    className="h-8 w-auto"
                  />
                </Link>
              </motion.div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2 text-text opacity-80">
                <motion.a
                  href="#servicos"
                  className="py-3 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary rounded-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Serviços
                </motion.a>
                <motion.a
                  href="#precos"
                  className="py-3 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary rounded-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Preços
                </motion.a>
                <motion.a
                  href="#contato"
                  className="py-3 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary rounded-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Contato
                </motion.a>

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link
                    to="/login"
                    className="mt-4 block py-3 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-center transition-all shadow-lg shadow-primary/20"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                </motion.div>
              </nav>
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
    </>
  )
}
