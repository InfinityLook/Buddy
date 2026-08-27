import React, { useEffect, useRef, useState } from 'react'
import { APP_VERSION, applyUpdateNow, hasNewerVersion } from '@/core/utils/registerSW'
import mascot from '@/assets/mascot.png'
import './BootGate.css'

// ==========================================
// Úvodní obrazovka, která proběhne dřív než zbytek aplikace.
//
// Aktualizace sice hlídá service worker i public/js/auto-update.js, jenže
// oba běží až vedle už vykreslené aplikace — uživatel tedy chvíli kouká na
// starou verzi a pak mu ji obnova vytrhne pod rukama. Tahle brána kontrolu
// udělá jako první věc a pustí dovnitř až hotovou verzi.
//
// Nikdy ale nesmí uživatele zavřít venku: offline, pomalá síť i opakovaně
// nepovedená aktualizace vedou k tomu, že se aplikace prostě spustí.
// ==========================================

// Nad tenhle čas se nečeká za žádných okolností — offline-first aplikace
// se musí spustit i s rozbitou sítí.
const MAX_WAIT_MS = 5000

// Aby splash jen neproblikl, když je odpověď blesková
const MIN_SPLASH_MS = 300

// Jak dlouho je vidět hláška o stahování, než stránku pustíme do restartu.
// Bez toho by applyUpdateNow() navigoval tak rychle, že by si uživatel
// vůbec nevšiml, že se něco aktualizovalo.
const UPDATE_NOTICE_MS = 800

// Kolikrát smí brána kvůli jedné verzi zablokovat start. Jednou stačí:
// když ani potom verze nesedí (typicky rozjeté nasazení, kdy version.json
// ohlašuje build, který ještě není nahraný), pustíme uživatele dál
// a zbytek necháme na hlídači na pozadí.
const MAX_BLOCKING_RELOADS = 1
const ATTEMPT_KEY = 'sb:boot-update-attempts'

const isDevHost = () => {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local')
}

const readAttempts = (): number => {
  try {
    return Number(sessionStorage.getItem(ATTEMPT_KEY)) || 0
  } catch {
    return 0
  }
}

const noteAttempt = () => {
  try {
    sessionStorage.setItem(ATTEMPT_KEY, String(readAttempts() + 1))
  } catch {
    /* Privátní režim bez sessionStorage — pojistka nebude fungovat */
  }
}

const clearAttempts = () => {
  try {
    sessionStorage.removeItem(ATTEMPT_KEY)
  } catch {
    /* nic */
  }
}

type Phase = 'checking' | 'updating'

interface BootGateProps {
  children: React.ReactNode
}

export const BootGate: React.FC<BootGateProps> = ({ children }) => {
  // Ve vývoji a offline nemá smysl start zdržovat ani o milisekundu
  const [ready, setReady] = useState(() => isDevHost() || navigator.onLine === false)
  const [phase, setPhase] = useState<Phase>('checking')
  const finished = useRef(false)

  useEffect(() => {
    if (ready) return

    const startedAt = Date.now()

    // Splash pustíme dál, ale ne dřív než po MIN_SPLASH_MS, ať jen neproblikne
    const release = () => {
      if (finished.current) return
      finished.current = true
      const zbyva = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt))
      window.setTimeout(() => setReady(true), zbyva)
    }

    // Pojistka proti pomalé nebo zaseklé síti — po MAX_WAIT_MS jdeme dovnitř
    // bez ohledu na to, jak kontrola dopadla.
    const timeout = window.setTimeout(release, MAX_WAIT_MS)

    const run = async () => {
      try {
        // Verzi porovnáváme vždycky, i když je pojistka vyčerpaná — jinak by
        // se počítadlo po povedené aktualizaci nikdy nevynulovalo a brána by
        // zůstala do konce sezení vypnutá.
        const newer = await hasNewerVersion()
        if (finished.current) return

        if (!newer) {
          clearAttempts()
          release()
          return
        }

        if (readAttempts() >= MAX_BLOCKING_RELOADS) {
          // Restartovali jsme se už jednou a verze pořád nesedí — typicky
          // rozjeté nasazení. Pustíme uživatele dovnitř a zbytek necháme
          // na hlídači na pozadí.
          console.warn('[boot] Aktualizace se nepovedla ani na druhý pokus, spouštím aplikaci.')
          release()
          return
        }

        setPhase('updating')
        noteAttempt()
        window.clearTimeout(timeout)

        // Chvíli hlášku podržíme, ať uživatel stihne přečíst, co se děje
        await new Promise((resolve) => window.setTimeout(resolve, UPDATE_NOTICE_MS))

        // applyUpdateNow zahodí cache, odregistruje SW a stránku znovu načte,
        // takže tenhle komponent skončí i s ní. Splash zůstane do konce vidět.
        await applyUpdateNow()
      } catch (error) {
        console.warn('[boot] Kontrola aktualizace selhala, spouštím aplikaci:', error)
        release()
      }
    }

    void run()

    return () => window.clearTimeout(timeout)
  }, [ready])

  if (ready) return <>{children}</>

  return (
    <div className="boot-gate" role="status" aria-live="polite">
      <div className="boot-gate-inner">
        <img src={mascot} alt="" className="boot-gate-mascot" />

        <div className="boot-gate-brand">
          <span className="boot-gate-mark">✦</span>
          <span className="boot-gate-name">Buddy</span>
        </div>

        <div className="boot-gate-bar" aria-hidden="true">
          <span className="boot-gate-bar-fill" />
        </div>

        <p className="boot-gate-status">
          {phase === 'updating' ? 'Stahuji novou verzi…' : 'Kontroluji aktualizace…'}
        </p>
      </div>

      <span className="boot-gate-version">verze {APP_VERSION}</span>
    </div>
  )
}

export default BootGate
