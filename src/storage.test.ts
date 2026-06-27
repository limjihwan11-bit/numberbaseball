import { beforeEach, describe, expect, it } from 'vitest'
import { createGame } from './game'
import { loadGame, loadStats, loadTheme, saveGame, saveTheme } from './storage'

describe('persistent storage', () => {
  beforeEach(() => localStorage.clear())

  it('restores a valid game including leading zero answers', () => {
    const game = createGame('easy', '012')
    game.currentInput = '4'
    saveGame(game)
    expect(loadGame()).toMatchObject({ answer: '012', difficulty: 'easy', currentInput: '4' })
  })

  it('replaces malformed saved games', () => {
    localStorage.setItem('number-ball:game:v1', JSON.stringify({ answer: '111' }))
    const restored = loadGame('hard')
    expect(restored.difficulty).toBe('hard')
    expect(new Set(restored.answer).size).toBe(3)
  })

  it('uses empty statistics and system theme by default', () => {
    expect(loadStats().normal.wins).toBe(0)
    expect(loadTheme()).toBe('system')
    saveTheme('dark')
    expect(loadTheme()).toBe('dark')
  })
})
