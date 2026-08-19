import React from 'react'

interface ShopIconProps {
  name: string
  size?: number
  className?: string
}

// Ikony rozhraní obchodu. Emoji se používají pro zboží (stejně jako
// u odznaků v Odměnách), tenhle komponent je na chrom kolem — šipky,
// zámky, potvrzení.
export const ShopIcon: React.FC<ShopIconProps> = ({ name, size = 20, className }) => {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  }

  switch (name) {
    case 'arrow-left':
      return <svg {...common}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    case 'coin':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M9.5 9.5h3.75a1.75 1.75 0 0 1 0 3.5H9.5"/></svg>
    case 'crown':
      return <svg {...common}><path d="m3 7 3.5 3L12 4l5.5 6L21 7l-1.5 11h-15z"/></svg>
    case 'check':
      return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>
    case 'lock':
      return <svg {...common}><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
    case 'sparkle':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4"/></svg>
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    case 'info':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>
    default:
      return null
  }
}
