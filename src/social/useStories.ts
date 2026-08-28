import { useCallback, useEffect, useState } from 'react'
import { useAccount } from '@/core/supabase/auth'
import * as api from './api'
import type { StorySkupina } from './types'

// ==========================================
// Stav stories — vlastní hook, ne součást useSocial.ts.
//
// Stories se vykreslují jen v jednom pruhu na jedné obrazovce
// (StoriesBar.tsx uvnitř MujProfilPanel.tsx), ne kdekoli, kde je po
// ruce useSocial() — stejný "vlastní hook, ne zátěž pro hlavní stav"
// důvod jako u useTajnyChat.ts, jen tady na to (na rozdíl od tajného
// chatu) nemá vliv žádné oprávnění — Stories smí každý.
// ==========================================

export const useStories = () => {
  const maUcet = useAccount((s) => s.status === 'signed-in')

  const [skupiny, setSkupiny] = useState<StorySkupina[]>([])
  const [nacita, setNacita] = useState(true)

  const obnovit = useCallback(async () => {
    if (!maUcet) {
      setSkupiny([])
      setNacita(false)
      return
    }
    setSkupiny(await api.nactiStories())
    setNacita(false)
  }, [maUcet])

  useEffect(() => {
    void obnovit()
  }, [obnovit])

  // Živý pruh — bez tohohle by se čerstvá story od přítele objevila
  // až po ručním znovuotevření Social, stejný důvod jako u sledovatVazby
  // v useSocial.ts.
  useEffect(() => {
    if (!maUcet) return
    return api.sledovatStories(() => void obnovit())
  }, [maUcet, obnovit])

  return { skupiny, nacita, obnovit }
}
