import { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  hover?: boolean
}

export const Card = ({ className = '', children, hover = true, ...props }: CardProps) => {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : {}}
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  )
}