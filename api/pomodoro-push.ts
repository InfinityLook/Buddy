import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const cronSecret = process.env.CRON_SECRET
  const url = process.env.VITE_SUPABASE_URL
  const serviceKlic =
    process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublic =
    process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivate =
    process.env.VAPID_PRIVATE_KEY
  const vapidSubject =
    process.env.VAPID_SUBJECT

  if (
    !cronSecret ||
    !url ||
    !serviceKlic ||
    !vapidPublic ||
    !vapidPrivate ||
    !vapidSubject
  ) {
    return res.status(500).json({
      chyba:
        'Push pro Pomodoro není na serveru nastavený.',
    })
  }

  if (
    req.headers.authorization !==
    `Bearer ${cronSecret}`
  ) {
    return res.status(401).json({
      chyba: 'Neautorizováno.',
    })
  }

  webpush.setVapidDetails(
    vapidSubject,
    vapidPublic,
    vapidPrivate
  )

  const admin = createClient(
    url,
    serviceKlic,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const {
    data: casovace,
    error: chybaCtenim,
  } = await admin
    .from('pomodoro_casovace')
    .select(
      'user_id, konci_v, rezim, block_id'
    )
    .lte(
      'konci_v',
      new Date().toISOString()
    )

  if (chybaCtenim) {
    console.error(
      'pomodoro-push: čtení pomodoro_casovace selhalo',
      chybaCtenim
    )

    return res.status(502).json({
      chyba: 'Nepovedlo se to.',
    })
  }

  if (!casovace || casovace.length === 0) {
    return res.status(200).json({
      odeslano: 0,
    })
  }

  let odeslano = 0

  for (const casovac of casovace) {
    // Převezmeme pouze stále stejný uplynulý blok.
    let claim = admin
      .from('pomodoro_casovace')
      .delete()
      .eq('user_id', casovac.user_id)
      .eq('konci_v', casovac.konci_v)

    claim = casovac.block_id
      ? claim.eq(
          'block_id',
          casovac.block_id
        )
      : claim.is('block_id', null)

    const {
      data: claimed,
      error: claimError,
    } = await claim.select('user_id')

    if (claimError || !claimed?.length) {
      continue
    }

    const { data: prihlaseni } =
      await admin
        .from('push_prihlaseni')
        .select(
          'id, endpoint, p256dh, auth_klic'
        )
        .eq(
          'user_id',
          casovac.user_id
        )

    const zprava = JSON.stringify({
      url: '/apps?pomodoro=1',
      title:
        casovac.rezim === 'prace'
          ? '⏰ Soustředění dokončeno'
          : '⏰ Pauza skončila',
      body:
        casovac.rezim === 'prace'
          ? 'Blok doběhl — čas na pauzu.'
          : 'Pauza doběhla — zpátky do práce?',
    })

    for (const p of prihlaseni ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: p.endpoint,
            keys: {
              p256dh: p.p256dh,
              auth: p.auth_klic,
            },
          },
          zprava
        )

        odeslano++
      } catch (error) {
        const status = (
          error as {
            statusCode?: number
          }
        ).statusCode

        if (
          status === 404 ||
          status === 410
        ) {
          await admin
            .from('push_prihlaseni')
            .delete()
            .eq('id', p.id)
        } else {
          console.error(
            'pomodoro-push: sendNotification selhalo',
            error
          )
        }
      }
    }

    // Novější časovač už nijak nemažeme.
  }

  return res.status(200).json({
    odeslano,
  })
}
