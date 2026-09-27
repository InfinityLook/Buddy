import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './BoardGameModule.css'

type Player = {
  id: number
  name: string
  color: string
  position: number
}

const STARTING_PLAYERS: Player[] = [
  { id: 1, name: 'Hráč 1', color: '#ef4444', position: 0 },
  { id: 2, name: 'Hráč 2', color: '#3b82f6', position: 0 },
  { id: 3, name: 'Hráč 3', color: '#22c55e', position: 0 },
  { id: 4, name: 'Hráč 4', color: '#f59e0b', position: 0 },
]

const BOARD_SIZE = 30

export const BoardGameModule = () => {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>(STARTING_PLAYERS)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [lastRoll, setLastRoll] = useState<number | null>(null)
  const [winner, setWinner] = useState<Player | null>(null)

  const resetGame = () => {
    setPlayers(STARTING_PLAYERS.map((player) => ({ ...player })))
    setCurrentPlayer(0)
    setLastRoll(null)
    setWinner(null)
  }

  const rollDice = () => {
    if (winner) return
    const roll = Math.floor(Math.random() * 6) + 1
    const activePlayer = players[currentPlayer]
    const newPosition = Math.min(activePlayer.position + roll, BOARD_SIZE)
    const updatedPlayers = players.map((player, index) => index === currentPlayer ? { ...player, position: newPosition } : player)
    setPlayers(updatedPlayers)
    setLastRoll(roll)
    if (newPosition >= BOARD_SIZE) {
      setWinner({ ...activePlayer, position: newPosition })
      return
    }
    setCurrentPlayer((currentPlayer + 1) % players.length)
  }

  const activePlayer = players[currentPlayer]

  return (
    <main className="deskova-hra-page">
      <header className="deskova-hra-header">
        <button className="deskova-hra-back" onClick={() => navigate('/hra')}>← Zpět ke hrám</button>
        <div>
          <p className="deskova-hra-kicker">BUDDYZONE · DESKOVÉ HRY</p>
          <h1>Čtyři království</h1>
          <p>Jednoduchá hra pro 2–4 hráče na jednom zařízení.</p>
        </div>
        <button className="deskova-hra-reset" onClick={resetGame}>Nová hra</button>
      </header>
      <section className="deskova-hra-content">
        <div className="deskova-hra-board" aria-label="Herní plán">
          {Array.from({ length: BOARD_SIZE + 1 }, (_, index) => (
            <div className="deskova-hra-field" key={index}>
              <span>{index}</span>
              {players.map((player) => player.position === index ? <span className="deskova-hra-token" key={player.id} style={{ backgroundColor: player.color }} title={player.name}>{player.id}</span> : null)}
            </div>
          ))}
        </div>
        <aside className="deskova-hra-panel">
          {winner ? <div className="deskova-hra-winner"><span>🏆</span><h2>{winner.name} vyhrává!</h2><button onClick={resetGame}>Hrát znovu</button></div> : <><div className="deskova-hra-turn"><span>Na tahu je</span><strong style={{ color: activePlayer.color }}>{activePlayer.name}</strong></div><button className="deskova-hra-roll" onClick={rollDice}>🎲 Hodit kostkou</button><p className="deskova-hra-roll-result">Poslední hod: <strong>{lastRoll ?? '—'}</strong></p></>}
          <div className="deskova-hra-players">{players.map((player) => <div className="deskova-hra-player" key={player.id}><span className="deskova-hra-player-dot" style={{ backgroundColor: player.color }} /><span>{player.name}</span><strong>{player.position}/{BOARD_SIZE}</strong></div>)}</div>
        </aside>
      </section>
    </main>
  )
}

export default BoardGameModule
