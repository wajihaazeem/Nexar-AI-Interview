export function Logo({ size = 46, className = '' }) {
  return (
    <img
      src="/nexar-logo.png"
      width={size}
      height={size}
      alt="Nexar"
      className={`brand-logo ${className}`}
      draggable={false}
    />
  )
}