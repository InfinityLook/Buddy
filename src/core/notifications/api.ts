import { supabase } from '@/core/supabase/client'
import { Oznameni } from './types'

// ==========================================
// Oznámení od správy — jediné místo, které mluví s tabulkou oznameni.
// Stejný princip jako social/api.ts a pages/admin/api.ts: komponenty
// dostávají hotové tvary, ne syrové řádky.
//
// Kdo smí co, hlídá výhradně RLS (viz migrace oznameni_od_admina):
// číst smí kdokoli přihlášený, psát a mazat jen admin. Tenhle soubor se
// neptá na roli sám — kdyby to zkusil kdokoli mimo Admin panel, server
// ho stejně zastaví.
// ==========================================

const zRadku = (r: { id: string; text: string; created_at: string }): Oznameni => ({
  id: r.id,
  text: r.text,
  createdAt: r.created_at,
})

export const nactiOznameni = async (limit = 20): Promise<Oznameni[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('oznameni')
    .select('id, text, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(zRadku)
}

export const poslatOznameni = async (text: string): Promise<{ ok: boolean; chyba?: string }> => {
  if (!supabase) return { ok: false, chyba: 'Admin panel potřebuje přihlášený účet.' }

  const ocisteny = text.trim()
  if (!ocisteny) return { ok: false, chyba: 'Text nemůže být prázdný.' }
  if (ocisteny.length > 500) return { ok: false, chyba: 'Text je moc dlouhý (max 500 znaků).' }

  const { error } = await supabase.from('oznameni').insert({ text: ocisteny })
  return error ? { ok: false, chyba: error.message } : { ok: true }
}

export const smazatOznameni = async (id: string): Promise<{ ok: boolean; chyba?: string }> => {
  if (!supabase) return { ok: false, chyba: 'Admin panel potřebuje přihlášený účet.' }

  const { error } = await supabase.from('oznameni').delete().eq('id', id)
  return error ? { ok: false, chyba: error.message } : { ok: true }
}

// Kanál musí mít při každém odběru jiné jméno — Supabase vrací pro
// stejné jméno tentýž kanál a druhý pokus přidat k němu posluchače
// skončí výjimkou (viz stejný komentář u chatů v social/api.ts).
let poradiKanalu = 0

/** Živý odběr nových/smazaných oznámení, ať se zvonek rozsvítí i bez
 *  obnovení stránky. Vrací funkci pro odhlášení. */
export const sledovatOznameni = (zmena: () => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`oznameni:${++poradiKanalu}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'oznameni' }, () => zmena())
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}
