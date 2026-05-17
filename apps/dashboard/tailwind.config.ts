import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Canvas + ink
        background: '#FAFAF7',        // warm off-white canvas
        ink: '#0F172A',
        muted: '#64748B',
        label: '#94A3B8',             // tiny uppercase labels
        terracotta: '#D4502A',
        card: '#FFFFFF',
        border: '#E2E8F0',
        // Dense-table tokens — Sentry-style zebra + hover
        zebra: '#F8F9FA',
        rowHover: '#F1F5F9',
        // Sidebar (dark)
        sidebar: '#0F172A',
        sidebarMuted: '#64748B',
        sidebarBorder: '#1E293B',
        sidebarHover: '#1E293B',
        sidebarActive: '#334155',
        // Severity — used as text + accent + 6px row-edge strip
        sevCritical: '#DC2626',
        sevHigh:     '#C2410C',
        sevMedium:   '#92400E',
        sevLow:      '#059669',
        // Severity fills (for pill backgrounds + skeleton tints)
        sevCriticalBg: '#FEE2E2',
        sevHighBg:     '#FFEDD5',
        sevMediumBg:   '#FEF3C7',
        sevLowBg:      '#DCFCE7',
        // Status (run / step / flow)
        statusPass:    '#059669',
        statusFail:    '#DC2626',
        statusRunning: '#D4502A',     // active / live
        statusSkipped: '#94A3B8',
      },
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'serif'],
        inter:    ['var(--font-inter)', 'sans-serif'],
        mono:     ['var(--font-jetbrains-mono)', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.02em',
        wider:   '0.08em',            // for ALL-CAPS labels
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(1.15)' },
        },
        'in-row': {
          '0%':   { opacity: '0', transform: 'translateY(-4px)', backgroundColor: '#FEF3E2' },
          '100%': { opacity: '1', transform: 'translateY(0)',    backgroundColor: 'transparent' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        'in-row':    'in-row 0.42s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
