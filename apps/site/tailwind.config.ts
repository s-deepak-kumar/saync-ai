import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF7',
        ink:        '#0F172A',
        muted:      '#64748B',
        label:      '#94A3B8',
        terracotta: '#D4502A',
        card:       '#FFFFFF',
        border:     '#E2E8F0',
        zebra:      '#F8F9FA',
      },
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'serif'],
        inter:    ['var(--font-inter)', 'sans-serif'],
        mono:     ['var(--font-jetbrains-mono)', 'monospace'],
      },
      letterSpacing: { tighter: '-0.02em', wider: '0.08em' },
    },
  },
} satisfies Config;
