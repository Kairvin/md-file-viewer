/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Charter', 'Merriweather', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        sepia: {
          50: '#fbf9f4',
          100: '#f6f2e8',
          200: '#ede4d1',
          300: '#dfd0b3',
          700: '#5c4832',
          800: '#433423',
          900: '#2c2217',
        }
      }
    },
  },
  plugins: [],
}
