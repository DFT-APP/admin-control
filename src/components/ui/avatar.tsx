import { useState } from "react"

/**
 * `user_emoji` holds either an emoji or a profile-photo URL (see the
 * widen-user-emoji migration), so anywhere it is shown has to branch on which
 * one it got — otherwise a photo renders as a raw link.
 */
export function Avatar({
  emoji,
  name,
  size = 24,
}: {
  emoji?: string | null
  name?: string | null
  size?: number
}) {
  const [broken, setBroken] = useState(false)
  const isPhoto = !!emoji && /^https?:\/\//i.test(emoji)

  if (isPhoto && !broken) {
    return (
      <img
        src={emoji as string}
        alt={name || "Profile"}
        title={name || undefined}
        loading="lazy"
        style={{ width: size, height: size }}
        className="rounded-full object-cover bg-white/5 flex-shrink-0"
        // A dead photo URL falls back to the neutral placeholder.
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}
      className="rounded-full flex items-center justify-center flex-shrink-0 leading-none"
    >
      {isPhoto ? "👤" : emoji || "👤"}
    </span>
  )
}
