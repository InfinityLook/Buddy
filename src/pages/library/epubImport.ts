import JSZip from 'jszip'
import type { Blok, Kapitola } from './libraryTextTypes'

// ==========================================
// Library — import EPUB (fáze 4). Čte se celé v prohlížeči (JSZip +
// DOMParser), na server nejde nic, dokud správce nepotvrdí uložení.
//
// Výstup je přesně formát z libraryTextTypes.ts: kapitoly s bloky
// odstavec/nadpis/citat/oddělovač, jen holý text. Obrázky z těla knihy se
// zatím neimportují (jen obálka) — komiksy a obrázkové knihy mají vlastní
// formát stran (fáze 6).
//
// EPUB chráněný DRM se odmítne (nešel by přečíst, jen by vznikly prázdné
// kapitoly); obfuskace FONTŮ (IDPF/Adobe) je v pořádku, text se jí netýká.
// ==========================================

export interface EpubMeta {
  title: string
  author: string
  /** ISO 639 kód jazyka (cs, en…), prázdný řetězec když není uveden. */
  language: string
  description: string
}

export interface EpubVysledek {
  meta: EpubMeta
  kapitoly: Kapitola[]
  /** Obálka z balíčku (původní bajty), null když ji EPUB nemá. */
  obalka: Blob | null
  pocetSlov: number
  /** Nefatální poznámky pro správce (přeskočené soubory…). */
  varovani: string[]
}

export class EpubChyba extends Error {}

/** Strop na celý text, ať jedna kniha nezahltí databázi ani prohlížeč. */
export const MAX_ZNAKU_KNIHY = 4_000_000
/** Kapitola delší než tohle se rozdělí na části (sloupec blocks má strop 1 MB). */
export const MAX_ZNAKU_KAPITOLY = 200_000
export const MAX_VELIKOST_EPUB = 30 * 1024 * 1024

const MEZERY = /[\s ]+/g
const NEVIDITELNE = /[­​‌‍﻿]/g

export const normalizujText = (s: string): string => s.replace(NEVIDITELNE, '').replace(MEZERY, ' ').trim()

const PRESKOCIT = new Set(['script', 'style', 'nav', 'head', 'svg', 'math', 'noscript', 'template'])
const BLOKOVE = new Set([
  'p', 'div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'body', 'ul', 'ol', 'li', 'dl',
  'dd', 'dt', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'figure', 'figcaption', 'pre',
  'form', 'address', 'center', 'details', 'summary',
])

/** Projde element a převede ho na bloky. Vložený text (span, em, a…) se skládá do jednoho odstavce. */
const projdi = (el: Element, out: Blok[]): void => {
  let buf = ''
  const splach = () => {
    const t = normalizujText(buf)
    if (t) out.push({ typ: 'odstavec', text: t })
    buf = ''
  }
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === 3) {
      buf += n.textContent ?? ''
      continue
    }
    if (n.nodeType !== 1) continue
    const e = n as Element
    const tag = e.localName.toLowerCase()
    if (PRESKOCIT.has(tag)) continue
    if (tag === 'br') {
      buf += ' '
      continue
    }
    if (/^h[1-6]$/.test(tag)) {
      splach()
      const t = normalizujText(e.textContent ?? '')
      if (t) out.push({ typ: 'nadpis', text: t })
      continue
    }
    if (tag === 'hr') {
      splach()
      out.push({ typ: 'oddelovac', text: '' })
      continue
    }
    if (tag === 'blockquote') {
      splach()
      const t = normalizujText(e.textContent ?? '')
      if (t) out.push({ typ: 'citat', text: t })
      continue
    }
    if (BLOKOVE.has(tag)) {
      splach()
      projdi(e, out)
      continue
    }
    buf += e.textContent ?? ''
  }
  splach()
}

export interface KapitolaZHtml {
  title: string
  bloky: Blok[]
}

/** Jedna XHTML/HTML stránka → titulek kapitoly + bloky. Úvodní nadpis se z bloků vyjme (čtečka ho ukazuje jako titulek kapitoly). */
export const htmlNaKapitolu = (html: string): KapitolaZHtml => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const bloky: Blok[] = []
  projdi(doc.body ?? doc.documentElement, bloky)

  // Oddělovače na začátku/konci a dvojité za sebou jsou jen šum.
  const cisty: Blok[] = []
  for (const b of bloky) {
    if (b.typ === 'oddelovac' && (cisty.length === 0 || cisty[cisty.length - 1].typ === 'oddelovac')) continue
    cisty.push(b)
  }
  while (cisty.length > 0 && cisty[cisty.length - 1].typ === 'oddelovac') cisty.pop()

  let title = ''
  if (cisty.length > 0 && cisty[0].typ === 'nadpis') {
    title = cisty[0].text
    cisty.shift()
  }
  return { title: title.slice(0, 200), bloky: cisty }
}

