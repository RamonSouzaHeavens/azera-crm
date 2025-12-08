import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SimpleBlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  loop?: boolean;
}

const SimpleBlurText: React.FC<SimpleBlurTextProps> = ({
  text,
  className = '',
  delay = 150,
  loop = false,
}) => {
  const [animationKey, setAnimationKey] = useState(0);
  const letters = text.split('');

  useEffect(() => {
    if (loop) {
      const timer = setInterval(() => {
        setAnimationKey(prev => prev + 1);
      }, (letters.length * delay) + 2000); // Wait for animation + 2s pause

      return () => clearInterval(timer);
    }
  }, [loop, letters.length, delay]);

  return (
    <div className={className} style={{ display: 'inline-flex' }}>
      {letters.map((letter, index) => (
        <motion.span
          key={`${letter}-${index}-${animationKey}`}
          initial={{ 
            filter: 'blur(10px)', 
            opacity: 0, 
            y: -20 
          }}
          animate={{ 
            filter: 'blur(0px)', 
            opacity: 1, 
            y: 0 
          }}
          transition={{
            duration: 0.6,
            delay: index * (delay / 1000),
            ease: 'easeOut'
          }}
          style={{ display: 'inline-block' }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </div>
  );
};

export default SimpleBlurText;