import type { AppColor } from '@/core/store/useAppStore'

// ==========================================
// Sdílené tvary pro "vlajkové appky" (School Room a další, co přijdou
// později — viz FlagshipShell.tsx pro celé zdůvodnění, proč je tenhle
// plášť samostatný modul, ne součást School Roomu samotného).
// ==========================================

export interface FlagshipDlazdice {
  id: string
  nazev: string
  popis: string
  /** Jméno ikony z AppIcon.tsx — sdílená appka nemá vlastní sadu ikon. */
  ikona: string
  barva: AppColor
  onClick: () => void
}

export interface FlagshipVelkaKarta {
  id: string
  nazev: string
  popis: string
  ikona: string
  barva: AppColor
  onClick: () => void
}