export const spocitejSlova = (bloky: readonly Blok[]): number =>
  bloky.reduce((s, b) => s + (b.text ? b.text.split(/\s+/).length : 0), 0)

const znakuVBlocich = (bloky: readonly Blok[]): number => bloky.reduce((s, b) => s + b.text.length, 0)

/** Rozdělí příliš dlouhé kapitoly na části a očísluje výsledek od nuly. */
export const rozdelDlouheKapitoly = (kapitoly: readonly KapitolaZHtml[], max = MAX_ZNAKU_KAPITOLY): Kapitola[] => {
  const vysledek: Kapitola[] = []
  for (const k of kapitoly) {
    if (znakuVBlocich(k.bloky) <= max) {
      vysledek.push({ position: vysledek.length, title: k.title, bloky: k.bloky })
      continue
    }
    let cast: Blok[] = []
    let delka = 0
    let cislo = 1
    const uloz = () => {
      if (cast.length === 0) return
      vysledek.push({
        position: vysledek.length,
        title: cislo === 1 ? k.title : `${k.title || 'Kapitola'} (${cislo})`,
        bloky: cast,
      })
      cislo += 1
      cast = []
      delka = 0
    }
    for (const b of k.bloky) {
      if (delka > 0 && delka + b.text.length > max) uloz()
      cast.push(b)
      delka += b.text.length
    }
    uloz()
  }
  return vysledek
}

// ---------- Balíček EPUB (ZIP + OPF) ----------

const prvek = (root: Element | Document, jmeno: string): Element[] =>
  Array.from(root.getElementsByTagName('*')).filter((e) => e.localName === jmeno)

const textPrvku = (root: Element | Document, jmeno: string): string[] =>
  prvek(root, jmeno)
    .map((e) => normalizujText(e.textContent ?? ''))
    .filter(Boolean)

const bezHtml = (s: string): string => {
  const doc = new DOMParser().parseFromString(s, 'text/html')
  return normalizujText(doc.body?.textContent ?? s)
}

/** Cesta relativní k OPF → cesta v ZIPu (bez fragmentu, dekódovaná, s rozlišením ../). */
const spojCestu = (zakladniSlozka: string, href: string): string => {
  const bez = decodeURIComponent(href.split('#')[0].split('?')[0])
  const casti = (zakladniSlozka ? `${zakladniSlozka}/${bez}` : bez).split('/')
  const vysledek: string[] = []
  for (const c of casti) {
    if (c === '..') vysledek.pop()
    else if (c !== '.' && c !== '') vysledek.push(c)
  }
  return vysledek.join('/')
}

const najdiSoubor = (zip: JSZip, cesta: string) => {
  const presne = zip.file(cesta)
  if (presne) return presne
  const nizsi = cesta.toLowerCase()
  const kandidati = zip.file(new RegExp('.*')).filter((f) => f.name.toLowerCase() === nizsi)
  return kandidati[0] ?? null
}

const jeXhtml = (mediaType: string, href: string): boolean =>
  /x?html/.test(mediaType) || /\.(x?html?)$/i.test(href)

interface PolozkaManifestu {
  id: string
  href: string
  mediaType: string
  properties: string
}

