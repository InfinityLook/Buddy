import { StateStorage } from 'zustand/middleware'

// Jednoduchý a rychlý šifrovací klíč (v produkci lze kombinovat např. s ID uživatele)
const ENCRYPTION_KEY = 'schoolbuddy_secure_key_2026'

// Pomocná funkce pro šifrování textu
const encryptData = (data: string): string => {
  try {
    const textBytes = new TextEncoder().encode(data)
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY)
    const encrypted = textBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length])
    return btoa(String.fromCharCode(...encrypted))
  } catch (error) {
    console.error('Chyba při šifrování dat:', error)
    return data
  }
}

// Pomocná funkce pro dešifrování textu
const decryptData = (encryptedData: string): string => {
  try {
    const decoded = atob(encryptedData)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i)
    }
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY)
    const decrypted = bytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length])
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('Chyba při dešifrování dat (možná nezašifrovaný starý stav):', error)
    return encryptedData
  }
}

// Vlastní Storage adaptér pro Zustand
export const secureStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const item = localStorage.getItem(name)
    if (!item) return null
    
    // Zkusíme dešifrovat. Pokud selže (např. u starých nezašifrovaných dat), vrátíme původní
    try {
      return decryptData(item)
    } catch {
      return item
    }
  },
  setItem: (name: string, value: string): void => {
    const encryptedValue = encryptData(value)
    localStorage.setItem(name, encryptedValue)
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
      }
