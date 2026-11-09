import { supabase } from '@/core/supabase/client'

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY as
    | string
    | undefined

const urlBase64ToUint8Array = (
  base64: string
): BufferSource => {
  const padding = '='.repeat(
    (4 - base64.length % 4) % 4
  )

  const safe = (base64 + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const raw = atob(safe)

  return Uint8Array.from(
    [...raw].map(c => c.charCodeAt(0))
  ) as BufferSource
}

const mojeId = async (): Promise<string | null> => {
  if (!supabase) return null

  const { data } =
    await supabase.auth.getSession()

  return data.session?.user?.id ?? null
}

export const zajistiPushPrihlaseni =
  async (): Promise<void> => {
    if (!supabase || !VAPID_PUBLIC_KEY) return

    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return
    }

    const ja = await mojeId()

    if (!ja) return

    try {
      const registrace =
        await navigator.serviceWorker.ready

      let subscription =
        await registrace.pushManager.getSubscription()

      if (!subscription) {
        subscription =
          await registrace.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(
                VAPID_PUBLIC_KEY
              ),
          })
      }

      const json = subscription.toJSON()

      if (
        !json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth
      ) {
        return
      }

      await supabase
        .from('push_prihlaseni')
        .upsert(
          {
            user_id: ja,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth_klic: json.keys.auth,
          },
          { onConflict: 'endpoint' }
        )
    } catch (error) {
      console.warn(
        'Push přihlášení se nepovedlo:',
        error
      )
    }
  }

// Síťové změny odesíláme v pořadí.
// Zrušení míří na konkrétní blok.
let pomodoroQueue: Promise<void> =
  Promise.resolve()

const ordered = (
  action: () => Promise<void>
): Promise<void> => {
  const result = pomodoroQueue.then(action)

  pomodoroQueue = result.catch(() => {})

  return result
}

export const nahlasPomodoroCasovac = (
  endsAt: number,
  rezim: 'prace' | 'pauza',
  blockId?: string
): Promise<void> =>
  ordered(async () => {
    if (!supabase) return

    const userId = await mojeId()

    if (!userId) return

    const { error } = await supabase
      .from('pomodoro_casovace')
      .upsert(
        {
          user_id: userId,
          konci_v: new Date(
            endsAt
          ).toISOString(),
          rezim,
          block_id: blockId ?? null,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      throw new Error(
        'Serverové upozornění se nepodařilo naplánovat. Místní časovač dál funguje.'
      )
    }
  })

export const zrusPomodoroCasovac = (
  blockId?: string
): Promise<void> =>
  ordered(async () => {
    if (!supabase) return

    const userId = await mojeId()

    if (!userId) return

    let query = supabase
      .from('pomodoro_casovace')
      .delete()
      .eq('user_id', userId)

    if (blockId) {
      query = query.eq('block_id', blockId)
    }

    const { error } = await query

    if (error) {
      throw new Error(
        'Zrušení serverového upozornění se nepodařilo. Připoj se a zkus to znovu.'
      )
    }
  })
