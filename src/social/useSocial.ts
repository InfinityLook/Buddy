import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '@/core/supabase/auth'
import * as api from './api'
import type { Chat, MujProfil, Pritel, SocialProfil, Zadost } from './types'

// ==========================================
// Stav sociální části.
//
// Data se drží tady a komponenty je jen vykreslují. Načítá se při
// otevření a po každé změně znovu — seznam přátel má jednotky položek,
// takže chytré doplňování by přineslo víc chyb než užitku.
// ==========================================

export const useSocial = () => {
  const status = useAccount((s) => s.status)
  const mujId = useAccount((s) => s.userId)

  const [profil, setProfil] = useState<MujProfil | null>(null)
  const [pratele, setPratele] = useState<Pritel[]>([])
  const [zadosti, setZadosti] = useState<Zadost[]>([])
  const [bloky, setBloky] = useState<SocialProfil[]>([])
  const [chaty, setChaty] = useState<Chat[]>([])
  const [nacita, setNacita] = useState(true)
  const [hlaska, setHlaska] = useState<string | null>(null)

  const maUcet = status === 'signed-in'

  const rekni = useCallback((text: string) => {
    setHlaska(text)
    window.setTimeout(() => setHlaska(null), 3200)
  }, [])

  const obnovit = useCallback(async () => {
    if (!maUcet) {
      setNacita(false)
      return
    }

    const [p, pr, z, b, ch] = await Promise.all([
      api.nactiMujProfil(),
      api.nactiPratele(),
      api.nactiZadosti(),
      api.nactiBloky(),
      api.nactiChaty(),
    ])

    setProfil(p)
    setPratele(pr)
    setZadosti(z)
    setBloky(b)
    setChaty(ch)
    setNacita(false)
  }, [maUcet])

  useEffect(() => {
    void obnovit()
  }, [obnovit])

  // Každá akce se chová stejně: provede se, ohlásí výsledek a načte
  // stav znovu. Díky tomu nemůže UI ukazovat něco jiného než databáze.
  const provest = useCallback(
    async (akce: () => Promise<{ ok: boolean; chyba?: string }>, uspech: string) => {
      const vysledek = await akce()
      rekni(vysledek.ok ? uspech : vysledek.chyba ?? 'Nepovedlo se to.')
      if (vysledek.ok) await obnovit()
      return vysledek.ok
    },
    [obnovit, rekni]
  )

  return {
    maUcet,
    status,
    mujId,
    profil,
    pratele,
    zadosti,
    bloky,
    chaty,
    nacita,
    hlaska,
    rekni,
    obnovit,
    provest,
  }
}

export type SocialStav = ReturnType<typeof useSocial>
