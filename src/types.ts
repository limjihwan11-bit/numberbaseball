export type Difficulty = 'easy' | 'normal' | 'hard'

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GuessResult {
  guess: string
  strikes: number
  balls: number
  outs: number
  turn: number
}

export interface GameState {
  answer: string
  currentInput: string
  guesses: GuessResult[]
  difficulty: Difficulty
  hintsUsed: number
  eliminatedDigits: string[]
  status: GameStatus
  startedAt: number
}

export interface DifficultyStats {
  wins: number
  losses: number
  currentStreak: number
  bestStreak: number
  totalAttempts: number
}

export type Statistics = Record<Difficulty, DifficultyStats>

export type ThemePreference = 'system' | 'light' | 'dark'
