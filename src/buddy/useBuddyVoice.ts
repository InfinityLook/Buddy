import { useCallback, useEffect, useRef, useState } from 'react'
import { zeptejSeBuddyho } from './api'
import { BuddyStav, BuddyZprava } from './types'

// ==========================================
// Hlasový Buddy — rozpoznávání řeči, syntéza řeči a rozhovor se serverem
// mimo React, stejný princip vlastnictví jako u kamery ve Form Checku
// (usePoseEngine.ts) nebo 3D scény v Game hubu: prohlížečovská API žijí
// v refech, React dostává jen to, co se má vykreslit.
//
// Rozhovor je "vysílačkový", ne nepřetržitě poslouchající: mikrofon se
// zapne jen po klepnutí a sám se vypne, jakmile člověk domluví. Bez
// tohohle by hrozila zpětná vazba — mikrofon by zaslechl Buddyho vlastní
// hlas ze syntézy řeči a appka by si "povídala sama se sebou". Dokud
// appka mluví, mikrofon je vždycky vypnutý; jsou to dva vzájemně se
// vylučující stavy, ne dva nezávislé přepínače.
// ==========================================

const JAZYK = 'cs-CZ'

const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const CHYBY_ROZPOZNAVANI: Record<string, string> = {
  'not-allowed': 'Přístup k mikrofonu je zakázaný. Povol ho v nastavení prohlížeče.',
  'audio-capture': 'Žádný mikrofon se nepodařilo najít.',
  network: 'Rozpoznávání řeči potřebuje internet.',
  'no-speech': 'Nic jsem neslyšel. Zkus to znovu.',
}

interface UseBuddyVoiceResult {
  stav: BuddyStav
  zpravy: BuddyZprava[]
  chybaText: string | null
  podporujeRozpoznavani: boolean
  zacniMluvit: () => void
  posliText: (text: string) => void
  zastavit: () => void
  vycistit: () => void
}

