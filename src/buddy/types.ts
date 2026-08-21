// ==========================================
// Tvary dat hlasového Buddyho.
// ==========================================

export type BuddyOdesilatel = 'uzivatel' | 'buddy'

export interface BuddyZprava {
  id: string
  odesilatel: BuddyOdesilatel
  text: string
}

/**
 * necinny    — čeká na klepnutí, ať mluví uživatel
 * posloucha  — rozpoznávání řeči běží
 * premysli   — zpráva odešla na server, čeká se na Gemini
 * mluvi      — Buddy nahlas čte odpověď
 * chyba      — něco selhalo, text chyby je v BuddyVoiceResult.chyba
 */
export type BuddyStav = 'necinny' | 'posloucha' | 'premysli' | 'mluvi' | 'chyba'
