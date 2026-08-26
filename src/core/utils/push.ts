import { supabase } from '@/core/supabase/client'

// ==========================================
// Web Push — přihlášení zařízení k odběru a nahlášení serveru, kdy
// skončí právě běžící Pomodoro blok. Bez týhle dvojice by Vercel Cron
// (api/pomodoro-push.ts) neměl komu ani co poslat.
//
// Striktně doplňkové, stejně jako cloud sync: bez nastaveného Supabase,
// bez podpory Push API v prohlížeči, nebo bez přihlášení appka jen
// tiše nic navíc nepošle — Pomodoro dál funguje přesně jako dřív
// (modulový JS časovač v usePomodoro.ts), jen bez notifikace po
// tvrdém zavření appky.
// ==========================================

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// Web Push API čeká klíč jako Uint8Array, server ho ale posílá jako
// base64url řetězec (kratší, bezpečné do URL/env proměnné) — standardní
// převod, který si musí udělat každý klient Push API sám.
const urlBase64ToUint8Array = (base64: string): BufferSource => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(safe)
  // Typ Uint8Array<ArrayBufferLike> (TS lib pro novější runtime) neodpovídá
  // přesně tomu, co PushManager.subscribe() jako BufferSource čeká —
  // hodnoty jsou v pořádku, jde jen o přílišnou přesnost typů.
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))) as BufferSource
}

const mojeId = async (): Promise<string | null> => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/**
 * Zajistí Push subscription tohohle zařízení a nahraje ji na server.
 * Volá se ze start() v usePomodoro.ts — cena jednoho navíc volání při
 * každém spuštění je zanedbatelná (upsert na stejný endpoint je no-op),
 * a nemusí se tak řešit zvlášť "první spuštění appky" jako mezník.
 */
export const zajistiPushPrihlaseni = async (): Promise<void> => {
  if (!supabase || !VAPID_PUBLIC_KEY) return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const ja = await mojeId()
  if (!ja) return

  try {
    const registrace = await navigator.serviceWorker.ready
    let subscription = await registrace.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registrace.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

    await supabase.from('push_prihlaseni').upsert(
      { user_id: ja, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth_klic: json.keys.auth },
      { onConflict: 'endpoint' }
    )
  } catch (error) {
    // Push je bonus k místnímu časovači, ne podmínka jeho funkčnosti —
    // odmítnuté oprávnění nebo prohlížeč bez podpory nesmí Pomodoro shodit.
    console.warn('Push přihlášení se nepovedlo:', error)
  }
}

/** Nahlásí, kdy skončí právě běžící blok — cron podle tohohle pozná,
 *  komu poslat push, když appka mezitím zůstane zavřená. */
export const nahlasPomodoroCasovac = async (endsAt: number, rezim: 'prace' | 'pauza'): Promise<void> => {
  if (!supabase) return
  const ja = await mojeId()
  if (!ja) return

  await supabase
    .from('pomodoro_casovace')
    .upsert({ user_id: ja, konci_v: new Date(endsAt).toISOString(), rezim }, { onConflict: 'user_id' })
}

/**
 * Zruší nahlášený časovač — blok skončil normálně v popředí (appka ho
 * zvládla ohlásit sama přes showAppNotification) nebo uživatel Pomodoro
 * zastavil/vynuloval. Bez tohohle by cron poslal push i na blok, který
 * appka už dávno dokončila sama.
 */
export const zrusPomodoroCasovac = async (): Promise<void> => {
  if (!supabase) return
  const ja = await mojeId()
  if (!ja) return

  await supabase.from('pomodoro_casovace').delete().eq('user_id', ja)
}
