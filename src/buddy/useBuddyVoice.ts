import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ziskejHlasitost } from '@/core/store/useZvukStore'
import type { BuddyStav, BuddyZprava } from './types'
import type { BuddyDialogue } from './local/dialogue'

const JAZYK = 'cs-CZ'
const noveId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const CHYBY: Record<string, string> = {
  'not-allowed': 'Povol prosím aplikaci přístup k mikrofonu.',
  'audio-capture': 'Mikrofon není dostupný.',
  'no-speech': 'Nic jsem neslyšel. Zkus to znovu.',
  network: 'Rozpoznávání řeči na tomto zařízení potřebuje připojení.',
  'language-not-supported': 'Rozpoznávání češtiny tu není dostupné. Můžeš psát.',
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

/** Místní model a rozhovor; hlas zajišťují dostupné služby zařízení. */
export const useBuddyVoice = (): UseBuddyVoiceResult => {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const [stav, setStav] = useState<BuddyStav>('necinny')
  const [zpravy, setZpravy] = useState<BuddyZprava[]>([])
  const [chybaText, setChybaText] = useState<string | null>(null)
  const stavRef = useRef<BuddyStav>('necinny')
  const mounted = useRef(true)
  const processing = useRef(false)
  const sequence = useRef(0)
  const sessionVersion = useRef(0)
  const dialogue = useRef<BuddyDialogue | null>(null)
  const recognition = useRef<SpeechRecognition | null>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const speechTimeout = useRef<number | null>(null)

  const Recognition = typeof window === 'undefined'
    ? undefined : window.SpeechRecognition ?? window.webkitSpeechRecognition

  const zmenStav = useCallback((value: BuddyStav) => {
    stavRef.current = value
    if (mounted.current) setStav(value)
  }, [])

  const zastavHlas = useCallback(() => {
    utterance.current = null
    if (speechTimeout.current !== null) window.clearTimeout(speechTimeout.current)
    speechTimeout.current = null
    try { window.speechSynthesis?.cancel() } catch { /* Text zůstává dostupný. */ }
  }, [])

  const zastavMikrofon = useCallback(() => {
    const current = recognition.current
    recognition.current = null
    if (!current) return
    current.onresult = null
    current.onerror = null
    current.onend = null
    try { current.abort() } catch { /* Mikrofon už mohl být zastavený. */ }
  }, [])

  const zastavit = useCallback(() => {
    sequence.current += 1
    zastavMikrofon()
    zastavHlas()
    if (processing.current) {
      sessionVersion.current += 1
      dialogue.current?.reset()
      dialogue.current = null
    }
    processing.current = false
    zmenStav('necinny')
  }, [zastavMikrofon, zastavHlas, zmenStav])

  const vycistit = useCallback(() => {
    zastavit()
    sessionVersion.current += 1
    dialogue.current?.reset()
    dialogue.current = null
    setZpravy([])
    setChybaText(null)
  }, [zastavit])

  const promluv = useCallback((text: string) => {
    zastavHlas()
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined' ||
      ziskejHlasitost('buddy') === 0) {
      zmenStav('necinny')
      return
    }

    try {
      const speech = new SpeechSynthesisUtterance(text)
      speech.lang = JAZYK
      speech.volume = ziskejHlasitost('buddy')
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find((item) => item.lang.toLowerCase().startsWith('cs') && item.localService)
        ?? voices.find((item) => item.lang.toLowerCase().startsWith('cs'))
      if (voice) speech.voice = voice
      utterance.current = speech

      const finish = () => {
        if (utterance.current !== speech) return
        utterance.current = null
        if (speechTimeout.current !== null) window.clearTimeout(speechTimeout.current)
        speechTimeout.current = null
        if (stavRef.current === 'mluvi') zmenStav('necinny')
      }
      speech.onend = finish
      speech.onerror = finish
      zmenStav('mluvi')
      speechTimeout.current = window.setTimeout(() => {
        if (utterance.current !== speech) return
        zastavHlas()
        zmenStav('necinny')
      }, Math.max(5000, Math.min(30000, text.length * 100)))
      window.speechSynthesis.speak(speech)
    } catch {
      zastavHlas()
      zmenStav('necinny')
    }
  }, [zastavHlas, zmenStav])

  const ziskejRozhovor = useCallback(async (version: number): Promise<BuddyDialogue> => {
    if (dialogue.current) return dialogue.current
    // Kód a váhy se načtou až při prvním dotazu, nikoli při otevření Hubu.
    const [loader, conversation, actions] = await Promise.all([
      import('./local/modelLoader'),
      import('./local/dialogue'),
      import('./local/actions'),
    ])
    const model = await loader.loadBuddyModel()
    if (!mounted.current || version !== sessionVersion.current) {
      throw new DOMException('Rozhovor byl ukončen.', 'AbortError')
    }
    const current = conversation.createBuddyDialogue(
      model, actions.createBuddyActions((path) => navigateRef.current(path)),
    )
    dialogue.current = current
    return current
  }, [])

  const odpovez = useCallback(async (text: string) => {
    const currentSequence = ++sequence.current
    const version = sessionVersion.current
    processing.current = true
    zmenStav('premysli')
    setChybaText(null)

    try {
      const current = await ziskejRozhovor(version)
      if (!mounted.current || currentSequence !== sequence.current) return
      const answer = await current.reply(text)
      if (!mounted.current || currentSequence !== sequence.current) return
      setZpravy((previous) => [...previous, {
        id: noveId(), odesilatel: 'buddy' as const, text: answer,
      }].slice(-60))
      processing.current = false
      promluv(answer)
    } catch (error) {
      if (!mounted.current || currentSequence !== sequence.current) return
      setChybaText(error instanceof Error ? error.message : 'Buddyho odpověď se nepodařilo připravit.')
      zmenStav('chyba')
    } finally {
      if (currentSequence === sequence.current) processing.current = false
    }
  }, [ziskejRozhovor, promluv, zmenStav])

  const posliText = useCallback((text: string) => {
    const value = text.trim()
    if (!value || processing.current) return
    if (value.length > 500) {
      setChybaText('Zpráva může mít nejvýše 500 znaků.')
      zmenStav('chyba')
      return
    }
    zastavMikrofon()
    zastavHlas()
    setZpravy((previous) => [...previous, {
      id: noveId(), odesilatel: 'uzivatel' as const, text: value,
    }].slice(-60))
    void odpovez(value)
  }, [zastavMikrofon, zastavHlas, odpovez, zmenStav])

  const zacniMluvit = useCallback(() => {
    if (processing.current) return
    zastavHlas()
    zastavMikrofon()
    if (!Recognition) {
      setChybaText('Hlasový vstup tu není dostupný. Můžeš mi napsat.')
      zmenStav('chyba')
      return
    }

    try {
      const current = new Recognition()
      current.lang = JAZYK
      current.continuous = false
      current.interimResults = false
      current.maxAlternatives = 1
      current.onresult = (event) => {
        if (recognition.current !== current) return
        const text = event.results[0]?.[0]?.transcript
        zastavMikrofon()
        if (text?.trim()) posliText(text)
        else zmenStav('necinny')
      }
      current.onerror = (event) => {
        if (recognition.current !== current) return
        zastavMikrofon()
        if (event.error === 'aborted') { zmenStav('necinny'); return }
        setChybaText(CHYBY[event.error] ?? 'Rozpoznávání řeči se nepovedlo.')
        zmenStav('chyba')
      }
      current.onend = () => {
        if (recognition.current !== current) return
        recognition.current = null
        if (stavRef.current === 'posloucha') zmenStav('necinny')
      }
      recognition.current = current
      setChybaText(null)
      zmenStav('posloucha')
      current.start()
    } catch {
      zastavMikrofon()
      setChybaText('Mikrofon se nepodařilo spustit. Zkontroluj jeho oprávnění.')
      zmenStav('chyba')
    }
  }, [Recognition, zastavHlas, zastavMikrofon, posliText, zmenStav])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      sequence.current += 1
      sessionVersion.current += 1
      processing.current = false
      dialogue.current?.reset()
      dialogue.current = null
      zastavMikrofon()
      zastavHlas()
    }
  }, [zastavMikrofon, zastavHlas])

  return {
    stav, zpravy, chybaText,
    podporujeRozpoznavani: !!Recognition,
    zacniMluvit, posliText, zastavit, vycistit,
  }
                                        }
