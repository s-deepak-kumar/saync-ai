import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF7',     // warm off-white
        canvas:     '#F3F2EE',     // slightly darker tone for striped backgrounds
        ink:        '#0F172A',     // primary text
        muted:      '#475569',     // body text — a touch darker than slate-500 for density
        label:      '#94A3B8',     // tiny ALL CAPS labels
        terracotta: '#D4502A',     // accent
        terraDark:  '#A53A1E',     // hover state
        card:       '#FFFFFF',
        border:     '#E5E7EB',
        rule:       '#CBD5E1',     // stronger dividers
        zebra:      '#F8F9FA',
        codeBg:     '#0B1220',     // a touch darker than ink for code blocks
        sevPass:    '#0E7C66',
        sevFail:    '#B91C1C',
      },
      fontFamily: {
        sans:  ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-plex-serif)', 'Georgia', 'serif'],
        mono:  ['var(--font-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight:   '-0.012em',
        wider:   '0.1em',
      },
      borderRadius: {
        // IBM Plex / Carbon-ish — sharper corners
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
    },
  },
} satisfies Config;
