import React from 'react'

interface ProfilToastProps {
  message: string | null
}

export const ProfilToast: React.FC<ProfilToastProps> = ({ message }) => (
  <div className={`profil-toast ${message ? 'open' : ''}`} role="status" aria-live="polite">
    {message}
  </div>
)
