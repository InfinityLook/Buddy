import React from 'react'

interface ProfilIconProps {
  name: string
  size?: number
  className?: string
}

export const ProfilIcon: React.FC<ProfilIconProps> = ({ name, size = 20, className }) => {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className
  }

  switch (name) {
    case 'arrow-left':
      return <svg {...common}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    case 'bell':
      return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3"/>
