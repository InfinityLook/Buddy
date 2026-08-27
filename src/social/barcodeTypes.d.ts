// BarcodeDetector je pořád nestandardní (Chrome/Edge/Android, ne
// Firefox/Safari) — DOM lib ho proto nemá, stejný důvod jako
// src/buddy/speechTypes.d.ts pro SpeechRecognition. Deklaruje se jen
// ten kousek rozhraní, co SkenovatKodDialog.tsx doopravdy používá.
interface BarcodeDetectorOptions {
  formats: string[]
}

interface DetectedBarcode {
  rawValue: string
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  static getSupportedFormats(): Promise<string[]>
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}
