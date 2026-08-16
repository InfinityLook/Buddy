// Zmenší a zkomprimuje vybraný obrázek do malého Data URL,
// aby se dal bez problémů uložit do localStorage.
export function fileToResizedDataUrl(
  file: File,
  maxSize = 200,
  quality = 0.85
): Promise<string> {
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
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
