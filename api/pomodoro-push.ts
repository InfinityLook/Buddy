import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// ==========================================
// Vercel Cron endpoint — jednou za minutu (vercel.json's "crons") zkontroluje
// pomodoro_casovace, a komu právě doběhl blok, tomu pošle skutečnou Web Push
// notifikaci, i když appku dávno zavřel a modulový JS timer v usePomodoro.ts
// (ten běží jen v běžícím prohlížeči) o tom nemá jak vědět.
//
// Autorizace je tady jiná, než u api/admin-ban.ts: tahle funkce nejedná
// jménem žádného konkrétního uživatele (Cron nemá token, nemá se za co
// vydávat), takže se místo "je volající admin?" ověřuje jen sdílené
// tajemství v hlavičce (CRON_SECRET) — jde o důvěryhodnou úlohu na pozadí,
// ne o žádost od reálného člověka. Service role klíč je i tak nutný: musí
// se přečíst pomodoro_casovace a push_prihlaseni napříč všemi uživateli
// najednou, což RLS (řádky jen "svoje") nikdy nedovolí projít žádným
// osobním tokenem.
// ==========================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  const url = process.env.VITE_SUPABASE_URL
  const serviceKlic = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Stejná proměnná, kterou čte i klient (VITE_ předpona) — jde o veřejný
  // klíč, není důvod ho v prostředí Vercelu duplikovat pod dvěma jmény.
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT

  if (!cronSecret || !url || !serviceKlic || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return res.status(500).json({ chyba: 'Push pro Pomodoro není na serveru nastavený.' })
  }

  // Vercel Cron posílá tuhle hlavičku samo — když ji volající nemá,
  // nejde o naplánované spuštění, ale o cizí požadavek zvenčí.
  const hlavicka = req.headers.authorization
  if (hlavicka !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ chyba: 'Neautorizováno.' })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const admin = createClient(url, serviceKlic, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Jen bloky, které už doopravdy skončily — cron běží každou minutu,
  // takže "teď" je dost přesné okno, žádné zvláštní zaokrouhlování netřeba.
  const { data: casovace, error: chybaCtenim } = await admin
    .from('pomodoro_casovace')
    .select('user_id, konci_v, rezim')
    .lte('konci_v', new Date().toISOString())

  if (chybaCtenim) {
    console.error('pomodoro-push: čtení pomodoro_casovace selhalo', chybaCtenim)
    return res.status(502).json({ chyba: 'Nepovedlo se to.' })
  }
  if (!casovace || casovace.length === 0) {
    return res.status(200).json({ odeslano: 0 })
  }

  let odeslano = 0

  for (const casovac of casovace) {
    const { data: prihlaseni } = await admin
      .from('push_prihlaseni')
      .select('id, endpoint, p256dh, auth_klic')
      .eq('user_id', casovac.user_id)

    const zprava = JSON.stringify({
      title: casovac.rezim === 'prace' ? '⏰ Soustředění dokončeno' : '⏰ Pauza skončila',
      body:
        casovac.rezim === 'prace'
          ? 'Blok doběhl — čas na pauzu.'
          : 'Pauza doběhla — zpátky do práce?',
    })

    for (const p of prihlaseni ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth_klic } },
          zprava
        )
        odeslano++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // 404/410 = prohlížeč subscription sám zrušil (odinstalace appky,
        // vymazaná data) — smažeme, ať se o ni cron nepokouší napořád.
        if (status === 404 || status === 410) {
          await admin.from('push_prihlaseni').delete().eq('id', p.id)
        } else {
          console.error('pomodoro-push: sendNotification selhalo', error)
        }
      }
    }

    // Odmazat i bez odběratelů — jinak by se stejný uplynulý časovač
    // zkoušel odbavovat znovu každou další minutu navěky.
    await admin.from('pomodoro_casovace').delete().eq('user_id', casovac.user_id)
  }

  return res.status(200).json({ odeslano })
}
