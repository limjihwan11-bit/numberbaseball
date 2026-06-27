import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { createGame } from './game'
import { saveGame } from './storage'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('blocks duplicate digits and incomplete guesses', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /투구하기/ }))
    expect(screen.getByRole('status')).toHaveTextContent('숫자 세 자리를 모두 채워주세요.')
  })

  it('wins a game, reveals the answer and records the result', async () => {
    saveGame(createGame('normal', '123'))
    const user = userEvent.setup()
    render(<App />)
    for (const digit of ['1', '2', '3']) await user.click(screen.getByRole('button', { name: digit }))
    await user.click(screen.getByRole('button', { name: /투구하기/ }))
    expect(screen.getByRole('heading', { name: '홈런!' })).toBeInTheDocument()
    expect(screen.getByText('1 · 2 · 3')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('number-ball:stats:v1')!).normal.wins).toBe(1)
  })

  it('uses keyboard digits, backspace and enter', async () => {
    saveGame(createGame('normal', '123'))
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('124{Backspace}3{Enter}')
    expect(screen.getByRole('heading', { name: '홈런!' })).toBeInTheDocument()
  })

  it('uses a hint and persists the eliminated digit', async () => {
    saveGame(createGame('easy', '123'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /힌트 2/ }))
    expect(screen.getByText(/제외/)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('number-ball:game:v1')!).hintsUsed).toBe(1)
  })
})
