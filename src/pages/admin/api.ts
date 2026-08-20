import { supabase } from '@/core/supabase/client'
import { AdminPrehled } from './types'

// ==========================================
// Jediné místo, kde Admin panel mluví se Supabase — stejný princip jako
// social/api.ts. Přístup hlídá databáze (jsem_admin()), tenhle soubor
// jen volá RPC a formátuje odpověď.
// ==========================================

export const nactiPrehled = async (): Promise<AdminPrehled | null> => {
  if (!supabase) return null

  // admin_prehled() je "returns table(...)" — PostgREST ho vrací jako
  // pole (i když vždycky s jedním řádkem), stejně jako najdi_podle_kodu
  // o kus výš v Socialu. Bereme první a jediný prvek, ne .maybeSingle().
  const { data, error } = await supabase.rpc('admin_prehled')
  const radek = data?.[0]
  if (error || !radek) return null

  return {
    pocetUctu: radek.pocet_uctu,
    pocetHlaseniCelkem: radek.pocet_hlaseni_celkem,
    pocetNevyrizenychHlaseni: radek.pocet_nevyrizenych_hlaseni,
    pocetZprav24h: radek.pocet_zprav_24h,
    pocetChatu: radek.pocet_chatu,
    pocetPratelstvi: radek.pocet_pratelstvi,
  }
}
