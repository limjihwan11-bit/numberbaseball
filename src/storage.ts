import { createGame, EMPTY_STATS } from './game'
import type { Difficulty, GameState, Statistics, ThemePreference } from './types'

const GAME_KEY = 'number-ball:game:v1'
const STATS_KEY = 'number-ball:stats:v1'
const THEME_KEY = 'number-ball:theme:v1'

const cloneStats = (): Statistics => JSON.parse(JSON.stringify(EMPTY_STATS)) as Statistics

export function loadGame(fallback: Difficulty = 'normal'): GameState {
  try {
    const value = localStorage.getItem(GAME_KEY)
    if (!value) return createGame(fallback)
    const parsed = JSON.parse(value) as GameState
    if (
      !['easy', 'normal', 'hard'].includes(parsed.difficulty) ||
      !['playing', 'won', 'lost'].includes(parsed.status) ||
      !/^\d{3}$/.test(parsed.answer) ||
      new Set(parsed.answer).size !== 3 ||
      !Array.isArray(parsed.guesses)
    ) {
      return createGame(fallback)
    }
    return parsed
  } catch {
    return createGame(fallback)
  }
}

export function saveGame(game: GameState): void {
  localStorage.setItem(GAME_KEY, JSON.stringify(game))
}

export function loadStats(): Statistics {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_KEY) ?? 'null') as Partial<Statistics> | null
    if (!parsed) return cloneStats()
    const base = cloneStats()
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      if (parsed[difficulty]) base[difficulty] = { ...base[difficulty], ...parsed[difficulty] }
    }
    return base
  } catch {
    return cloneStats()
  }
}

export function saveStats(stats: Statistics): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function resetStoredStats(): Statistics {
  const stats = cloneStats()
  saveStats(stats)
  return stats
}

export function loadTheme(): ThemePreference {
  const value = localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function saveTheme(theme: ThemePreference): void {
  localStorage.setItem(THEME_KEY, theme)
}
