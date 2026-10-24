import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ==========================================
// Regresní test pro vercel.json (audit #7) — appka na svoje vlastní
// produkční hlavičky dřív neměla žádný test, a přesně proto appka
// nikdy nenašla, že appčin vlastní Permissions-Policy/CSP appku
// o Běhání (poloha + mapové dlaždice) v produkci úplně připraví.
// Lokální preview server (na kterém běží component/e2e testy) appčiny
// vercel.json headers nikdy nepoužívá — tohle je jediné místo, kde se
// to doopravdy ověří, protože čte přímo ten samý soubor, co se
// nasazuje.
// ==========================================

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const nactiVercelConfig = (): { headers?: { source: string; headers: { key: string; value: string }[] }[] } =>
  JSON.parse(fs.readFileSync(path.join(koren, 'vercel.json'), 'utf-8'))

// Hlavičky platné pro úplně všechny cesty — appčina skutečná CSP/
// Permissions-Policy appka doopravdy čte prohlížeč.
const globalniHlavicky = () => {
  const config = nactiVercelConfig()
  const blok = config.headers?.find((h) => h.source === '/(.*)')
  if (!blok) throw new Error('vercel.json nemá globální blok hlaviček ("/(.*)")')
  const mapa = new Map(blok.headers.map((h) => [h.key, h.value]))
  return mapa
}

// Appčina vlastní hodnotu feature appčiny Permissions-Policy vytáhne
// jako seznam povolených původů, ne jako celý řetězec — appka chce
// ověřit, že geolocation povoluje aspoň 'self', ne jen že v hlavičce
// vůbec je (appka by tam klidně mohla ležet i jako geolocation=()).
const povoleniPolicy = (hlavicka: string, feature: string): string => {
  const shoda = hlavicka.match(new RegExp(`${feature}=\\(([^)]*)\\)`))
  if (!shoda) throw new Error(`Permissions-Policy neobsahuje feature "${feature}"`)
  return shoda[1]
}

// Appčiny jednotlivé zdroje jedné CSP direktivy (např. img-src), ne
// celou hlavičku — appka chce ověřit konkrétní host, ne jen že
// podřetězec kdekoli v CSP existuje (to by prošlo i omylem v jiné
// direktivě).
const csvDirektiva = (hlavicka: string, nazev: string): string[] => {
  const direktivy = hlavicka.split(';').map((d) => d.trim())
  const najdena = direktivy.find((d) => d.startsWith(`${nazev} `))
  if (!najdena) throw new Error(`CSP neobsahuje direktivu "${nazev}"`)
  return najdena.split(/\s+/).slice(1)
}

describe('vercel.json — produkční hlavičky appku nesmí zablokovat', () => {
  it('Permissions-Policy appce dovoluje geolocation aspoň pro appku samu (self)', () => {
    const hlavicky = globalniHlavicky()
    const permissionsPolicy = hlavicky.get('Permissions-Policy')
    expect(permissionsPolicy).toBeDefined()

    const geolocation = povoleniPolicy(permissionsPolicy!, 'geolocation')
    // Prázdný seznam (geolocation=()) appku zablokuje úplně, bez ohledu
    // na to, co uživatel povolí v prohlížeči/OS — přesně tohle appka
    // v produkci dřív měla.
    expect(geolocation).not.toBe('')
    expect(geolocation).toContain('self')
  })

  it('camera a microphone appce zůstávají povolené aspoň appce samé (regrese proti budoucí nechtěné změně)', () => {
    const hlavicky = globalniHlavicky()
    const permissionsPolicy = hlavicky.get('Permissions-Policy')!
    expect(povoleniPolicy(permissionsPolicy, 'camera')).toContain('self')
    expect(povoleniPolicy(permissionsPolicy, 'microphone')).toContain('self')
  })

  it('CSP appce dovoluje natáhnout mapové dlaždice z hostu, co appka doopravdy používá v TrasaMapa.tsx', () => {
    const trasaMapa = fs.readFileSync(path.join(koren, 'src/miniapps/behani/TrasaMapa.tsx'), 'utf-8')
    const shodaUrl = trasaMapa.match(/L\.tileLayer\(\s*['"]https:\/\/([^/'"]+)/)
    if (!shodaUrl) throw new Error('TrasaMapa.tsx už nevolá L.tileLayer s https:// URL — test je potřeba přepsat')
    const hostDlazdic = shodaUrl[1]

    const hlavicky = globalniHlavicky()
    const csp = hlavicky.get('Content-Security-Policy')
    expect(csp).toBeDefined()

    const imgSrc = csvDirektiva(csp!, 'img-src')
    expect(imgSrc).toContain(`https://${hostDlazdic}`)
  })

  it('CSP appce zůstává jinak omezená na appčin vlastní původ a Supabase (žádný náhodný rozvolnění navíc)', () => {
    const hlavicky = globalniHlavicky()
    const csp = hlavicky.get('Content-Security-Policy')!
    const imgSrc = csvDirektiva(csp, 'img-src')

    // Appka chce přesně tenhle seznam zdrojů pro img-src — ani méně
    // (appka by si rozbila mapu), ani víc (zbytečně rozvolněná CSP).
    expect(new Set(imgSrc)).toEqual(
      new Set(["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://tile.openstreetmap.org'])
    )
  })
})
