import { useCallback, useEffect, useMemo, useState } from 'react'
import { createGame, DIFFICULTY_CONFIG, evaluateGuess, getHintCandidate, recordResult } from './game'
import { loadGame, loadStats, loadTheme, resetStoredStats, saveGame, saveStats, saveTheme } from './storage'
import type { Difficulty, GameState, Statistics, ThemePreference } from './types'

type Modal = 'stats' | 'settings' | 'rules' | null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UpdateEvent extends CustomEvent {
  detail: { update: () => void }
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

function Icon({ name, size = 20 }: { name: 'chart' | 'settings' | 'sun' | 'trash' | 'download' | 'help' | 'refresh' | 'backspace' | 'spark'; size?: number }) {
  const paths = {
    chart: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.33.72.6 1 .3.27.68.4 1.1.4h.09v4h-.09c-.42 0-.8.13-1.1.4-.27.28-.48.62-.6 1Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    trash: <><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v5M14 11v5"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.6 2.6 0 1 1 3.2 2.53c-.8.27-.8.87-.8 1.47M12 17h.01"/></>,
    refresh: <><path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7"/></>,
    backspace: <><path d="m21 6-4-3H8l-6 9 6 9h9l4-3V6Z"/><path d="m10 9 6 6M16 9l-6 6"/></>,
    spark: <><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function ResultBadges({ strikes, balls, outs }: { strikes: number; balls: number; outs: number }) {
  return (
    <div className="result-badges" aria-label={`${strikes} 스트라이크, ${balls} 볼, ${outs} 아웃`}>
      <span className="badge strike"><b>{strikes}</b> S</span>
      <span className="badge ball"><b>{balls}</b> B</span>
      <span className="badge out"><b>{outs}</b> O</span>
    </div>
  )
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div><span className="eyebrow">{eyebrow}</span><h2 id="modal-title">{title}</h2></div>
          <button className="close-button" onClick={onClose} aria-label="닫기">×</button>
        </div>
        {children}
      </section>
    </div>
  )
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadGame())
  const [stats, setStats] = useState<Statistics>(() => loadStats())
  const [theme, setTheme] = useState<ThemePreference>(() => loadTheme())
  const [modal, setModal] = useState<Modal>(null)
  const [resultOpen, setResultOpen] = useState(() => game.status !== 'playing')
  const [toast, setToast] = useState('')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [updateAction, setUpdateAction] = useState<(() => void) | null>(null)

  const config = DIFFICULTY_CONFIG[game.difficulty]
  const remaining = Math.max(0, config.attempts - game.guesses.length)
  const hintsLeft = config.hints - game.hintsUsed
  const latest = game.guesses.at(-1)

  const announce = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((current) => current === message ? '' : current), 2600)
  }, [])

  useEffect(() => saveGame(game), [game])
  useEffect(() => saveStats(stats), [stats])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#091b17' : '#102e25')
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    saveTheme(theme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const installed = () => {
      setInstallPrompt(null)
      announce('홈 화면에 설치했어요!')
    }
    const update = (event: Event) => setUpdateAction(() => (event as UpdateEvent).detail.update)
    const offlineReady = () => announce('이제 오프라인에서도 플레이할 수 있어요.')
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installed)
    window.addEventListener('numberball:update', update)
    window.addEventListener('numberball:offline-ready', offlineReady)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installed)
      window.removeEventListener('numberball:update', update)
      window.removeEventListener('numberball:offline-ready', offlineReady)
    }
  }, [announce])

  const addDigit = useCallback((digit: string) => {
    if (game.status !== 'playing' || game.currentInput.length >= 3) return
    if (game.currentInput.includes(digit)) {
      announce('서로 다른 숫자를 골라주세요.')
      return
    }
    if (game.eliminatedDigits.includes(digit)) {
      announce(`${digit}은 정답에 없는 숫자예요.`)
      return
    }
    setGame((current) => ({ ...current, currentInput: current.currentInput + digit }))
  }, [announce, game.currentInput, game.eliminatedDigits, game.status])

  const removeDigit = useCallback(() => {
    if (game.status !== 'playing') return
    setGame((current) => ({ ...current, currentInput: current.currentInput.slice(0, -1) }))
  }, [game.status])

  const submitGuess = useCallback(() => {
    if (game.status !== 'playing') return
    if (game.currentInput.length !== 3) {
      announce('숫자 세 자리를 모두 채워주세요.')
      return
    }
    const result = evaluateGuess(game.answer, game.currentInput, game.guesses.length + 1)
    const nextGuesses = [...game.guesses, result]
    const won = result.strikes === 3
    const lost = !won && nextGuesses.length >= config.attempts
    const status = won ? 'won' : lost ? 'lost' : 'playing'
    setGame({ ...game, currentInput: '', guesses: nextGuesses, status })
    if (status !== 'playing') {
      setStats((current) => recordResult(current, game.difficulty, won, nextGuesses.length))
      setResultOpen(true)
    } else if (result.strikes === 0 && result.balls === 0) {
      announce('삼진 아웃! 세 숫자 모두 빗나갔어요.')
    }
  }, [announce, config.attempts, game])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (modal || resultOpen) return
      if (/^\d$/.test(event.key)) addDigit(event.key)
      else if (event.key === 'Backspace' || event.key === 'Delete') removeDigit()
      else if (event.key === 'Enter') submitGuess()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addDigit, modal, removeDigit, resultOpen, submitGuess])

  const startNewGame = (difficulty: Difficulty = game.difficulty, confirmProgress = true) => {
    if (confirmProgress && game.status === 'playing' && game.guesses.length > 0 && !window.confirm('진행 중인 게임을 끝내고 새로 시작할까요?')) return
    setGame(createGame(difficulty))
    setResultOpen(false)
    announce(`${DIFFICULTY_CONFIG[difficulty].label} 리그, 새 게임을 시작합니다!`)
  }

  const changeDifficulty = (difficulty: Difficulty) => {
    if (difficulty === game.difficulty) return
    startNewGame(difficulty)
  }

  const useHint = () => {
    if (game.status !== 'playing' || hintsLeft <= 0) return
    const digit = getHintCandidate(game)
    if (!digit) return
    setGame({ ...game, hintsUsed: game.hintsUsed + 1, eliminatedDigits: [...game.eliminatedDigits, digit] })
    announce(`${digit}은 정답에 없습니다.`)
  }

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'dismissed') announce('언제든 설정에서 설치할 수 있어요.')
    setInstallPrompt(null)
  }

  const totals = useMemo(() => Object.values(stats).reduce((sum, item) => ({
    wins: sum.wins + item.wins,
    losses: sum.losses + item.losses
  }), { wins: 0, losses: 0 }), [stats])
  const winRate = totals.wins + totals.losses ? Math.round(totals.wins / (totals.wins + totals.losses) * 100) : 0

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => startNewGame()} aria-label="넘버볼 새 게임">
          <span className="brand-mark"><i /><i /></span>
          <span><b>넘버볼</b><small>NUMBER BALL</small></span>
        </button>
        <nav className="header-actions" aria-label="앱 메뉴">
          {installPrompt && <button className="install-chip" onClick={install}><Icon name="download" size={17} /> <span>설치</span></button>}
          <button className="icon-button" onClick={() => setModal('rules')} aria-label="게임 방법"><Icon name="help" /></button>
          <button className="icon-button" onClick={() => setModal('stats')} aria-label="내 기록"><Icon name="chart" /></button>
          <button className="icon-button" onClick={() => setModal('settings')} aria-label="설정"><Icon name="settings" /></button>
        </nav>
      </header>

      <main>
        <section className="hero-copy">
          <span className="eyebrow">오늘의 첫 타석</span>
          <h1>세 숫자를 읽고,<br/><em>정답을 노려보세요.</em></h1>
          <p>위치까지 맞으면 스트라이크, 숫자만 맞으면 볼.</p>
        </section>

        <section className="game-layout">
          <div className="game-card">
            <div className="scoreboard-head">
              <div>
                <span className="score-label">SCOREBOARD</span>
                <strong>{game.status === 'playing' ? `${game.guesses.length + 1}회 초` : '경기 종료'}</strong>
              </div>
              <div className={`status-light ${game.status}`}><i />{game.status === 'playing' ? '경기 중' : game.status === 'won' ? '승리' : '패배'}</div>
            </div>

            <div className="difficulty-tabs" aria-label="난이도 선택">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((difficulty) => (
                <button key={difficulty} className={game.difficulty === difficulty ? 'active' : ''} onClick={() => changeDifficulty(difficulty)}>
                  {DIFFICULTY_CONFIG[difficulty].label}
                </button>
              ))}
            </div>

            <div className="at-bat">
              <div className="at-bat-meta">
                <span>나의 투구</span>
                <span>남은 기회 <b>{remaining}</b></span>
              </div>
              <div className="number-display" aria-label={`현재 입력 ${game.currentInput || '없음'}`}>
                {[0, 1, 2].map((index) => <span key={index} className={game.currentInput[index] ? 'filled' : ''}>{game.currentInput[index] ?? '–'}</span>)}
              </div>
              <div className="progress-track" aria-hidden="true"><i style={{ width: `${(game.guesses.length / config.attempts) * 100}%` }} /></div>
            </div>

            {latest ? (
              <div className="latest-call">
                <div><span>직전 판정</span><strong>{latest.guess}</strong></div>
                <ResultBadges {...latest} />
              </div>
            ) : (
              <div className="latest-call empty-call"><div><span>심판의 콜</span><strong>PLAY BALL!</strong></div><p>첫 세 숫자를 던져보세요.</p></div>
            )}

            {game.eliminatedDigits.length > 0 && (
              <div className="eliminated-row"><span><Icon name="spark" size={16}/> 힌트</span>{game.eliminatedDigits.map((digit) => <b key={digit}>{digit} 제외</b>)}</div>
            )}

            <div className="keypad" aria-label="숫자 키패드">
              {DIGITS.slice(0, 9).map((digit) => <button key={digit} disabled={game.status !== 'playing' || game.currentInput.includes(digit) || game.eliminatedDigits.includes(digit)} onClick={() => addDigit(digit)}>{digit}</button>)}
              <button className="key-action" onClick={removeDigit} disabled={!game.currentInput} aria-label="한 자리 지우기"><Icon name="backspace" /></button>
              <button disabled={game.status !== 'playing' || game.currentInput.includes('0') || game.eliminatedDigits.includes('0')} onClick={() => addDigit('0')}>0</button>
              <button className="key-action" onClick={() => setGame((current) => ({ ...current, currentInput: '' }))} disabled={!game.currentInput} aria-label="입력 전체 지우기">C</button>
            </div>

            <div className="game-actions">
              <button className="hint-button" onClick={useHint} disabled={hintsLeft <= 0 || game.status !== 'playing'}><Icon name="spark" size={17}/> 힌트 <span>{hintsLeft}</span></button>
              <button className="pitch-button" onClick={submitGuess} disabled={game.status !== 'playing'}>투구하기 <span>↵</span></button>
            </div>
          </div>

          <aside className="history-card">
            <div className="section-head"><div><span className="eyebrow">GAME LOG</span><h2>투구 기록</h2></div><span className="count-pill">{game.guesses.length}/{config.attempts}</span></div>
            {game.guesses.length ? (
              <ol className="history-list">
                {[...game.guesses].reverse().map((guess) => (
                  <li key={guess.turn}>
                    <span className="turn">{String(guess.turn).padStart(2, '0')}</span>
                    <strong>{guess.guess}</strong>
                    <ResultBadges {...guess} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-history"><div className="baseball-seams">3</div><strong>아직 기록이 없어요</strong><p>숫자를 던지면 여기에 판정이 쌓입니다.</p></div>
            )}
            <div className="history-footer"><span>{config.label} 리그</span><span>{config.note}</span></div>
          </aside>
        </section>
      </main>

      <footer><span>NUMBER BALL · 2026</span><button onClick={() => setModal('rules')}>게임 규칙</button><i /></footer>

      {resultOpen && game.status !== 'playing' && (
        <div className="modal-backdrop result-backdrop">
          <section className="modal result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className={`result-emblem ${game.status}`}><span>{game.status === 'won' ? '3S' : 'OUT'}</span></div>
            <span className="eyebrow">FINAL SCORE</span>
            <h2 id="result-title">{game.status === 'won' ? '홈런!' : '아쉬운 경기였어요'}</h2>
            <p>{game.status === 'won' ? `${game.guesses.length}번 만에 정답을 정확히 맞혔습니다.` : '기회를 모두 사용했습니다. 다음 경기에서는 잡을 수 있어요.'}</p>
            <div className="answer-reveal"><span>정답</span><strong>{game.answer.split('').join(' · ')}</strong></div>
            <div className="result-actions">
              <button className="secondary-button" onClick={() => { setResultOpen(false); setModal('stats') }}>기록 보기</button>
              <button className="primary-button" onClick={() => startNewGame(game.difficulty, false)}><Icon name="refresh" size={18}/> 다시 하기</button>
            </div>
          </section>
        </div>
      )}

      {modal === 'rules' && <ModalShell title="게임 방법" eyebrow="HOW TO PLAY" onClose={() => setModal(null)}>
        <div className="rules-list">
          <div><span>01</span><p><b>서로 다른 숫자 3개</b>를 골라 투구하세요. 0도 첫 자리에 올 수 있습니다.</p></div>
          <div><span className="rule-dot strike">S</span><p><b>스트라이크</b>는 숫자와 위치를 모두 맞힌 경우입니다.</p></div>
          <div><span className="rule-dot ball">B</span><p><b>볼</b>은 숫자는 맞지만 위치가 다른 경우입니다.</p></div>
          <div><span className="rule-dot out">O</span><p><b>아웃</b>은 정답에 없는 숫자입니다.</p></div>
        </div>
        <button className="primary-button full" onClick={() => setModal(null)}>플레이 볼!</button>
      </ModalShell>}

      {modal === 'stats' && <ModalShell title="나의 기록" eyebrow="PLAYER STATS" onClose={() => setModal(null)}>
        <div className="stats-hero"><div><strong>{totals.wins + totals.losses}</strong><span>전체 경기</span></div><div><strong>{winRate}%</strong><span>승률</span></div><div><strong>{Math.max(...Object.values(stats).map((item) => item.bestStreak))}</strong><span>최고 연승</span></div></div>
        <div className="stats-table">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((difficulty) => {
            const item = stats[difficulty]
            const average = item.wins ? (item.totalAttempts / item.wins).toFixed(1) : '–'
            return <div className="stats-row" key={difficulty}><strong>{DIFFICULTY_CONFIG[difficulty].label}</strong><span><b>{item.wins}</b> 승</span><span><b>{item.losses}</b> 패</span><span><b>{average}</b> 평균 투구</span></div>
          })}
        </div>
      </ModalShell>}

      {modal === 'settings' && <ModalShell title="설정" eyebrow="CLUBHOUSE" onClose={() => setModal(null)}>
        <div className="settings-group"><label>화면 테마</label><div className="segmented">{(['system', 'light', 'dark'] as ThemePreference[]).map((value) => <button key={value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)}>{value === 'system' ? '시스템' : value === 'light' ? '라이트' : '다크'}</button>)}</div></div>
        {installPrompt && <button className="settings-action" onClick={install}><span><Icon name="download"/><span><b>앱으로 설치</b><small>홈 화면에서 빠르게 실행하세요</small></span></span><i>›</i></button>}
        <button className="settings-action danger" onClick={() => { if (window.confirm('모든 경기 기록을 초기화할까요? 이 작업은 되돌릴 수 없습니다.')) { setStats(resetStoredStats()); announce('경기 기록을 초기화했어요.') } }}><span><Icon name="trash"/><span><b>경기 기록 초기화</b><small>승패와 연승 기록을 모두 삭제합니다</small></span></span><i>›</i></button>
      </ModalShell>}

      {updateAction && <div className="update-banner" role="status"><span>새 버전이 준비됐어요.</span><button onClick={() => updateAction()}>지금 업데이트</button></div>}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
