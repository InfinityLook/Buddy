// ==========================================
// Zápis dekódovaných zvukových dat do skutečného WAV souboru — appčino
// "stažení beatu/nahrávky jako soubor" (viz MusicStudio.tsx). Appka
// bere jen minimální rozhraní (počet kanálů/délka/vzorkovací kmitočet
// + getChannelData), ne přímo typ AudioBuffer — jde tak testovat
// obyčejným fingovaným objektem bez skutečného prohlížečového Web
// Audia (to ve Vitestu/jsdom vůbec neexistuje), a `AudioBuffer`, který
// vrací `OfflineAudioContext.startRendering()`, tohle rozhraní stejně
// splňuje beze změny.
//
// Prostý nekomprimovaný PCM16 mono/stereo WAV — appka nepotřebuje
// kompresi (MP3/AAC by chtěly skutečný enkodér, žádnou knihovnu appka
// nemá), jen soubor, co skutečně přehraje jakýkoliv přehrávač.
// ==========================================

export interface ZvukovaData {
  numberOfChannels: number
  length: number
  sampleRate: number
  getChannelData(channel: number): Float32Array
}

export const bufferNaWavBlob = (buffer: ZvukovaData): Blob => {
  const pocetKanalu = buffer.numberOfChannels
  const delkaVzorku = buffer.length
  const vzorkovaciFrekvence = buffer.sampleRate
  const bytuNaVzorek = 2 // 16bitové PCM
  const blokZarovnani = pocetKanalu * bytuNaVzorek
  const velikostDat = delkaVzorku * blokZarovnani

  const arrayBuffer = new ArrayBuffer(44 + velikostDat)
  const view = new DataView(arrayBuffer)

  const zapisRetezec = (offset: number, retezec: string) => {
    for (let i = 0; i < retezec.length; i++) view.setUint8(offset + i, retezec.charCodeAt(i))
  }

  zapisRetezec(0, 'RIFF')
  view.setUint32(4, 36 + velikostDat, true)
  zapisRetezec(8, 'WAVE')
  zapisRetezec(12, 'fmt ')
  view.setUint32(16, 16, true) // délka fmt bloku
  view.setUint16(20, 1, true) // formát 1 = PCM
  view.setUint16(22, pocetKanalu, true)
  view.setUint32(24, vzorkovaciFrekvence, true)
  view.setUint32(28, vzorkovaciFrekvence * blokZarovnani, true) // byte rate
  view.setUint16(32, blokZarovnani, true)
  view.setUint16(34, bytuNaVzorek * 8, true)
  zapisRetezec(36, 'data')
  view.setUint32(40, velikostDat, true)

  const kanaly: Float32Array[] = []
  for (let kanal = 0; kanal < pocetKanalu; kanal++) kanaly.push(buffer.getChannelData(kanal))

  let offset = 44
  for (let i = 0; i < delkaVzorku; i++) {
    for (let kanal = 0; kanal < pocetKanalu; kanal++) {
      const vzorek = Math.max(-1, Math.min(1, kanaly[kanal][i] ?? 0))
      view.setInt16(offset, vzorek < 0 ? vzorek * 0x8000 : vzorek * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}
