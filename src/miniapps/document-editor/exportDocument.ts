// ==========================================
// Export dokumentu ven z aplikace.
//
// Stahování dřív posílalo do souboru holý innerHTML editoru. Takový
// soubor není platný HTML dokument a hlavně nemá deklarované kódování —
// po otevření z disku prohlížeč hádá a česká diakritika se rozsype
// ("Å¾" místo "ž"). Proto se obsah balí do celého dokumentu s UTF-8.
// ==========================================

// Název dokumentu jde do názvu souboru. Lomítko by cestu rozbilo,
// prázdný název by dal soubor pojmenovaný jen příponou.
export const safeFileName = (title: string, extension: string): string => {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    // Název složený jen ze zakázaných znaků by po náhradě dal soubor
    // pojmenovaný "-.txt" — tečky a pomlčky na krajích proto odřízneme.
    .replace(/^[-.\s]+|[-.\s]+$/g, '')

  return `${cleaned || 'dokument'}.${extension}`
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Obsah editoru zabalený do samostatně otevíratelného dokumentu.
// Styly jsou vepsané, aby soubor vypadal k světu i mimo aplikaci.
export const buildHtmlDocument = (title: string, bodyHtml: string): string => `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body {
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.6;
    color: #111;
    background: #fff;
    max-width: 42rem;
    margin: 2rem auto;
    padding: 0 1.25rem;
  }
  img { max-width: 100%; height: auto; }
  blockquote {
    margin: 1rem 0;
    padding-left: 1rem;
    border-left: 3px solid #ccc;
    color: #444;
  }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`

export const downloadBlob = (content: string, fileName: string, mime: string): void => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Největší rozměr vloženého obrázku. Obrázek se ukládá do dokumentu jako
// data URL, tedy do localStorage, kde má celá aplikace dohromady jen pár
// megabajtů — fotka z telefonu bez zmenšení by kvótu vyčerpala sama.
const MAX_IMAGE_SIDE = 1200
const IMAGE_QUALITY = 0.82

export interface ImageResult {
  ok: boolean
  dataUrl?: string
  error?: string
}

/**
 * Načte obrázek ze zařízení, zmenší ho a vrátí jako data URL.
 *
 * Vkládání přes adresu z internetu bylo pro offline aplikaci k ničemu —
 * bez připojení se obrázek nenačetl a v exportu chyběl úplně.
 */
export const readImageAsDataUrl = (file: File): Promise<ImageResult> =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ ok: false, error: 'Tohle není obrázek.' })
      return
    }

    const reader = new FileReader()

    reader.onerror = () => resolve({ ok: false, error: 'Obrázek se nepodařilo načíst.' })

    reader.onload = () => {
      const image = new Image()

      image.onerror = () => resolve({ ok: false, error: 'Obrázek se nepodařilo načíst.' })

      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height))
        const width = Math.round(image.width * scale)
        const height = Math.round(image.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve({ ok: false, error: 'Obrázek se nepodařilo zpracovat.' })
          return
        }

        ctx.drawImage(image, 0, 0, width, height)

        // Průhlednost se do JPEG nepřenese, proto u PNG zůstáváme u PNG
        const useJpeg = file.type !== 'image/png'
        const dataUrl = useJpeg
          ? canvas.toDataURL('image/jpeg', IMAGE_QUALITY)
          : canvas.toDataURL('image/png')

        resolve({ ok: true, dataUrl })
      }

      image.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })

// Zhruba kolik místa data URL zabere po uložení. Slouží jen k varování.
export const approximateBytes = (dataUrl: string): number =>
  Math.round((dataUrl.length * 3) / 4)
