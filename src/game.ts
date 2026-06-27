import type { Difficulty, GameState, GuessResult, Statistics } from './types'

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; attempts: number; hints: number; note: string }> = {
  easy: { label: '루키', attempts: 12, hints: 2, note: '12회 · 힌트 2개' },
  normal: { label: '프로', attempts: 9, hints: 1, note: '9회 · 힌트 1개' },
  hard: { label: '레전드', attempts: 7, hints: 0, note: '7회 · 힌트 없음' }
}

export const EMPTY_STATS: Statistics = {
  easy: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, totalAttempts: 0 },
  normal: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, totalAttempts: 0 },
  hard: { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, totalAttempts: 0 }
}

export function generateSecret(random: () => number = Math.random): string {
  const pool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  const result: string[] = []
  while (result.length < 3) {
    const index = Math.floor(random() * pool.length)
    result.push(pool.splice(index, 1)[0])
  }
  return result.join('')
}

export function evaluateGuess(answer: string, guess: string, turn = 1): GuessResult {
  let strikes = 0
  let balls = 0
  for (let index = 0; index < 3; index += 1) {
    if (guess[index] === answer[index]) strikes += 1
    else if (answer.includes(guess[index])) balls += 1
  }
  return { guess, strikes, balls, outs: 3 - strikes - balls, turn }
}

export function createGame(difficulty: Difficulty, answer = generateSecret()): GameState {
  return {
    answer,
    currentInput: '',
    guesses: [],
    difficulty,
    hintsUsed: 0,
    eliminatedDigits: [],
    status: 'playing',
    startedAt: Date.now()
  }
}

export function getHintCandidate(state: GameState, random: () => number = Math.random): string | null {
  const candidates = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(
    (digit) => !state.answer.includes(digit) && !state.eliminatedDigits.includes(digit)
  )
  if (!candidates.length) return null
  return candidates[Math.floor(random() * candidates.length)]
}

export function recordResult(
  stats: Statistics,
  difficulty: Difficulty,
  won: boolean,
  attempts: number
): Statistics {
  const current = stats[difficulty]
  const streak = won ? current.currentStreak + 1 : 0
  return {
    ...stats,
    [difficulty]: {
      wins: current.wins + (won ? 1 : 0),
      losses: current.losses + (won ? 0 : 1),
      currentStreak: streak,
      bestStreak: Math.max(current.bestStreak, streak),
      totalAttempts: current.totalAttempts + (won ? attempts : 0)
    }
  }
}
