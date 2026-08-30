import { supabase } from '@/core/supabase/client'

// ==========================================
// "Přihlášená zařízení" — každé zařízení/prohlížeč, které se s tímhle
// účtem někdy přihlásilo. Vlastní malý modul mimo social/api.ts,
// stejná úvaha jako core/support/api.ts nebo core/notifications/api.ts:
// tohle není Social, je to účtová bezpečnost, takže si zaslouží vlastní
// soubor, ne přilepení k "api.ts je jediné místo, kde Social mluví se
// Supabase".
//
// Plain self-row RLS na login_devices (viz migrace pridej_login_devices)
// — appka se nikdy neptá na cizí zařízení, žádná SECURITY DEFINER
// funkce tu není potřeba.
// ==========================================

const DEVICE_ID_KEY = 'buddy-device-id'

/**
 * Náhodné id tohohle konkrétního zařízení/prohlížeče — nic citlivého,
 * appka jím jen pozná "tohle místo appku už jednou vidělo", takže obyčejný
 * localStorage stačí, ne secureStorage (ten je pro data uložená přes
 * Zustand persist, tohle je jednoduchá ploché id mimo jakýkoli store).
 */
export const zdejsiZarizeniId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/**
 * Hrubý, knihovnou nepodložený popis prohlížeče/systému z
 * navigator.userAgent — appka nepotřebuje přesnost (a UA sniffing je
 * odjakživa nespolehlivý), jen aby řádek v Nastavení/notifikaci nebyl
 * napořád "neznámé zařízení". Stejná "žádná knihovna, jen pár if" úvaha
 * jako u social/avatarColor.ts.
 */
const popisZarizeni = (): string => {
  const ua = navigator.userAgent
  const system = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh/.test(ua)
          ? 'Mac'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'neznámý systém'
  const prohlizec = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox/.test(ua)
        ? 'Firefox'
        : /Chrome/.test(ua)
          ? 'Chrome'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'neznámý prohlížeč'
  return `${prohlizec} na ${system}`
}

export interface PrihlaseneZarizeni {
  deviceId: string
  popis: string
  prvniAt: string
  posledniAt: string
}

const zRadku = (r: {
  device_id: string
  popis: string
  first_seen_at: string
  last_seen_at: string
}): PrihlaseneZarizeni => ({
  deviceId: r.device_id,
  popis: r.popis,
  prvniAt: r.first_seen_at,
  posledniAt: r.last_seen_at,
})

/**
 * Nahlásí tohle zařízení jako "vidělo appku" — upsert (on_conflict
 * user_id,device_id), ne obyčejný insert: poprvé založí nový řádek, a
 * právě to je jediná chvíle, kdy Postgres do Realtime pošle skutečnou
 * INSERT událost (viz sledovatNovaZarizeni níž) — podruhé (stejné
 * zařízení, další spuštění appky) upsert jen posune last_seen_at jako
 * UPDATE, žádnou další notifikaci u jiné otevřené relace nevyvolá.
 */
export const nahlasZarizeni = async (): Promise<void> => {
  if (!supabase) return

  const { data: relace } = await supabase.auth.getSession()
  const ja = relace.session?.user?.id
  if (!ja) return

  await supabase.from('login_devices').upsert(
    {
      user_id: ja,
      device_id: zdejsiZarizeniId(),
      popis: popisZarizeni(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_id' }
  )
}

/** Seznam vlastních zařízení pro "Nedávná přihlášení" v Nastavení —
 *  nejnovější první. */
export const nactiZarizeni = async (): Promise<PrihlaseneZarizeni[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('login_devices')
    .select('device_id, popis, first_seen_at, last_seen_at')
    .order('last_seen_at', { ascending: false })

  if (error || !data) return []
  return data.map(zRadku)
}

let poradiKanalu = 0

/**
 * Živý odběr NOVÉHO zařízení — jen INSERT, ne každé posunutí
 * last_seen_at (to je UPDATE, viz nahlasZarizeni výš). core/security/
 * loginNotify.ts ho volá z jiné, už otevřené relace stejného účtu, ne
 * z toho zařízení, co se právě samo přihlásilo — appka nemusí notifikovat
 * samu sebe o vlastním přihlášení.
 */
export const sledovatNovaZarizeni = (zmena: (deviceId: string, popis: string) => void): (() => void) => {
  const klient = supabase
  if (!klient) return () => {}

  const kanal = klient
    .channel(`login-devices:${++poradiKanalu}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_devices' }, (payload) => {
      const r = payload.new as { device_id: string; popis: string }
      zmena(r.device_id, r.popis)
    })
    .subscribe()

  return () => {
    void klient.removeChannel(kanal)
  }
}
