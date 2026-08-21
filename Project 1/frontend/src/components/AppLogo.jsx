import { useId } from 'react'

const AppLogo = ({ size = 32, title = 'Inventory Management' }) => {
  const uid = useId().replace(/:/g, '')
  const gradId = `imMark-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      <path d="M16 6.8L25.2 11.2L16 15.6L6.8 11.2L16 6.8Z" fill="white" />
      <path d="M6.8 11.2V20.4L16 24.8V15.6L6.8 11.2Z" fill="white" fillOpacity="0.88" />
      <path d="M25.2 11.2V20.4L16 24.8V15.6L25.2 11.2Z" fill="white" fillOpacity="0.68" />
    </svg>
  )
}

export default AppLogo
