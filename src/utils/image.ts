// Sdílený první krok pro obě funkce níž — načte soubor, zmenší ho na
// canvas. Zbytek (data URL vs. Blob) uděl jen poslední krok, jinak by
// obě funkce duplikovaly identickou FileReader/Image logiku.
function resizovanyCanvas(file: File, maxSize: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vybraný soubor není obrázek.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Nepodařilo se načíst soubor.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Nepodařilo se načíst obrázek.'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas není podporován.'))
          return
        }

        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Zmenší a zkomprimuje vybraný obrázek do malého Data URL,
// aby se dal bez problémů uložit do localStorage.
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 200,
  quality = 0.85
): Promise<string> {
  const canvas = await resizovanyCanvas(file, maxSize)
  return canvas.toDataURL('image/jpeg', quality)
}

// Stejné zmenšení, ale jako Blob — pro nahrání do Supabase Storage
// (core/supabase/avatarStorage.ts), kde by base64 z data URL jen
// zbytečně navyšovalo velikost přenosu o třetinu.
export async function fileToResizedBlob(
  file: File,
  maxSize = 512,
  quality = 0.85
): Promise<Blob> {
  const canvas = await resizovanyCanvas(file, maxSize)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Obrázek se nepodařilo zpracovat.'))),
      'image/jpeg',
      quality
    )
  })
}
