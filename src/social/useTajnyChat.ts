import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '@/core/supabase/auth'
import { useHasPermission } from '@/core/role'
import { showAppNotification } from '@/core/utils/notify'
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

// Který tajný chat je zrovna otevřený — jeho zprávy se neoznamují,
// stejný důvod jako u inbox.ts's otevrenyChat. Modulová proměnná místo
// dalšího zustand storu: SocialModule.tsx je jediný, kdo ji nastavuje
// (viz nastavOtevrenyTajnyChat), a čte se jen tady uvnitř jednoho odběru.
let otevrenyTajnyChatId: string | null = null

/** Volá SocialModule.tsx při otevření/zavření konkrétního tajného chatu. */
export const nastavOtevrenyTajnyChat = (id: string | null): void => {
  otevrenyTajnyChatId = id
}

export const useTajnyChat = () => {
  const smim = useHasPermission('social.secretChat')
  const mujId = useAccount((s) => s.userId)

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

  // Systémová notifikace na novou zprávu — obdoba inbox.ts pro messages,
  // schválně bez náhledu textu: appka ho tady nemá jak dešifrovat (klíč
  // se odvozuje jen uvnitř otevřeného TajnyChatView.tsx) a i kdyby měla,
  // notifikační lišta OS není zabezpečená plocha, na kterou by "tajný"
  // obsah patřil. Jméno odesílatele naproti tomu tajné není — je vidět
  // všude jinde v Social už teď.
  useEffect(() => {
    if (!smim) return

    return api.sledovatVsechnyTajneZpravy((zprava) => {
      if (zprava.odesilatelId === mujId) return
      if (zprava.chatId === otevrenyTajnyChatId) return

      void api.nactiProfil(zprava.odesilatelId).then((profil) => {
        void showAppNotification(
          `🔒 ${profil?.displayName ?? 'Tajný chat'}`,
          'Nová zpráva v tajném chatu.',
          `tajny-chat-${zprava.chatId}`
        )
      })
    })
  }, [smim, mujId])

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
