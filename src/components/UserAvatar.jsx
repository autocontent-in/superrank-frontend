const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-teal-500',
]

export function UserAvatar({ user, className = 'w-9 h-9', asButton, ...props }) {
  const name = user?.full_name || user?.first_name || '?'
  const initial = (name && name[0]) ? name[0].toUpperCase() : '?'
  const gradient = AVATAR_GRADIENTS[(initial.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]
  const content = (
    <span
      className={`rounded-full bg-linear-to-br ${gradient} flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm ${className}`}
      title={name}
    >
      {initial}
    </span>
  )
  if (asButton) {
    return (
      <button type="button" className={`shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-100 hover:opacity-90 transition-opacity ${className}`} {...props}>
        {content}
      </button>
    )
  }
  return content
}
