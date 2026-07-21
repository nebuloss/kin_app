import type { ColorKey } from '@/core/game'

/**
 * Tailwind class bundles per team colour. Written as full literal strings so the
 * Tailwind v4 scanner keeps them (never build class names by string concatenation).
 */
export interface ColorClasses {
  dot: string      // small solid swatch
  softBg: string   // tinted panel background
  text: string     // tinted foreground
  border: string   // tinted border
  chipBg: string   // solid chip / badge
  gradient: string // reveal-card gradient (use with bg-gradient-to-br)
}

export const COLORS: Record<ColorKey, ColorClasses> = {
  red: {
    dot: 'bg-red-500', softBg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-900', chipBg: 'bg-red-500 text-white', gradient: 'from-red-500 to-rose-700',
  },
  amber: {
    dot: 'bg-amber-400', softBg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900', chipBg: 'bg-amber-500 text-white', gradient: 'from-amber-400 to-orange-600',
  },
  blue: {
    dot: 'bg-blue-500', softBg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900', chipBg: 'bg-blue-500 text-white', gradient: 'from-blue-500 to-indigo-700',
  },
  green: {
    dot: 'bg-green-500', softBg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-900', chipBg: 'bg-green-500 text-white', gradient: 'from-green-500 to-emerald-700',
  },
  purple: {
    dot: 'bg-purple-500', softBg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-900', chipBg: 'bg-purple-500 text-white', gradient: 'from-purple-500 to-fuchsia-700',
  },
  orange: {
    dot: 'bg-orange-500', softBg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900', chipBg: 'bg-orange-500 text-white', gradient: 'from-orange-500 to-red-700',
  },
  slate: {
    dot: 'bg-slate-600', softBg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700', chipBg: 'bg-slate-700 text-white', gradient: 'from-slate-700 to-slate-900',
  },
  yellow: {
    dot: 'bg-yellow-400', softBg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-900', chipBg: 'bg-yellow-400 text-slate-900', gradient: 'from-yellow-400 to-amber-600',
  },
}
