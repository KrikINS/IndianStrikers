/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        secondary: '#3b82f6',
        accent: '#f97316',
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        cursive: ["Zeyada", "cursive"],
        neon: ["Tilt Neon", "sans-serif"],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'zoom-in': 'zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'spin-circle': 'spinCircle 5s infinite linear',
        'shimmer': 'shimmer 1.5s infinite',
        'blink': 'blink 1s step-end infinite',
        'shine': 'shine 1.5s ease-in-out infinite',
      },
      keyframes: {
        shine: {
          '0%': { left: '-150%' },
          '100%': { left: '150%' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        zoomIn: {
          from: { opacity: '0', transform: 'scale(0.5) translate(-50%, -50%)' },
          to: { opacity: '1', transform: 'scale(1) translate(-50%, -50%)' },
        },
        spinCircle: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
