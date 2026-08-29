import React, { useEffect, useState } from 'react'
import * as api from '../api'
import type { Zvyrazneni } from '../types'

interface Props {
  mujId: string
  mediaPath: string
  mediaType: 'image' | 'video'
  caption: string | null
  onZavrit: () => void
  onHotovo: (hlaska: string) => void
}

// ==========================================
// Přidat aktuální story do zvýraznění — stejný malý dialogový tvar jako
// NahlasitDialog.tsx/SdiletPrispevekDialog.tsx (.social-overlay +
// .social-dialog, žádný portál), otevírá se jen ze StoryProhlizec.tsx
// na vlastní story (jeMoje). Appka tu vytváření a přidávání nerozlišuje
// jako dva různé kroky uživatele — klepnutí na existující zvýraznění ho
// rovnou naplní, "Nové zvýraznění" jen otevře pole na název a odešle
// stejným tlačítkem.
// ==========================================
export const PridatDoZvyrazneniDialog: React.FC<Props> = ({
  mujId,
  mediaPath,
  mediaType,
  caption,
  onZavrit,
  onHotovo,
}) => {
  const [zvyrazneni, setZvyrazneni] = useState<Zvyrazneni[] | null>(null)
  const [pridavaId, setPridavaId] = useState<string | null>(null)
  const [noveOtevreno, setNoveOtevreno] = useState(false)
  const [novyNazev, setNovyNazev] = useState('')
  const [zaklada, setZaklada] = useState(false)

  useEffect(() => {
    let platne = true
    void api.nactiZvyrazneni(mujId).then((z) => platne && setZvyrazneni(z))
    return () => {
      platne = false
    }
  }, [mujId])

  const pridat = async (highlightId: string) => {
    if (pridavaId) return
    setPridavaId(highlightId)
    const v = await api.pridatDoZvyrazneni(highlightId, mediaPath, mediaType, caption)
    setPridavaId(null)
    if (v.ok) onHotovo('Přidáno do zvýraznění.')
    else onHotovo(v.chyba ?? 'Nepovedlo se to.')
  }

  const zalozit = async () => {
    if (zaklada || !novyNazev.trim()) return
    setZaklada(true)
    const v = await api.vytvoritZvyrazneniZeStory(novyNazev, mediaPath, mediaType, caption)
    setZaklada(false)
    if (v.ok) onHotovo('Zvýraznění vytvořeno.')
    else onHotovo(v.chyba ?? 'Nepovedlo se to.')
  }

  return (
    <>
      <div className="social-overlay" onClick={onZavrit} />
      <div className="social-dialog">
        <h3 className="social-dialog-title">Přidat do zvýraznění</h3>
        <p className="social-dialog-sub">
          Zvýraznění zůstane na profilu natrvalo, i až tahle story sama zmizí.
        </p>

        <div className="social-sledujici-seznam">
          {zvyrazneni === null ? (
            <p className="social-empty-note">Načítám…</p>
          ) : zvyrazneni.length === 0 ? (
            <p className="social-empty-note">Zatím žádné zvýraznění.</p>
          ) : (
            zvyrazneni.map((z) => (
              <div key={z.id} className="social-row">
                <span className="social-row-otevrit">
                  <span className="social-zvyrazneni-obalka social-zvyrazneni-obalka--mala">
                    {z.obalkaUrl ? <img src={z.obalkaUrl} alt="" /> : <span>✨</span>}
                  </span>
                  <span className="social-row-name">{z.nazev}</span>
                </span>
                <button
                  className="social-btn social-btn--small"
                  disabled={pridavaId === z.id}
                  onClick={() => void pridat(z.id)}
                >
                  {pridavaId === z.id ? 'Přidávám…' : 'Přidat'}
                </button>
              </div>
            ))
          )}
        </div>

        {noveOtevreno ? (
          <form
            className="social-zvyrazneni-nove-formular"
            onSubmit={(e) => {
              e.preventDefault()
              void zalozit()
            }}
          >
            <input
              className="social-input social-input--full"
              placeholder="Název (např. Výlety)"
              value={novyNazev}
              maxLength={30}
              autoFocus
              onChange={(e) => setNovyNazev(e.target.value)}
            />
            <button className="social-btn social-btn--full" type="submit" disabled={zaklada || !novyNazev.trim()}>
              {zaklada ? 'Zakládám…' : 'Vytvořit a přidat'}
            </button>
          </form>
        ) : (
          <button className="social-btn social-btn--full social-btn--tlumene" onClick={() => setNoveOtevreno(true)}>
            + Nové zvýraznění
          </button>
        )}

        <button className="social-btn social-btn--full social-btn--tlumene" onClick={onZavrit}>
          Zavřít
        </button>
      </div>
    </>
  )
}
