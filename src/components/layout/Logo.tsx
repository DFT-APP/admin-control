/**
 * DFT brand lockup. Served from /public so it is not bundled, and sized by
 * height alone — the artwork carries its own aspect ratio.
 */
export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="DFT"
      className={`w-auto object-contain ${className}`}
    />
  )
}

export default Logo
