// Exportuje data ze storu do JSON souboru a spustí stažení
export const exportDataToJson = (data: unknown, filename = 'schoolbuddy-backup.json') => {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Chyba při exportu dat:', error)
    alert('Export dat se nepodařil.')
  }
}

// Načte JSON soubor vybraný uživatelem
export const importDataFromJson = <T>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content) as T
        resolve(parsed)
      } catch (error) {
        reject(new Error('Soubor není platný JSON.'))
      }
    }

    reader.onerror = () => reject(new Error('Chyba při čtení souboru.'))
    reader.readAsText(file)
  })
}
