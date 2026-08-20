import React, { useState } from 'react'
import { usePoseEngine } from './usePoseEngine'
import { useFormCheck } from './useFormCheck'
import './FormCheck.css'

const formatDatum = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

const formatTrvani = (sekund: number): string => {
  if (sekund < 60) return `${sekund} s`
  return `${Math.floor(sekund / 60)} min ${sekund % 60} s`
}

export const FormCheck: React.FC = () => {
  const engine = usePoseEngine()
  const { sezeni, pocetSezeni, celkemOpakovani, nejlepsiSezeni, ulozitSezeni } = useFormCheck()

  // Shrnutí posledního sezení se ukáže hned po ukončení, ať vidí, co si
  // právě vydělal, a nemusí to hledat v historii dole.
  const [posledniShrnuti, setPosledniShrnuti] = useState<{ pocet: number; trvani: number } | null>(
    null
  )

  const handleStop = () => {
    const { pocetOpakovani, trvaniSekund } = engine.stop()
    if (pocetOpakovani > 0) {
      ulozitSezeni(pocetOpakovani, trvaniSekund)
      setPosledniShrnuti({ pocet: pocetOpakovani, trvani: trvaniSekund })
    }
  }

  const handleStart = () => {
    setPosledniShrnuti(null)
    engine.start()
  }

  return (
    <div className="fc-app">
      <div className="fc-header">
        <h2>Form Check</h2>
      </div>

      {/* <video> a <canvas> jsou v DOMu pořád, i před prvním spuštěním —
          engine na ně potřebuje mít funkční ref hned, jinak by mu chyběly
          v okamžiku, kdy se stream připojuje. Zobrazí se, jakmile se
          začne žádat o kameru — i ve stavu "nacita-se" už video-wrap
          není skrytý, ať je vidět obraz z kamery hned, jak je k dispozici,
          a ne až ve chvíli, kdy doběhne stahování modelu. */}
      <div
        className={`fc-video-wrap ${engine.stav === 'bezi' || engine.stav === 'nacita-se' ? '' : 'fc-video-wrap--skryto'}`}
      >
        <video ref={engine.videoRef} className="fc-video" playsInline muted />
        <canvas ref={engine.canvasRef} className="fc-canvas" />

        {engine.stav === 'bezi' && !engine.vidimTe && (
          <div className="fc-hint-overlay">Nevidím tě celého v záběru. Poodstup nebo nastav kameru šířkou.</div>
        )}

        {engine.stav === 'bezi' && (
          <>
            <div className="fc-counter">{engine.pocetOpakovani}</div>
            {engine.zpetnaVazba && (
              <div className={`fc-feedback fc-feedback--${engine.zpetnaVazba}`}>
                {engine.zpetnaVazba === 'v-poradku' ? '✓ Záda rovně' : '⚠ Narovnej záda'}
              </div>
            )}
            <div className="fc-controls">
              {engine.pocetKamer > 1 && (
                <button className="fc-icon-btn" onClick={engine.prepnoutKameru} aria-label="Přepnout kameru">
                  🔄
                </button>
              )}
              <button className="fc-icon-btn" onClick={engine.resetovatPocitadlo} aria-label="Vynulovat počítadlo">
                ↺
              </button>
              <button className="fc-stop-btn" onClick={handleStop}>
                Ukončit sezení
              </button>
            </div>
          </>
        )}
      </div>

      {engine.stav === 'vypnuto' && (
        <div className="fc-gate">
          <span className="fc-gate-icon">🏋️</span>
          <p className="fc-gate-text">
            Postav telefon tak, aby na kameru viděl celé tvé tělo z boku, a spočítáme dřepy za tebe.
            Video nikdy neopustí tenhle telefon — rozpoznávání pozice běží celé offline, přímo
            v prohlížeči.
          </p>
          <button className="fc-start-btn" onClick={handleStart}>
            Zapnout kameru
          </button>

          {posledniShrnuti && (
            <p className="fc-posledni-vysledek">
              Poslední sezení: {posledniShrnuti.pocet}× dřep za {formatTrvani(posledniShrnuti.trvani)}
            </p>
          )}
        </div>
      )}

      {engine.stav === 'nacita-se' && (
        <div className="fc-gate">
          <div className="fc-spinner" aria-hidden="true" />
          <p className="fc-gate-text">
            Připravuji kameru a model rozpoznávání… Poprvé se stahuje asi 6 MB, pak už se používá to,
            co zůstalo v telefonu.
          </p>
        </div>
      )}

      {engine.stav === 'chyba' && (
        <div className="fc-gate">
          <span className="fc-gate-icon">⚠️</span>
          <p className="fc-gate-text fc-gate-text--chyba">{engine.chyba}</p>
          <button className="fc-start-btn" onClick={handleStart}>
            Zkusit znovu
          </button>
        </div>
      )}

      {pocetSezeni > 0 && (
        <div className="fc-stats-row">
          <div className="fc-stat-card">
            <span className="fc-stat-hodnota">{celkemOpakovani}</span>
            <span className="fc-stat-label">Dřepů celkem</span>
          </div>
          <div className="fc-stat-card">
            <span className="fc-stat-hodnota">{nejlepsiSezeni}</span>
            <span className="fc-stat-label">Nejlepší sezení</span>
          </div>
          <div className="fc-stat-card">
            <span className="fc-stat-hodnota">{pocetSezeni}</span>
            <span className="fc-stat-label">Sezení</span>
          </div>
        </div>
      )}

      {sezeni.length > 0 && (
        <div className="fc-list">
          {sezeni.slice(0, 10).map((s) => (
            <div key={s.id} className="fc-row">
              <span className="fc-row-icon" aria-hidden="true">
                🏋️
              </span>
              <div className="fc-row-mid">
                <span className="fc-row-title">{s.pocetOpakovani}× dřep</span>
                <span className="fc-row-sub">
                  {formatDatum(s.createdAt)} · {formatTrvani(s.trvaniSekund)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
