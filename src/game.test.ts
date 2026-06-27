import { describe, expect, it } from 'vitest'
import { createGame, evaluateGuess, generateSecret, getHintCandidate, recordResult, EMPTY_STATS } from './game'

describe('generateSecret', () => {
  it('generates three unique digits and allows a leading zero', () => {
    const answer = generateSecret(() => 0)
    expect(answer).toBe('012')
    expect(new Set(answer).size).toBe(3)
  })
})

describe('evaluateGuess', () => {
  it.each([
    ['123', '123', 3, 0, 0],
    ['123', '312', 0, 3, 0],
    ['123', '145', 1, 0, 2],
    ['123', '456', 0, 0, 3],
    ['123', '132', 1, 2, 0]
  ])('evaluates %s against %s', (answer, guess, strikes, balls, outs) => {
    expect(evaluateGuess(answer, guess)).toMatchObject({ strikes, balls, outs })
  })
})

describe('hints and stats', () => {
  it('returns a digit that is not in the answer or previous hints', () => {
    const game = { ...createGame('easy', '123'), eliminatedDigits: ['0'] }
    const hint = getHintCandidate(game, () => 0)
    expect(hint).toBe('4')
  })

  it('records wins, attempts and streaks without mutating the source', () => {
    const updated = recordResult(EMPTY_STATS, 'normal', true, 5)
    expect(updated.normal).toMatchObject({ wins: 1, losses: 0, currentStreak: 1, bestStreak: 1, totalAttempts: 5 })
    expect(EMPTY_STATS.normal.wins).toBe(0)
  })

  it('resets the current streak after a loss', () => {
    const won = recordResult(EMPTY_STATS, 'hard', true, 3)
    const lost = recordResult(won, 'hard', false, 7)
    expect(lost.hard).toMatchObject({ wins: 1, losses: 1, currentStreak: 0, bestStreak: 1 })
  })
})
