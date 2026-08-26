import { useCallback, useEffect, useState } from 'react'
import { useHasPermission } from '@/core/role'
import * as api from './api'
import { exportujVerejnyKlic, zajistiKlicovyPar } from './tajnyChatCrypto'
import type { TajnyChat } from './types'

// ==========================================
// Stav tajného chatu — oddělený od useSocial.ts schválně.
//
// Většina uživatelů nemá oprávnění 'social.secretChat' vůbec, takže
// nemá smysl tenhle dotaz tahat do hlavního useSocial() a spouštět ho
// při každém otevření Social pro každého. Kdo oprávnění nemá, dostane
// z tohohle hooku jen prázdný seznam bez jediného volání na Supabase.
// ==========================================

export const useTajnyChat = () => {
  const smim = useHasPermission('social.secretChat')

  const [chaty, setChaty] = useState<TajnyChat[]>([])
  const [nacita, setNacita] = useState(true)

  const obnovit = useCallback(async () => {
    if (!smim) {
      setChaty([])
      setNacita(false)
      return
    }
    setChaty(await api.nactiTajneChaty())
    setNacita(false)
  }, [smim])

  useEffect(() => {
    void obnovit()
  }, [obnovit])

  useEffect(() => {
    if (!smim) return
    return api.sledovatTajneChaty(() => void obnovit())
  }, [smim, obnovit])

  // Klíčový pár zařízení musí existovat a být nahraný na serveru dřív,
  // než ho o něj kdokoli druhý požádá — proto se řeší hned tady, při
  // vstupu do Social s oprávněním, ne až při otevření konkrétního chatu.
  // Kdo oprávnění nemá, se sem vůbec nedostane, žádný klíč se negeneruje
  // ani nenahrává zbytečně.
  useEffect(() => {
    if (!smim) return
    void (async () => {
      const { verejny } = await zajistiKlicovyPar()
      const base64 = await exportujVerejnyKlic(verejny)
      await api.nahrajVerejnyKlic(base64)
    })()
  }, [smim])

  // Pozvánky, co čekají na potvrzení přihlášeným — odznak na záložce.
  const cekajiciNaMe = chaty.filter((c) => c.stav === 'cekajici' && !c.zalozilJa).length

  return { smim, chaty, nacita, cekajiciNaMe, obnovit }
}

export type TajnyChatStav = ReturnType<typeof useTajnyChat>
