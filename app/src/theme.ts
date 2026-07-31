export const themes = {
  light: {
    '--primary': '#4f46e5',
    '--primary-dark': '#4338ca',
    '--primary-soft': '#e0e7ff',
    '--danger': '#ef4444',
    '--danger-dark': '#dc2626',
    '--success': '#22c55e',
    '--bg': '#f3f4f6',
    '--card': '#ffffff',
    '--text': '#111827',
    '--text-secondary': '#6b7280',
    '--border': '#e5e7eb',
  },
  dark: {
    '--primary': '#818cf8',
    '--primary-dark': '#6366f1',
    '--primary-soft': '#312e81',
    '--danger': '#f87171',
    '--danger-dark': '#dc2626',
    '--success': '#4ade80',
    '--bg': '#111827',
    '--card': '#1f2937',
    '--text': '#f9fafb',
    '--text-secondary': '#9ca3af',
    '--border': '#374151',
  },
  forest: {
    '--primary': '#15803d',
    '--primary-dark': '#166534',
    '--primary-soft': '#dcfce7',
    '--danger': '#ef4444',
    '--danger-dark': '#dc2626',
    '--success': '#22c55e',
    '--bg': '#f0fdf4',
    '--card': '#ffffff',
    '--text': '#111827',
    '--text-secondary': '#6b7280',
    '--border': '#bbf7d0',
  },
  berry: {
    '--primary': '#db2777',
    '--primary-dark': '#be185d',
    '--primary-soft': '#fce7f3',
    '--danger': '#ef4444',
    '--danger-dark': '#dc2626',
    '--success': '#22c55e',
    '--bg': '#fdf2f8',
    '--card': '#ffffff',
    '--text': '#111827',
    '--text-secondary': '#6b7280',
    '--border': '#fbcfe8',
  },
} as const

export type ThemeName = keyof typeof themes

export function applyTheme(name: ThemeName) {
  const root = document.documentElement
  const vars = themes[name]
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
  root.setAttribute('data-theme', name)
}

export function getThemeName(): ThemeName {
  return (document.documentElement.getAttribute('data-theme') as ThemeName) || 'light'
}
