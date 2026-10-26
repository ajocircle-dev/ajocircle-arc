/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        muted: token('surface-muted'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        subtle: token('subtle'),
        line: token('line'),
        primary: token('primary'),
        'primary-ink': token('primary-ink'),
        accent: token('accent'),
        success: token('success'),
        danger: token('danger'),
        warn: token('warn'),
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -12px rgb(var(--shadow) / 0.18)',
      },
    },
  },
  plugins: [],
}
