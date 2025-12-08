/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Habilita o modo escuro baseado em classe
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-app)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        surface: 'var(--color-surface)',
        text: 'var(--text-main)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'], // Mantendo para compatibilidade
        outfit: ['Outfit', 'sans-serif'], // Mantendo para compatibilidade
      },
    },
  },
  plugins: [],
};
