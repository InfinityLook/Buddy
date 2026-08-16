import React from 'react'
import { useOnlineStatus } from '@/core/hooks/useOnlineStatus'

export const NetworkStatusBanner: React.FC = () => {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#f59e0b',
        color: '#000',
        padding: '0.6rem 1.2rem',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '0.85rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <span>⚠️ Jsi offline. Aplikace běží z lokálního úložiště.</span>
    </div>
  )
}
