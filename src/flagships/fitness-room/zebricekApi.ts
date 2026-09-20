import { supabase } from '@/core/supabase/client'

// ==========================================
// Fitness Roomův žebříček (Fáze 4) — vlastní, malý Supabase volající
// soubor, ne social/api.ts. Žebříček není Social (nejde o přátelství,
// chat ani blokování jako takové), jen znovupoužívá stejnou hranici
// blokování (je_blokovan_se_mnou) uvnitř svých dvou SECURITY DEFINER
// funkcí — stejný "vlastní malý soubor pro odlišnou starost" precedens
// jako core/support/api.ts nebo core/notifications/api.ts, ne natažení
// social/api.ts's "jediné místo, co mluví se Supabase" na věc, co se
// Social netýká.
//
// Žebříček je záměrně globální, ne jen mezi přáteli (viz CLAUDE.md pro
// zdůvodnění) — stejná úroveň odhalení jména/avataru, jakou appka už
// dává komukoli přes hledej_podle_jmena.
// ==========================================

export interface RadekZebricku {
  id: string
  displayName: string
  avatarUrl: string | null
  role: string
  fitnessXp: number
}

export interface MojePoradi {
  fitnessXp: number
  // null, dokud fitnessXp není kladné — appka si nevymýšlí pořadí pro
  // někoho, kdo se v žebříčku vůbec neobjevuje.
  poradi: number | null
}

/** Vrátí top žebříček (nejvýš 50 řádků) — prázdné pole při chybě nebo
 *  bez konfigurace, appka bez cloudu prostě ukáže "zatím žádná data". */
export const nactiZebricekFitness = async (): Promise<RadekZebricku[]> => {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('nacti_zebricek_fitness')
  if (error || !data) return []
  return data.map((r: any) => ({
    id: r.id,
    displayName: r.display_name ?? 'Uživatel',
    avatarUrl: r.avatar_url ?? null,
    role: r.role ?? 'user',
    fitnessXp: r.fitness_xp ?? 0,
  }))
}

/** Vrátí vlastní fitness XP a poctivé pořadí — i mimo viditelných top
 *  50, viz muj_zebricek_radek() v databázi. */
export const nactiMojePoradiZebricku = async (): Promise<MojePoradi | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('muj_zebricek_radek')
  if (error || !data || data.length === 0) return null
  const radek = data[0]
  return {
    fitnessXp: radek.fitness_xp ?? 0,
    poradi: radek.poradi ?? null,
  }
}
