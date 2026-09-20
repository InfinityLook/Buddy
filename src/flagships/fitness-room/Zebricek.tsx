import React, { useEffect, useState } from 'react'
import { getRole } from '@/core/role'
import { useAccount } from '@/core/supabase/auth'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { nactiZebricekFitness, nactiMojePoradiZebricku, type RadekZebricku, type MojePoradi } from './zebricekApi'
import './Zebricek.css'

// ==========================================
// Fitness Roomův žebříček (Fáze 4 vylepšování) — vlastní podobrazovka,
// ne panel na dashboardu (uživatelovo rozhodnutí přes AskUserQuestion).
// Seřazeno podle celkového fitness XP (workout/behani/posilovna/
// mobilita, viz useGamificationStore.ts's FITNESS_KINDY) — a je
// SCHVÁLNĚ globální, ne jen mezi přáteli, jiná volba, než jakou appka
// jinde v Social dělá.
//
// Tohle NENÍ tichá odchylka od appčiny obvyklé zdrženlivosti
// ("najdi_podle_kodu"/"hledej_podle_jmena" místo veřejného adresáře) —
// odhalení je stejné jako u jmenného vyhledávání, co appka už dřív
// dala k dispozici komukoli přihlášenému: jméno + avatar + role, nic
// navíc, capped na 50 řádků, oboustranně blokovaní se navzájem
// nevidí (nacti_zebricek_fitness()/muj_zebricek_radek() v databázi).
// ==========================================

interface ZebricekProps {
  onZavrit: () => void
}

type Stav = 'nacita' | 'hotovo' | 'chyba'

export const Zebricek: React.FC<ZebricekProps> = ({ onZavrit }) => {
  const mujId = useAccount((s) => s.userId)
  const [stav, setStav] = useState<Stav>('nacita')
  const [radky, setRadky] = useState<RadekZebricku[]>([])
  const [mojePoradi, setMojePoradi] = useState<MojePoradi | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStav('chyba')
      return
    }
    let zruseno = false
    Promise.all([nactiZebricekFitness(), nactiMojePoradiZebricku()])
      .then(([zebricekRadky, poradi]) => {
        if (zruseno) return
        setRadky(zebricekRadky)
        setMojePoradi(poradi)
        setStav('hotovo')
      })
      .catch(() => {
        if (!zruseno) setStav('chyba')
      })
    return () => {
      zruseno = true
    }
  }, [])

  // Jsem-li ve viditelném žebříčku, netřeba druhou "Tvoje pozice" řádku
  // navíc — je vidět mezi ostatními.
  const jsemViditelny = mujId !== null && radky.some((r) => r.id === mujId)

  return (
    <div className="zeb-overlay" role="dialog" aria-modal="true" aria-label="Žebříček fitness XP">
      <div className="zeb-karta">
        <button type="button" className="zeb-zavrit" onClick={onZavrit} aria-label="Zavřít">
          ✕
        </button>

        <h2 className="zeb-nadpis">🏆 Žebříček</h2>
        <p className="zeb-podnadpis">Celkové fitness XP ze všech nástrojů v Roomu</p>

        {stav === 'nacita' && <p className="zeb-stav-text">Načítám…</p>}

        {stav === 'chyba' && (
          <p className="zeb-stav-text">Žebříček teď není k dispozici — zkus to znovu, až budeš online.</p>
        )}

        {stav === 'hotovo' && (
          <>
            {radky.length === 0 && (
              <p className="zeb-stav-text">Zatím v žebříčku nikdo není — buď první!</p>
            )}

            {radky.length > 0 && (
              <ol className="zeb-seznam">
                {radky.map((radek, index) => {
                  const role = getRole(radek.role)
                  const jsemTo = radek.id === mujId
                  return (
                    <li key={radek.id} className={`zeb-radek ${jsemTo ? 'zeb-radek--ja' : ''}`}>
                      <span className="zeb-poradi">{index + 1}.</span>
                      <span className="zeb-avatar" aria-hidden="true">
                        {radek.avatarUrl ? (
                          <img src={radek.avatarUrl} alt="" />
                        ) : (
                          radek.displayName.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="zeb-jmeno">
                        {radek.displayName}
                        {role.id !== 'user' && (
                          <span className={`zeb-role-tag zeb-role-tag--${role.tone}`}>
                            {role.icon} {role.title}
                          </span>
                        )}
                      </span>
                      <span className="zeb-xp">{radek.fitnessXp} XP</span>
                    </li>
                  )
                })}
              </ol>
            )}

            {!jsemViditelny && mojePoradi && mojePoradi.poradi !== null && (
              <p className="zeb-moje-poradi">
                Tvoje pozice: <strong>#{mojePoradi.poradi}</strong> · {mojePoradi.fitnessXp} XP
              </p>
            )}

            {!jsemViditelny && mojePoradi && mojePoradi.poradi === null && (
              <p className="zeb-moje-poradi">Zatím nemáš žádné fitness XP — trénuj a objev se v žebříčku!</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Zebricek
