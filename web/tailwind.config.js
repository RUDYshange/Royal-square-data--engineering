/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Canvas & surfaces — monochrome base
        canvas:    '#F8FAFC',
        surface:   { DEFAULT: '#F8FAFC', dim: '#E2E8F0', bright: '#FFFFFF' },
        ink:       { DEFAULT: '#0F172A', 2: '#334155', 3: '#64748B' },
        rule:      '#E2E8F0',
        ruleStrong:'#CBD5E1',

        // Primary — near-black shell
        spruce:    { DEFAULT: '#0A0A0A', hover: '#1F1F1F', dim: '#525252' },

        // Secondary — brand blue (live / pipeline / primary actions)
        live:      { DEFAULT: '#2563EB', hover: '#1D4ED8', bg: '#DBEAFE' },

        // Tertiary — pending/lodged: steel blue
        amber:     { DEFAULT: '#3B82F6', bg: '#EFF6FF', soft: '#DBEAFE' },

        // Critical — near-black for rejections, SLA breaches, high loss ratios
        danger:    { DEFAULT: '#171717', bg: '#EFF6FF', soft: '#F5F5F5' },

        // Assessing — deep blue
        info:      { DEFAULT: '#1E40AF', bg: '#DBEAFE' },

        // Paid — sky
        paid:      { DEFAULT: '#0EA5E9', bg: '#E0F2FE' },
      },
      // Design-system spacing scale (DESIGN.md) — every space-* / gutter-*
      // utility in the components keys off this. Without it the classes
      // silently generate nothing and layouts lose all their padding.
      spacing: {
        'space-xs':       '0.25rem',
        'space-sm':       '0.5rem',
        'space-md':       '0.75rem',
        'space-lg':       '1.25rem',
        'space-xl':       '2rem',
        'gutter':         '1rem',
        'gutter-desktop': '1.5rem',
        'margin':         '1rem',
        'margin-desktop': '1.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'body-md':      ['13px', { lineHeight: '18px' }],
        'body-lg':      ['15px', { lineHeight: '22px' }],
        'label-md':     ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-caps':   ['10px', { lineHeight: '12px', letterSpacing: '0.05em', fontWeight: '700' }],
        'code-sm':      ['11px', { lineHeight: '14px', fontWeight: '500' }],
        'metric-code':  ['14px', { lineHeight: '18px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm':  ['15px', { lineHeight: '20px', fontWeight: '600' }],
        'headline-md':  ['18px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-lg':  ['24px', { lineHeight: '32px', fontWeight: '700', letterSpacing: '-0.015em' }],
        'display-hero': ['28px', { lineHeight: '32px', fontWeight: '700', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)',
        raise: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        sheet: '0 20px 25px -5px rgba(15, 23, 22, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '.5', transform: 'scale(.8)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