export const useBuddyVoice = (): UseBuddyVoiceResult => {
  const [stav, setStav] = useState<BuddyStav>('necinny')
  const [zpravy, setZpravy] = useState<BuddyZprava[]>([])
  const [chybaText, setChybaText] = useState<string | null>(null)

  const rozpoznavaniRef = useRef<SpeechRecognition | null>(null)
  const zpravyRef = useRef<BuddyZprava[]>([])
  zpravyRef.current = zpravy

  const TridaRozpoznavani =
    typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined

  const zastavitSyntezu = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  }

  const zastavitRozpoznavani = () => {
    rozpoznavaniRef.current?.abort()
    rozpoznavaniRef.current = null
  }

  const zastavit = useCallback(() => {
    zastavitRozpoznavani()
    zastavitSyntezu()
    setStav('necinny')
  }, [])

  const vycistit = useCallback(() => {
    zastavit()
    setZpravy([])
    setChybaText(null)
  }, [zastavit])

  // Buddyho odpověď se přečte nahlas a teprve po dočtení appka zase
  // čeká na klepnutí — jedno "kolo" rozhovoru je vždycky ukončené dřív,
  // než začne další.
  const promluv = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setStav('necinny')
      return
    }

    setStav('mluvi')
    const projev = new SpeechSynthesisUtterance(text)
    projev.lang = JAZYK

    const hlasy = window.speechSynthesis.getVoices()
    const ceskyHlas = hlasy.find((h) => h.lang?.toLowerCase().startsWith('cs'))
    if (ceskyHlas) projev.voice = ceskyHlas

    // Syntéza řeči je zdokumentovaně nespolehlivá napříč prohlížeči —
    // umí se stát, že po přepnutí karty na pozadí nezavolá ani onend,
    // ani onerror, a appka by pak zůstala navěky ve stavu "mluví" se
    // zamčeným mikrofonem. Záchranný časovač to po chvíli vrátí zpátky
    // i bez odpovědi od syntézy; zrušený je při skutečném konci hned.
    const zachranaMs = Math.max(4000, Math.min(20000, text.length * 90))
    const zachrana = window.setTimeout(() => setStav((s) => (s === 'mluvi' ? 'necinny' : s)), zachranaMs)

    const konec = () => {
      window.clearTimeout(zachrana)
      setStav((s) => (s === 'mluvi' ? 'necinny' : s))
    }
    projev.onend = konec
    projev.onerror = konec

    window.speechSynthesis.speak(projev)
  }, [])

  const posliDoServeru = useCallback(
    async (noveZpravy: BuddyZprava[]) => {
      setStav('premysli')
      setChybaText(null)

      const vysledek = await zeptejSeBuddyho(noveZpravy)

      if (!vysledek.ok || !vysledek.text) {
        setChybaText(vysledek.chyba ?? 'Buddy teď neodpovídá.')
        setStav('chyba')
        return
      }

      const odpovedZprava: BuddyZprava = { id: noveId(), odesilatel: 'buddy', text: vysledek.text }
      setZpravy((z) => [...z, odpovedZprava])
      promluv(vysledek.text)
    },
    [promluv]
  )

  const posliText = useCallback(
    (text: string) => {
      const ocisteny = text.trim()
      if (!ocisteny) return

      zastavitSyntezu()
      const zprava: BuddyZprava = { id: noveId(), odesilatel: 'uzivatel', text: ocisteny }
      const noveZpravy = [...zpravyRef.current, zprava]
      setZpravy(noveZpravy)
      void posliDoServeru(noveZpravy)
    },
    [posliDoServeru]
  )

  const zacniMluvit = useCallback(() => {
    if (!TridaRozpoznavani) {
      setChybaText('Tenhle prohlížeč neumí rozpoznávat řeč. Napiš to místo mluvení.')
      setStav('chyba')
      return
    }

    // Klepnutí uprostřed Buddyho odpovědi ji přeruší — člověk nemusí
    // čekat, až domluví, když už ví, co chce říct dál.
    zastavitSyntezu()
    zastavitRozpoznavani()

    const rozpoznavani = new TridaRozpoznavani()
    rozpoznavani.lang = JAZYK
    rozpoznavani.continuous = false
    rozpoznavani.interimResults = false
    rozpoznavani.maxAlternatives = 1

    rozpoznavani.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript
      if (text) posliText(text)
    }

    rozpoznavani.onerror = (event) => {
      // "aborted" přijde i po vlastním .abort() voláním výš — to není
      // chyba, kterou má smysl uživateli hlásit.
      if (event.error === 'aborted') return
      setChybaText(CHYBY_ROZPOZNAVANI[event.error] ?? 'Rozpoznávání řeči se nepovedlo.')
      setStav('chyba')
    }

    rozpoznavani.onend = () => {
      rozpoznavaniRef.current = null
      // Skončilo bez výsledku a bez chyby (ticho, nebo uživatel
      // nestihl nic říct) — appka se tiše vrátí, ať to jde zkusit znovu.
      setStav((s) => (s === 'posloucha' ? 'necinny' : s))
    }

    rozpoznavaniRef.current = rozpoznavani
    setChybaText(null)
    setStav('posloucha')
    rozpoznavani.start()
  }, [TridaRozpoznavani, posliText])

  // Úklid při odchodu z Hubu (zavření overlaye Buddyho) — bez tohohle
  // by mikrofon zůstal poslouchat a Buddy by dál mluvil na pozadí,
  // stejná past jako u kamery ve Form Checku.
  useEffect(() => {
    return () => {
      zastavitRozpoznavani()
      zastavitSyntezu()
    }
  }, [])

  return {
    stav,
    zpravy,
    chybaText,
    podporujeRozpoznavani: !!TridaRozpoznavani,
    zacniMluvit,
    posliText,
    zastavit,
    vycistit,
  }
}
