import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ==========================================
// Připojení na Supabase.
//
// SchoolBuddy je offline-first: cloud je doplněk, ne podmínka běhu.
// Když proměnné prostředí chybí (lokální build, nasazení bez nastavení),
// zůstane klient null a celá synchronizace se tiše přeskočí — aplikace
// funguje dál nad localStorage přesně jako dřív.
//
// Klíč je "publishable", tedy určený k tomu, aby ležel ve staženém
// JavaScriptu. Data nechrání on, ale pravidla RLS v databázi, která
// pouští uživatele jen k jeho vlastním řádkům.
// ==========================================

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Aplikace nepoužívá přihlášení přes odkaz v e-mailu, takže není
        // co vytahovat z adresy — a ušetří se zbytečná práce při startu.
        detectSessionInUrl: false,
      },
    })
  : null
