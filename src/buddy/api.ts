import { supabase } from '@/core/supabase/client'
import { BuddyZprava } from './types'

// ==========================================
// Jediné místo, které mluví s api/buddy-chat.ts — stejný princip jako
// social/api.ts pro Supabase. Server si klíč k OpenRouteru hlídá sám,
// tenhle soubor jen posílá historii rozhovoru a čeká na text odpovědi.
// ==========================================

export interface BuddyOdpovedVysledek {
  ok: boolean
  text?: string
  chyba?: string
}

export const zeptejSeBuddyho = async (historie: BuddyZprava[]): Promise<BuddyOdpovedVysledek> => {
  if (!supabase) {
    return { ok: false, chyba: 'Hlasový režim potřebuje přihlášený účet.' }
  }

  const { data: relace } = await supabase.auth.getSession()
  const token = relace.session?.access_token
  if (!token) {
    return { ok: false, chyba: 'Hlasový režim potřebuje přihlášený účet.' }
  }

  try {
    const odpoved = await fetch('/api/buddy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        historie: historie.map((z) => ({ odesilatel: z.odesilatel, text: z.text })),
      }),
    })

    const telo = await odpoved.json().catch(() => null)

    if (!odpoved.ok) {
      return { ok: false, chyba: telo?.chyba ?? 'Buddy teď neodpovídá.' }
    }

    return { ok: true, text: telo?.text ?? '' }
  } catch {
    // Typicky výpadek sítě — hlasový režim ho na rozdíl od zbytku appky
    // nepřežije, protože bez serveru není co poslouchat.
    return { ok: false, chyba: 'Nejde se připojit. Zkontroluj internet.' }
  }
}