export async function parsujEpub(data: ArrayBuffer | Uint8Array | Blob): Promise<EpubVysledek> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(data)
  } catch {
    throw new EpubChyba('Soubor není platný EPUB (nejde otevřít jako archiv).')
  }
  const varovani: string[] = []

  // DRM: šifrované jsou jen soubory, které nejsou obfuskace fontů.
  const sifra = zip.file('META-INF/encryption.xml')
  if (sifra) {
    const xml = new DOMParser().parseFromString(await sifra.async('string'), 'application/xml')
    const metody = prvek(xml, 'EncryptionMethod').map((m) => m.getAttribute('Algorithm') ?? '')
    // Obfuskace fontů: IDPF (…/2008/embedding) a Adobe (…/pdf/enc#RC). Cokoli jiného (AES…) je DRM.
    if (metody.some((a) => !/idpf\.org\/2008\/embedding|ns\.adobe\.com\/pdf\/enc#RC/i.test(a))) {
      throw new EpubChyba('EPUB je chráněný proti kopírování (DRM) a nejde z něj přečíst text.')
    }
  }

  const kontejner = zip.file('META-INF/container.xml')
  let opfCesta = ''
  if (kontejner) {
    const xml = new DOMParser().parseFromString(await kontejner.async('string'), 'application/xml')
    opfCesta = prvek(xml, 'rootfile')[0]?.getAttribute('full-path') ?? ''
  }
  if (!opfCesta) {
    opfCesta = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.opf')) ?? ''
  }
  const opfSoubor = opfCesta ? najdiSoubor(zip, opfCesta) : null
  if (!opfSoubor) throw new EpubChyba('V EPUBu chybí popis balíčku (OPF).')

  const opf = new DOMParser().parseFromString(await opfSoubor.async('string'), 'application/xml')
  if (prvek(opf, 'parsererror').length > 0 || prvek(opf, 'package').length === 0) {
    throw new EpubChyba('Popis balíčku (OPF) v EPUBu je poškozený.')
  }
  const slozka = opfCesta.includes('/') ? opfCesta.slice(0, opfCesta.lastIndexOf('/')) : ''

  const jazyk = (textPrvku(opf, 'language')[0] ?? '').toLowerCase().split(/[-_]/)[0]
  const meta: EpubMeta = {
    title: (textPrvku(opf, 'title')[0] ?? '').slice(0, 160),
    author: textPrvku(opf, 'creator').slice(0, 3).join(', ').slice(0, 120),
    language: /^[a-z]{2,3}$/.test(jazyk) ? jazyk : '',
    description: bezHtml(textPrvku(opf, 'description')[0] ?? '').slice(0, 2000),
  }

  const manifest = new Map<string, PolozkaManifestu>()
  for (const it of prvek(opf, 'item')) {
    const id = it.getAttribute('id')
    const href = it.getAttribute('href')
    if (!id || !href) continue
    manifest.set(id, {
      id,
      href,
      mediaType: it.getAttribute('media-type') ?? '',
      properties: it.getAttribute('properties') ?? '',
    })
  }

  const spine = prvek(opf, 'itemref')
    .map((r) => r.getAttribute('idref') ?? '')
    .map((id) => manifest.get(id))
    .filter((p): p is PolozkaManifestu => Boolean(p))
  if (spine.length === 0) throw new EpubChyba('EPUB neobsahuje žádný text ke čtení.')

  const kapitolyHtml: KapitolaZHtml[] = []
  let celkemZnaku = 0
  for (const p of spine) {
    if (!jeXhtml(p.mediaType, p.href) || /\bnav\b/.test(p.properties)) continue
    const soubor = najdiSoubor(zip, spojCestu(slozka, p.href))
    if (!soubor) {
      varovani.push(`Chybí soubor ${p.href}, přeskočeno.`)
      continue
    }
    const k = htmlNaKapitolu(await soubor.async('string'))
    if (k.bloky.length === 0) continue // obálka, titulní strana, prázdné stránky
    celkemZnaku += znakuVBlocich(k.bloky)
    if (celkemZnaku > MAX_ZNAKU_KNIHY) {
      throw new EpubChyba(`Kniha je příliš dlouhá (limit je ${MAX_ZNAKU_KNIHY.toLocaleString('cs-CZ')} znaků).`)
    }
    kapitolyHtml.push(k)
  }
  if (kapitolyHtml.length === 0) throw new EpubChyba('V EPUBu se nepodařilo najít žádný text.')

  const kapitoly = rozdelDlouheKapitoly(kapitolyHtml)

  // Obálka: EPUB 3 (properties="cover-image") nebo EPUB 2 (<meta name="cover" content="id">).
  let obalka: Blob | null = null
  const metaObalky = prvek(opf, 'meta').find((m) => m.getAttribute('name') === 'cover')?.getAttribute('content')
  const polozkaObalky =
    Array.from(manifest.values()).find((p) => /\bcover-image\b/.test(p.properties)) ??
    (metaObalky ? manifest.get(metaObalky) : undefined)
  if (polozkaObalky && /^image\//.test(polozkaObalky.mediaType)) {
    const soubor = najdiSoubor(zip, spojCestu(slozka, polozkaObalky.href))
    if (soubor) obalka = new Blob([await soubor.async('arraybuffer')], { type: polozkaObalky.mediaType })
  }

  return {
    meta,
    kapitoly,
    obalka,
    pocetSlov: kapitoly.reduce((s, k) => s + spocitejSlova(k.bloky), 0),
    varovani,
  }
}
