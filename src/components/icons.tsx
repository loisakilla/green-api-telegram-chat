import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const SendIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M3.4 20.4 21.9 12.5a.55.55 0 0 0 0-1L3.4 3.6a.5.5 0 0 0-.7.6L5 11l9 1-9 1-2.3 6.8a.5.5 0 0 0 .7.6z" />
  </svg>
)

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
)

export const BackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
)

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <svg viewBox="0 0 16 11" width="16" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="m1.5 6 3.5 3.5 7-8" />
  </svg>
)

export const DoubleCheckIcon = (props: IconProps) => (
  <svg viewBox="0 0 20 11" width="20" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="m1.5 6 3.5 3.5 7-8" />
    <path d="m9.5 9.5 7-8" />
  </svg>
)

export const ClockIcon = (props: IconProps) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 1.5" />
  </svg>
)

export const AlertIcon = (props: IconProps) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v5h-1.5zm0 6.25h1.5v1.5h-1.5z" />
  </svg>
)

export const TelegramLogo = (props: IconProps) => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" {...props}>
    <circle cx="32" cy="32" r="32" fill="#3390ec" />
    <path fill="#fff" d="M14.5 31.2 45.3 19.3c1.4-.5 2.7.3 2.2 2.5l-5.2 24.6c-.4 1.7-1.4 2.2-2.9 1.4l-8-5.9-3.9 3.7c-.4.4-.8.8-1.6.8l.6-8.1 14.8-13.4c.6-.6-.1-.9-1-.3L22 36.1l-7.9-2.5c-1.7-.5-1.7-1.7.4-2.4z" />
  </svg>
)
