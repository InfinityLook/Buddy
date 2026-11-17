import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import {
  EpubChyba,
  htmlNaKapitolu,
  normalizujText,
  parsujEpub,
  rozdelDlouheKapitoly,
  spocitejSlova,
} from '@/pages/library/epubImport'
import { ocistiBloky } from '@/pages/library/libraryTextTypes'

const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

const opf = (extra = '', spine = ['k1', 'k2']) => `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Dvacet tisíc mil</dc:title>
    <dc:creator>Jules Verne</dc:creator>
    <dc:language>cs-CZ</dc:language>
    <dc:description>&lt;p&gt;Kapitán &lt;b&gt;Nemo&lt;/b&gt; a jeho ponorka.&lt;/p&gt;</dc:description>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover-img" href="img/cover.jpg" media-type="image/jpeg"/>
    <item id="uvod" href="uvod.xhtml" media-type="application/xhtml+xml"/>
    <item id="k1" href="text/k%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="k2" href="text/k2.xhtml" media-type="application/xhtml+xml"/>
    ${extra}
  </manifest>
  <spine>${['uvod', ...spine].map((id) => `<itemref idref="${id}"/>`).join('')}</spine>
</package>`

const xhtml = (telo: string) =>
  `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head><body>${telo}</body></html>`

async function vytvorEpub(opts: { opf?: string; sifra?: string } = {}): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file('META-INF/container.xml', CONTAINER)
  if (opts.sifra) zip.file('META-INF/encryption.xml', opts.sifra)
  zip.file('OEBPS/content.opf', opts.opf ?? opf())
  zip.file('OEBPS/nav.xhtml', xhtml('<nav><ol><li>Kapitola 1</li></ol></nav>'))
  zip.file('OEBPS/uvod.xhtml', xhtml('<div></div>'))
  zip.file(
    'OEBPS/text/k 1.xhtml',
    xhtml('<h1>Kapitola první</h1><p>Rok 1866 byl poznamenán zvláštní událostí.</p><p>Druhý <em>odstavec</em>,<br/>pokračuje.</p><hr/><blockquote>Citát.</blockquote>')
  )
  zip.file('OEBPS/text/k2.xhtml', xhtml('<h2>Druhá</h2><div><p>Jediný odstavec.</p></div><script>alert(1)</script>'))
  zip.file('OEBPS/img/cover.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))
  return zip.generateAsync({ type: 'uint8array' })
}

describe('normalizujText', () => {
  it('sloučí bílé znaky, nezlomitelnou mezeru i neviditelné znaky', () => {
    expect(normalizujText('  a  b\n\tc­ d​ ')).toBe('a b c d')
  })
})

describe('htmlNaKapitolu', () => {
  it('převede nadpis, odstavce, oddělovač a citát; úvodní nadpis se stane titulkem', () => {
    const k = htmlNaKapitolu(
      '<body><h1>Titul</h1><p>Text <b>tučně</b> a <a href="#">odkaz</a>.</p><hr/><blockquote>Cit</blockquote><h3>Mezititulek</h3></body>'
    )
    expect(k.title).toBe('Titul')
    expect(k.bloky).toEqual([
      { typ: 'odstavec', text: 'Text tučně a odkaz.' },
      { typ: 'oddelovac', text: '' },
      { typ: 'citat', text: 'Cit' },
      { typ: 'nadpis', text: 'Mezititulek' },
    ])
  })

  it('přeskočí script, style a nav; <br> je mezera', () => {
    const k = htmlNaKapitolu('<body><style>p{}</style><nav>menu</nav><p>a<br>b</p><script>x()</script></body>')
    expect(k.bloky).toEqual([{ typ: 'odstavec', text: 'a b' }])
  })

  it('zanořený div s odstavci nevytvoří duplicity a text mimo odstavce se zachová', () => {
    const k = htmlNaKapitolu('<body><div>Volný text<p>Odstavec</p>Konec</div></body>')
    expect(k.bloky.map((b) => b.text)).toEqual(['Volný text', 'Odstavec', 'Konec'])
  })

  it('zahodí oddělovače na okrajích a zdvojené', () => {
    const k = htmlNaKapitolu('<body><hr/><p>a</p><hr/><hr/><p>b</p><hr/></body>')
    expect(k.bloky.map((b) => b.typ)).toEqual(['odstavec', 'oddelovac', 'odstavec'])
  })

  it('výsledek projde ocistiBloky beze ztráty (kontrakt čtečky)', () => {
    const k = htmlNaKapitolu('<body><p>Ahoj</p><hr/><blockquote>Cit</blockquote></body>')
    expect(ocistiBloky(k.bloky)).toEqual(k.bloky)
  })

  it('nikdy nevrátí HTML, jen text', () => {
    const k = htmlNaKapitolu('<body><p>&lt;b&gt;ne&lt;/b&gt; <img src="x" onerror="x()"> ok</p></body>')
    expect(k.bloky[0].text).toBe('<b>ne</b> ok')
  })
})

