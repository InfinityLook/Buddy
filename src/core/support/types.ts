// ==========================================
// Tvary dat support systému. Viz migrace support_system.
// ==========================================

export type StavTiketu = 'otevreny' | 'vyrizeny'

export interface Tiket {
  id: string
  subject: string
  status: StavTiketu
  createdAt: string
  updatedAt: string
  userId: string
  /** Jméno zakladatele — jen pro admina, který vidí cizí tikety. */
  uzivatelJmeno?: string
}

export interface ZpravaTiketu {
  id: string
  ticketId: string
  autorId: string
  jeOdPodpory: boolean
  text: string
  createdAt: string
}
