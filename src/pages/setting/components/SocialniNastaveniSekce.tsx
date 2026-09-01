import React from 'react'
import { useSocial } from '@/social/useSocial'
import { NastaveniPanel } from '@/social/components/NastaveniPanel'
// Stejný důvod jako u ProfilSocialniSekce.tsx (viz jeho vlastní komentář):
// NastaveniPanel a to, co pod ním otevírá (BlokovaniPanel, ModeracePanel),
// používá `.social-*` třídy definované v SocialModule.css — ten se
// normálně načte jen s /social, ne s /nastaveni, takže bez explicitního
// importu by se tahle karta vykreslila bez stylů (stejná chyba, co se
// stala poprvé při stěhování stat/tab/grid CSS z ProfilModule.css).
import '@/social/SocialModule.css'

// ==========================================
// "Sociální nastavení" karta na appčině /nastaveni — Blokovaní a Hlášení,
// přesunuté sem z SocialModule.tsx's vlastní spodní lišty (Fáze 1
// přerozdělení Social menu). Spodní lišta tak ztrácí pátou položku a
// appka nemá dvě různá "Nastavení" v Socialu i mimo něj.
//
// Načítá se přes React.lazy z SettingsModule.tsx, ne top-level import —
// SettingsModule.tsx je eager (na rozdíl od SocialModule.tsx/GameModule.tsx),
// takže by natáhl celý useSocial() (přátelé/chaty/žádosti) do appčina
// hlavního balíčku i pro uživatele, co Social nikdy neotevřou. Vlastní,
// nezávislá instance useSocial() tu je stejný přijatý náklad jako
// u ProfilSocialniSekce.tsx/PratelSekce.tsx dřív — druhý round trip,
// když appku navštívíš na obou stránkách v jedné relaci.
//
// NastaveniPanel samotný zůstal beze změny — pořád je to menu dvou
// řádků, klepnutí otevře BlokovaniPanel/ModeracePanel na celou šířku
// karty s vlastním tlačítkem zpět, přesně jak fungoval uvnitř Social.
export const SocialniNastaveniSekce: React.FC = () => {
  const stav = useSocial()

  return <NastaveniPanel stav={stav} />
}

export default SocialniNastaveniSekce
