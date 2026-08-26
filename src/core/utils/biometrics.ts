// ==========================================
// Biometrické odemčení appky — Face ID / Touch ID / otisk prstu na
// Androidu / Windows Hello, přes WebAuthn (navigator.credentials),
// vestavěné rozhraní prohlížeče. Žádný server, žádná knihovna, žádné
// nové náklady — na rozdíl od Web Push výš (core/utils/push.ts, VAPID,
// Vercel Cron) tohle appka zvládne úplně sama v prohlížeči.
//
// DŮLEŽITÉ, ať se to nikdy nezamění za druhý ověřovací faktor: skutečné
// přihlášení pořád dělá jen Supabase (e-mail/heslo, core/supabase/auth.ts).
// Tohle je zámek NAD už přihlášenou relací — stejně jako Face ID
// na bankovní appce appku jen zamyká/odemyká na tomhle zařízení, není to
// druhá autentizace vůči serveru. Běžný WebAuthn běh ověřuje podpis proti
// výzvě (challenge) na serveru, který si podpis ověří proti veřejnému
// klíči uloženému při registraci — tady žádný server není, takže se
// výzva generuje jen lokálně a nikde se neověřuje. Přínos je i tak reálný,
// ne nulový: úspěšné navigator.credentials.get() nejde z JS ničím
// zfalšovat ani obejít úpravou localStorage — prohlížeč ho vrátí jedině
// tehdy, když operační systém doopravdy odemkl privátní klíč vázaný na
// hardware skrz Face ID/otisk prstu. Kdo appku zamkne, ten ji bez
// biometrie na tomhle konkrétním zařízení a prohlížeči neotevře.
// ==========================================

const jePodporovanoWebAuthn = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined' &&
  typeof navigator.credentials !== 'undefined'

/** Umí tohle zařízení/prohlížeč platformní biometrii vůbec použít? */
export const jeBiometrieDostupna = async (): Promise<boolean> => {
  if (!jePodporovanoWebAuthn()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

const nahodnyBuffer = (delka: number): BufferSource => {
  const pole = new Uint8Array(delka)
  crypto.getRandomValues(pole)
  return pole as BufferSource
}

const base64UrlNaBuffer = (base64url: string): BufferSource => {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0)) as BufferSource
}

/**
 * Založí nový biometrický klíč vázaný na tohle zařízení a prohlížeč —
 * vrátí id credentialu k uložení do profilu (ProfileSecurity.biometricCredentialId),
 * nebo null při zamítnutí, chybě nebo nepodporovaném zařízení.
 */
export const zaregistrujBiometrii = async (jmeno: string): Promise<string | null> => {
  if (!jePodporovanoWebAuthn()) return null

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: nahodnyBuffer(32),
        rp: { name: 'SchoolBuddy' },
        user: {
          id: nahodnyBuffer(16),
          name: jmeno || 'student',
          displayName: jmeno || 'Student',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256 — starší Windows Hello
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null

    return credential?.id ?? null
  } catch (error) {
    // Zamítnutí OS dialogu nebo zařízení bez biometrického senzoru —
    // appka na to reaguje hláškou, ne pádem.
    console.warn('Založení biometrie se nepovedlo:', error)
    return null
  }
}

/** Vyžádá si biometrické ověření proti dřív založenému credentialu. */
export const overBiometrii = async (credentialId: string): Promise<boolean> => {
  if (!jePodporovanoWebAuthn()) return false

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: nahodnyBuffer(32),
        allowCredentials: [{ type: 'public-key', id: base64UrlNaBuffer(credentialId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return credential !== null
  } catch (error) {
    // Zamítnutí, zrušení, nebo credential založený na jiném zařízení
    // (např. po obnově zálohy) — BiometricLock na tohle reaguje
    // nabídkou zámek vypnout, ne appku zaseknout.
    console.warn('Biometrické ověření se nepovedlo:', error)
    return false
  }
}
