import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured } from '@/core/supabase/client'
import { nactiPritomnostPratel, sledovatPritomnostPratel, zaznamenejPritomnost } from './api'

// ==========================================
// Online/offline mezi přáteli — appka-wide, ne jen uvnitř otevřeného
// chatu (to zůstává sledovatPritomnost v api.ts, beze změny). "Online"
// appka neurčuje přes skutečný živý kanál, ale jako "poslední záznam
// je čerstvější než tenhle práh" — proto potřebuje dvě věci: kdo píše
// svůj vlastní tep (startPresence, volané jednou z App.tsx) a kdo ten
// zápis čte a vyhodnocuje (useOnlineFriends, volané ze Social's
// komponent, které přátele vypisují).
// ==========================================

// Interval, s jakým appka zapisuje "jsem tu" — dost husté na to, aby
// odchod z appky (zavření tabu, uzamčení telefonu) byl vidět do
// necelé minuty, dost řídké na to, aby to nebyla zbytečná zátěž.
const TEP_MS = 25_000

// O kolik delší než TEP_MS musí být práh "ještě online" — jeden
// vynechaný tep (výpadek sítě, appka na chvíli na pozadí) nesmí hned
// sundat zelenou tečku, teprve dva za sebou.
const JE_ONLINE_PRAH_MS = TEP_MS * 2 + 5_000

let started = false

/**
 * Spustí se jednou z App.tsx, mimo Social — appka potřebuje vědět, že
 * je uživatel aktivní, i když je zrovna v Hubu nebo v miniapp, ne jen
 * když má otevřený Social. Bez účtu (nebo bez nastaveného cloudu) se
 * každý tep tiše přeskočí uvnitř zaznamenejPritomnost() samotné.
 */
export const startPresence = (): void => {
  if (started || !isSupabaseConfigured) return
  started = true

  const tep = () => {
    if (document.visibilityState === 'visible') void zaznamenejPritomnost()
  }

  tep()
  window.setInterval(tep, TEP_MS)
  // Návrat k appce (probuzení telefonu, přepnutí zpátky na tab) je
  // nejlepší chvíle poslat tep hned, ne čekat na další pravidelný tik.
  document.addEventListener('visibilitychange', tep)
}

/**
 * Kdo z přátel je právě "online" — appka to nepočítá jen jednou při
 * načtení dat, ale znovu každých pár vteřin (viz interval níž), jinak
 * by tečka u přítele, co appku zavřel, zůstala zelená až do další
 * živé události, která nemusí přijít vůbec.
 */
export const useOnlineFriends = (): Set<string> => {
  const [lastSeen, setLastSeen] = useState<Map<string, string>>(new Map())
  const [ted, setTed] = useState(() => Date.now())

  useEffect(() => {
    let platne = true
    void nactiPritomnostPratel().then((m) => platne && setLastSeen(m))
    return () => {
      platne = false
    }
  }, [])

  useEffect(() => {
    return sledovatPritomnostPratel((userId, lastSeenAt) =>
      setLastSeen((s) => new Map(s).set(userId, lastSeenAt))
    )
  }, [])

  // Přepočet "kdo je ještě v prahu" bez nové živé události — appka
  // otevřená delší dobu jinak nikdy nezjistí, že přítel mezitím appku
  // zavřel a jeho poslední tep už je moc starý.
  useEffect(() => {
    const i = window.setInterval(() => setTed(Date.now()), 10_000)
    return () => window.clearInterval(i)
  }, [])

  return useMemo(() => {
    const online = new Set<string>()
    for (const [userId, iso] of lastSeen) {
      if (ted - new Date(iso).getTime() < JE_ONLINE_PRAH_MS) online.add(userId)
    }
    return online
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSeen, ted])
}
