import JSZip from 'jszip'
import { collectFullBackup } from './backup'
import { getFileBlob, listStoredFileIds, putFileBlob } from './fileStorage'

// ==========================================
// Záloha VČETNĚ obsahu souborů z File Manageru.
//
// backup.ts's collectFullBackup()/exportFullBackup() zůstávají schválně
// jen metadata — desítky megabajtů reálného obsahu zabalené jako base64
// do jednoho JSON řetězce by ze zálohy udělaly nepoužitelný soubor (viz
// komentář tam). Zip ale binární data nekóduje, jen je sbalí vedle sebe
// — stejná JSON obálka jako dřív jako `backup.json`, plus jeden soubor
// na blob pod `files/<id>`. Tohle je proto jediné místo, kde `restore`
// souboru z jiného zařízení doopravdy vrátí i obsah, ne jen záznam
// "soubor tu byl", jak appka hlásila dřív.
// ==========================================

export const exportFullBackupWithFiles = async (): Promise<boolean> => {
  try {
    const envelope = collectFullBackup()
    const zip = new JSZip()
    zip.file('backup.json', JSON.stringify(envelope, null, 2))

    const slozka = zip.folder('files')
    for (const id of await listStoredFileIds()) {
      const blob = await getFileBlob(id)
      if (blob) slozka?.file(id, blob)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `buddy-zaloha-${new Date().toISOString().slice(0, 10)}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Chyba při exportu zálohy se soubory:', error)
    return false
  }
}

/** Podle přípony/MIME pozná novou zálohu (.zip, s obsahem souborů) od
 *  starší (.json, jen metadata) — obojí musí umět nahrát dál fungovat. */
export const jeZipZaloha = (file: File): boolean =>
  file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip'

export interface NactenaZipZaloha {
  envelope: unknown
  /** id souboru → jeho bajty, ještě bez typu — ten se dosadí až podle
   *  obnovených metadat File Manageru, ne podle toho, co si pamatuje zip. */
  soubory: Map<string, Blob>
}

export const importZipBackup = async (file: File): Promise<NactenaZipZaloha> => {
  const zip = await JSZip.loadAsync(file)

  const backupEntry = zip.file('backup.json')
  if (!backupEntry) throw new Error('Záloha neobsahuje backup.json.')

  const envelope = JSON.parse(await backupEntry.async('string'))

  const soubory = new Map<string, Blob>()
  const ukoly: Promise<void>[] = []

  // Celý zip, ne zip.folder('files') — nespoléhá se tím na to, jak
  // přesně JSZip řeší relativní cesty podsložky, jen na prefix jména.
  zip.forEach((cesta, entry) => {
    if (entry.dir || !cesta.startsWith('files/')) return
    const id = cesta.slice('files/'.length)
    ukoly.push(entry.async('blob').then((blob) => void soubory.set(id, blob)))
  })

  await Promise.all(ukoly)
  return { envelope, soubory }
}

/**
 * Zapíše obnovené blob soubory zpátky do IndexedDB — až po
 * restoreFullBackup(envelope), protože mime bere z právě obnovených
 * metadat File Manageru (FileItem.mime) a Music Studia (Recording.mime),
 * ne z toho, co si pamatuje zip (JSZip typ blobu při balení
 * nezachovává, jen bajty). Oba zdroje sdílí to samé IndexedDB úložiště
 * (core/utils/fileStorage.ts) s odděleným prostorem id, takže mime
 * mapa je jen sjednocení obou — druhý zdroj přidaný ve chvíli, kdy
 * Music Room potřeboval přesně tu samou schopnost, co File Manager
 * už měl.
 */
export const restoreFilesFromZip = async (soubory: Map<string, Blob>, envelope: unknown): Promise<number> => {
  const data = (envelope as { data?: Record<string, unknown> } | null)?.data
  const fmRaw = data?.['schoolbuddy-file-manager-storage']
  const files = (fmRaw as { state?: { files?: { id: string; mime: string }[] } } | undefined)?.state?.files ?? []

  const msRaw = data?.['schoolbuddy-music-studio-storage']
  const recordings =
    (msRaw as { state?: { recordings?: { id: string; mime: string }[] } } | undefined)?.state?.recordings ?? []

  const mimeById = new Map([...files, ...recordings].map((f) => [f.id, f.mime]))

  let obnoveno = 0
  await Promise.all(
    [...soubory.entries()].map(async ([id, blob]) => {
      const mime = mimeById.get(id) ?? blob.type ?? 'application/octet-stream'
      const typovany = mime === blob.type ? blob : new Blob([blob], { type: mime })
      try {
        await putFileBlob(id, typovany)
        obnoveno++
      } catch (error) {
        console.warn(`Soubor ${id} se nepodařilo obnovit:`, error)
      }
    })
  )
  return obnoveno
}
