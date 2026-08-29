import React, { useEffect, useState } from 'react'
import * as socialApi from '@/social/api'
import * as adminApi from '../api'
import type { Hlaseni } from '@/social/types'

// ==========================================
// Hlášení ze Socialu, admin verze.
//
// Data i logika vyřízení jsou beze změny z social/api.ts — je to jediné
// místo, které smí mluvit se Supabase (viz komentář tam), takže se
// odsud jen volá, nekopíruje. Tenhle panel navíc u každého hlášení
// ukazuje syrové id nahlášeného, ne jen jméno — jméno si každý smí
// kdykoliv změnit, ban i tlačítko pod ním se proto váže na id.
// ==========================================

const cas = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

export const SocialReportPanel: React.FC = () => {
  const [hlaseni, setHlaseni] = useState<Hlaseni[]>([])
  const [banovani, setBanovani] = useState<Set<string>>(new Set())
  const [appBanovani, setAppBanovani] = useState<Record<string, boolean>>({})
  const [nacita, setNacita] = useState(true)
  const [jenNevyrizena, setJenNevyrizena] = useState(true)
  const [hlaska, setHlaska] = useState<string | null>(null)

  const nacti = async () => {
    const [h, b] = await Promise.all([socialApi.nactiHlaseni(), adminApi.nactiSocialBany()])
    setHlaseni(h)
    setBanovani(b)
    setNacita(false)

    // Stav banu z celé appky se dotahuje zvlášť, jen pro id, která se
    // v hlášeních doopravdy objevila — ne pro každého uživatele appky.
    const idsNahlasenych = [...new Set(h.map((z) => z.nahlaseny?.id).filter((id): id is string => !!id))]
    setAppBanovani(await adminApi.nactiAppBanStavy(idsNahlasenych))
  }

  useEffect(() => {
    void nacti()
  }, [])

  const oznam = (text: string) => {
    setHlaska(text)
    window.setTimeout(() => setHlaska(null), 2800)
  }

  const vyridit = async (id: string, vysledek: 'vyreseno' | 'zamitnuto') => {
    const v = await socialApi.vyriditHlaseni(id, vysledek)
    oznam(v.ok ? 'Hlášení vyřízeno.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  // Smaže přímo nahlášenou zprávu (měkce, viz smazatZpravu v api.ts) —
  // moderátor tak nemusí čekat na admina s přístupem k banu, aby zmizel
  // konkrétní urážlivý obsah. Hlášení samo tím nezmizí, jen se dá i tak
  // vyřídit stejně jako dřív.
  const smazatNahlasenouZpravu = async (zpravaId: string) => {
    if (!window.confirm('Smazat nahlášenou zprávu? Uvidí, že tam zpráva byla, ne co v ní bylo.')) return

    const v = await socialApi.smazatZpravu(zpravaId)
    oznam(v.ok ? 'Zpráva smazána.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  // Smaže přímo nahlášený příspěvek (natvrdo, viz smazatNahlasenyPrispevek
  // v api.ts) — na rozdíl od zprávy výš appka nemá jak zprávu "jen
  // schovat", posts se u vlastníka mažou natvrdo taky, moderátorská
  // cesta se v tomhle od běžné appky neliší.
  const smazatNahlasenyPrispevek = async (postId: string) => {
    if (!window.confirm('Smazat nahlášený příspěvek? Nejde to vrátit zpátky.')) return

    const v = await socialApi.smazatNahlasenyPrispevek(postId)
    oznam(v.ok ? 'Příspěvek smazán.' : v.chyba ?? 'Nepovedlo se to.')
    if (v.ok) await nacti()
  }

  const prepnoutBan = async (uzivatelId: string, jmeno: string, zabanovat: boolean) => {
    const v = await adminApi.zabanujZeSocial(uzivatelId, zabanovat)
    oznam(
      v.ok
        ? zabanovat
          ? `${jmeno} má teď zakázaný Social.`
          : `${jmeno} má Social zase povolený.`
        : v.chyba ?? 'Nepovedlo se to.'
    )
    if (v.ok) await nacti()
  }

  const prepnoutAppBan = async (uzivatelId: string, jmeno: string, zabanovat: boolean) => {
    // Tohle je nevratné v tom smyslu, že dotčený se hned neodhlásí sám
    // — zamyká celý účet na všech zařízeních, ne jen jednu funkci.
    if (zabanovat && !window.confirm(`Opravdu zabanovat ${jmeno} z celé aplikace? Nepůjde se přihlásit na žádném zařízení.`)) {
      return
    }

    const v = await adminApi.zabanujCelouAppku(uzivatelId, zabanovat)
    oznam(
      v.ok
        ? zabanovat
          ? `${jmeno} je zabanovaný z celé appky.`
          : `${jmeno} se zase může přihlásit.`
        : v.chyba ?? 'Nepovedlo se to.'
    )
    if (v.ok) setAppBanovani((s) => ({ ...s, [uzivatelId]: zabanovat }))
  }

  const zobrazena = jenNevyrizena ? hlaseni.filter((h) => h.stav === 'nevyrizeno') : hlaseni
  const cekajicich = hlaseni.filter((h) => h.stav === 'nevyrizeno').length

  // Kolikrát byl kdo celkem nahlášen — počítá se z už načtených hlaseni,
  // žádný nový dotaz navíc. Ukazuje se jen u opakovaných nahlášení, ať
  // moderátor pozná někoho, koho hlásí víc lidí, ne jednorázový spor.
  const pocetNahlaseni = new Map<string, number>()
  for (const h of hlaseni) {
    if (!h.nahlaseny) continue
    pocetNahlaseni.set(h.nahlaseny.id, (pocetNahlaseni.get(h.nahlaseny.id) ?? 0) + 1)
  }

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-title">SocialReport ({cekajicich} čeká)</span>
        <button className="admin-btn admin-btn--tlumene" onClick={() => setJenNevyrizena((v) => !v)}>
          {jenNevyrizena ? 'Zobrazit vše' : 'Jen nevyřízená'}
        </button>
      </div>

      {nacita ? (
        <p className="admin-empty">Načítám…</p>
      ) : zobrazena.length === 0 ? (
        <p className="admin-empty">{jenNevyrizena ? 'Nic nečeká na vyřízení.' : 'Žádná hlášení.'}</p>
      ) : (
        <div className="admin-report-list">
          {zobrazena.map((h) => (
            <article key={h.id} className={`admin-report is-${h.stav}`}>
              <div className="admin-report-head">
                <span className="admin-report-duvod">{socialApi.popisDuvodu(h.duvod)}</span>
                <span className="admin-report-cas">{cas(h.createdAt)}</span>
              </div>

              <p className="admin-report-radek">
                <strong>{h.hlasil?.displayName ?? 'Neznámý'}</strong>
                <span className="admin-report-id">{h.hlasil?.id ?? '—'}</span>
                nahlásil
                <strong>{h.nahlaseny?.displayName ?? 'neznámého'}</strong>
                <span className="admin-report-id">{h.nahlaseny?.id ?? '—'}</span>
                {h.nahlaseny && (pocetNahlaseni.get(h.nahlaseny.id) ?? 0) > 1 && (
                  <span className="admin-report-opakovane">
                    ⚠️ nahlášen {pocetNahlaseni.get(h.nahlaseny.id)}×
                  </span>
                )}
              </p>

              {h.poznamka && <p className="admin-report-poznamka">„{h.poznamka}“</p>}
              {h.zprava && (
                <div className="admin-report-zprava-radek">
                  <p className="admin-report-zprava">Nahlášená zpráva: „{h.zprava}“</p>
                  {h.zpravaId && h.zprava !== '(zpráva byla smazána)' && h.zprava !== '(zpráva už neexistuje)' && (
                    <button
                      className="admin-icon-btn"
                      aria-label="Smazat nahlášenou zprávu"
                      onClick={() => smazatNahlasenouZpravu(h.zpravaId!)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              )}

              {h.postId && (
                <div className="admin-report-zprava-radek">
                  {h.postMediaUrl ? (
                    h.postMediaType === 'video' ? (
                      <video src={h.postMediaUrl} className="admin-report-prispevek-nahled" muted />
                    ) : (
                      <img src={h.postMediaUrl} alt="" className="admin-report-prispevek-nahled" />
                    )
                  ) : (
                    <p className="admin-report-zprava">Nahlášený příspěvek už neexistuje.</p>
                  )}
                  {h.postMediaUrl && (
                    <button
                      className="admin-icon-btn"
                      aria-label="Smazat nahlášený příspěvek"
                      onClick={() => smazatNahlasenyPrispevek(h.postId!)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              )}

              {h.nahlaseny && (
                <div className="admin-report-akce">
                  {banovani.has(h.nahlaseny.id) ? (
                    <button
                      className="admin-btn admin-btn--ano"
                      onClick={() => prepnoutBan(h.nahlaseny!.id, h.nahlaseny!.displayName, false)}
                    >
                      ✓ Zase povolit Social
                    </button>
                  ) : (
                    <button
                      className="admin-btn admin-btn--ne"
                      onClick={() => prepnoutBan(h.nahlaseny!.id, h.nahlaseny!.displayName, true)}
                    >
                      ⛔ Zakázat Social
                    </button>
                  )}

                  {appBanovani[h.nahlaseny.id] ? (
                    <button
                      className="admin-btn admin-btn--ano"
                      onClick={() => prepnoutAppBan(h.nahlaseny!.id, h.nahlaseny!.displayName, false)}
                    >
                      ✓ Zase povolit appku
                    </button>
                  ) : (
                    <button
                      className="admin-btn admin-btn--zavazne"
                      onClick={() => prepnoutAppBan(h.nahlaseny!.id, h.nahlaseny!.displayName, true)}
                    >
                      🚫 Zakázat celou appku
                    </button>
                  )}
                </div>
              )}

              {h.stav === 'nevyrizeno' ? (
                <div className="admin-report-akce">
                  <button className="admin-btn admin-btn--ano" onClick={() => vyridit(h.id, 'vyreseno')}>
                    ✓ Vyřešeno
                  </button>
                  <button className="admin-btn admin-btn--ne" onClick={() => vyridit(h.id, 'zamitnuto')}>
                    ✕ Zamítnout
                  </button>
                </div>
              ) : (
                <span className={`admin-report-stav admin-report-stav--${h.stav}`}>
                  {h.stav === 'vyreseno' ? 'Vyřešeno' : 'Zamítnuto'}
                  {h.vyrizenoAt ? ` · ${cas(h.vyrizenoAt)}` : ''}
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {hlaska && <div className="admin-toast">{hlaska}</div>}
    </section>
  )
}