describe('rozdelDlouheKapitoly', () => {
  const blok = (n: number) => ({ typ: 'odstavec' as const, text: 'x'.repeat(n) })

  it('krátké kapitoly nechá a očísluje od nuly', () => {
    const v = rozdelDlouheKapitoly([{ title: 'A', bloky: [blok(10)] }, { title: 'B', bloky: [blok(10)] }], 100)
    expect(v.map((k) => [k.position, k.title])).toEqual([[0, 'A'], [1, 'B']])
  })

  it('dlouhou rozdělí na části mezi bloky a označí je', () => {
    const v = rozdelDlouheKapitoly([{ title: 'Dlouhá', bloky: [blok(60), blok(60), blok(60)] }], 100)
    expect(v.map((k) => k.title)).toEqual(['Dlouhá', 'Dlouhá (2)', 'Dlouhá (3)'])
    expect(v.map((k) => k.position)).toEqual([0, 1, 2])
    expect(v.every((k) => k.bloky.length === 1)).toBe(true)
  })

  it('jeden obří blok se neřeže (zůstane celý v jedné části)', () => {
    const v = rozdelDlouheKapitoly([{ title: '', bloky: [blok(500)] }], 100)
    expect(v).toHaveLength(1)
    expect(v[0].bloky[0].text).toHaveLength(500)
  })
})

describe('spocitejSlova', () => {
  it('počítá slova, oddělovač je 0', () => {
    expect(spocitejSlova([{ typ: 'odstavec', text: 'a b c' }, { typ: 'oddelovac', text: '' }])).toBe(3)
  })
})

describe('parsujEpub', () => {
  it('přečte metadata, kapitoly v pořadí spine a obálku', async () => {
    const v = await parsujEpub(await vytvorEpub())
    expect(v.meta).toEqual({
      title: 'Dvacet tisíc mil',
      author: 'Jules Verne',
      language: 'cs',
      description: 'Kapitán Nemo a jeho ponorka.',
    })
    // úvodní prázdná stránka a nav se přeskočí
    expect(v.kapitoly.map((k) => k.title)).toEqual(['Kapitola první', 'Druhá'])
    expect(v.kapitoly.map((k) => k.position)).toEqual([0, 1])
    expect(v.kapitoly[0].bloky[0].text).toBe('Rok 1866 byl poznamenán zvláštní událostí.')
    expect(v.kapitoly[1].bloky).toEqual([{ typ: 'odstavec', text: 'Jediný odstavec.' }])
    expect(v.obalka?.type).toBe('image/jpeg')
    expect(v.obalka?.size).toBe(4)
    expect(v.pocetSlov).toBeGreaterThan(8)
  })

  it('obálka EPUB 3 podle properties="cover-image"', async () => {
    const m = opf('<item id="c3" href="img/cover.jpg" media-type="image/jpeg" properties="cover-image"/>').replace(
      '<meta name="cover" content="cover-img"/>',
      ''
    )
    const v = await parsujEpub(await vytvorEpub({ opf: m }))
    expect(v.obalka).not.toBeNull()
  })

  it('odmítne soubor, který není ZIP', async () => {
    await expect(parsujEpub(new TextEncoder().encode('ahoj'))).rejects.toBeInstanceOf(EpubChyba)
  })

  it('odmítne EPUB s DRM, ale obfuskaci fontů pustí', async () => {
    const drm = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/></EncryptedData></encryption>`
    await expect(parsujEpub(await vytvorEpub({ sifra: drm }))).rejects.toThrow(/DRM/)

    // Obfuskace fontů (IDPF i Adobe) text neomezuje.
    const fonty = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData><EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"><EncryptionMethod Algorithm="http://ns.adobe.com/pdf/enc#RC"/></EncryptedData></encryption>`
    await expect(parsujEpub(await vytvorEpub({ sifra: fonty }))).resolves.toBeTruthy()
  })

  it('EPUB bez textu skončí srozumitelnou chybou', async () => {
    const zip = new JSZip()
    zip.file('META-INF/container.xml', CONTAINER)
    zip.file('OEBPS/content.opf', opf('', []))
    zip.file('OEBPS/uvod.xhtml', xhtml('<div></div>'))
    await expect(parsujEpub(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/žádný text/)
  })

  it('chybějící soubor ze spine jen varuje a import pokračuje', async () => {
    const zip = new JSZip()
    zip.file('META-INF/container.xml', CONTAINER)
    zip.file('OEBPS/content.opf', opf())
    zip.file('OEBPS/uvod.xhtml', xhtml('<p>Úvod</p>'))
    zip.file('OEBPS/text/k2.xhtml', xhtml('<p>Text</p>'))
    const v = await parsujEpub(await zip.generateAsync({ type: 'uint8array' }))
    expect(v.kapitoly).toHaveLength(2) // úvod + k2
    expect(v.varovani.join(' ')).toMatch(/k%201\.xhtml/)
  })
})
