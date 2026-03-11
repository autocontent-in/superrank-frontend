import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

const RADIUS_CLASSES = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
}

const BACKDROP_BLUR_CLASSES = {
  none: 'backdrop-blur-none',
  xs: 'backdrop-blur-xs',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl',
}

export function SmartModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer = null,
  size = 'lg',
  fullscreen = false,
  animation = 'scale',
  durationMs = 220,
  radius = 'xl',
  radiusClass = '',
  backdropBlur = 'none',
  showHeader = true,
  showFooter = true,
  scrollMode = 'content',
  staticBackdrop = false,
  closeOnEscape = true,
  closeOnBackdrop = true,
  showCloseButton = true,
  contentClassName = '',
  headerClassName = '',
  footerClassName = '',
  className = '',
}) {
  const [shouldRender, setShouldRender] = useState(open)
  const [phase, setPhase] = useState(open ? 'entering' : 'exited')
  const closeTimerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (open) {
      setShouldRender(true)
      setPhase('entering')
      // rAF + setTimeout(0) ensures the browser paints the "entering" state before we
      // transition to "entered", fixing the no-animation bug on various routes
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          setPhase('entered')
        }, 0)
      })
      return
    }

    if (!shouldRender) return

    setPhase('exiting')
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false)
      setPhase('exited')
    }, durationMs)
  }, [open, durationMs, shouldRender])

  useEffect(() => {
    if (!shouldRender) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key !== 'Escape' || !open) return
      if (staticBackdrop || !closeOnEscape) return
      onClose?.()
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose, shouldRender, staticBackdrop, closeOnEscape])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  if (!shouldRender) return null

  const isScreenScroll = scrollMode === 'screen' && !fullscreen
  const effectiveRadiusClass = radiusClass || (fullscreen ? 'rounded-none' : (RADIUS_CLASSES[radius] ?? 'rounded-2xl'))
  const panelClass = fullscreen
    ? `h-screen w-screen border-0 ${effectiveRadiusClass} ${className}`.trim()
    : `w-full ${SIZE_CLASSES[size] ?? SIZE_CLASSES.lg} ${
      isScreenScroll ? `border border-slate-200 ${effectiveRadiusClass}` : `max-h-[90vh] border border-slate-200 ${effectiveRadiusClass}`
    } ${className}`.trim()

  const panelAnimationClass = animation === 'top'
    ? (phase === 'entered' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6')
    : (phase === 'entered' ? 'opacity-100 scale-100' : 'opacity-0 scale-105')

  const backdropAnimationClass = phase === 'entered' ? 'opacity-100' : 'opacity-0'
  const backdropBlurClass = BACKDROP_BLUR_CLASSES[backdropBlur] ?? BACKDROP_BLUR_CLASSES.sm
  const containerLayoutClass = isScreenScroll
    ? 'items-start justify-center overflow-y-auto py-6 px-4'
    : 'items-center justify-center p-4'
  const modalScrollClass = scrollMode === 'modal' ? 'overflow-y-auto' : 'overflow-hidden'
  const contentScrollClass = scrollMode === 'content' ? 'overflow-auto' : 'overflow-visible'

  const triggerBackdropBump = () => {
    const panel = panelRef.current
    if (!panel || typeof panel.animate !== 'function') return
    panel.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.015)' },
        { transform: 'scale(1)' },
      ],
      { duration: 170, easing: 'ease-out' },
    )
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-10020 flex bg-black/50 ${backdropBlurClass} transition-opacity ${containerLayoutClass} ${backdropAnimationClass}`}
      style={{ transitionDuration: `${durationMs}ms` }}
      onClick={() => {
        if (staticBackdrop) {
          triggerBackdropBump()
          return
        }
        if (closeOnBackdrop) onClose?.()
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`relative bg-white shadow-xl flex flex-col ${modalScrollClass} transform transition-all ${panelAnimationClass} ${panelClass}`}
        style={{ transitionDuration: `${durationMs}ms` }}
        onClick={(event) => event.stopPropagation()}
      >
        {showHeader ? (
          <div className={`flex items-center justify-between gap-4 pl-4 pr-2 py-2 border-b border-slate-200 ${headerClassName}`}>
            <div className="min-w-0">
              {title ? <h2 className="text-base font-semibold text-slate-900 truncate">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        {!showHeader && showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 rounded-lg text-slate-500 bg-white/80 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
        <div className={`flex-1 min-h-0 ${contentScrollClass} ${contentClassName}`}>{children}</div>
        {showFooter && footer ? <div className={`px-5 py-3 border-t border-slate-200 ${footerClassName}`}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
