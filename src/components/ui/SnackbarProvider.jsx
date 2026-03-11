import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react'

const SnackbarContext = createContext(null)
const EXIT_ANIMATION_MS = 250

function getVariantClasses(variant) {
  if (variant === 'success') {
    return 'bg-emerald-600 text-white'
  }
  if (variant === 'error') {
    return 'bg-rose-600 text-white'
  }
  return 'bg-blue-600 text-white'
}

function getFallbackIcon(snackbar) {
  if (snackbar.loading) {
    return <Loader2 className="w-4 h-4 animate-spin shrink-0" />
  }
  if (snackbar.variant === 'success') {
    return <CheckCircle2 className="w-4 h-4 shrink-0" />
  }
  if (snackbar.variant === 'error') {
    return <XCircle className="w-4 h-4 shrink-0" />
  }
  return null
}

export function SnackbarProvider({ children }) {
  const [snackbar, setSnackbar] = useState(null)
  const mainContentContainerRef = useRef(null)
  const autoCloseRef = useRef(null)
  const exitRef = useRef(null)

  const registerMainContentContainer = useCallback((el) => {
    mainContentContainerRef.current = el
  }, [])

  const clearTimers = useCallback(() => {
    if (autoCloseRef.current) {
      window.clearTimeout(autoCloseRef.current)
      autoCloseRef.current = null
    }
    if (exitRef.current) {
      window.clearTimeout(exitRef.current)
      exitRef.current = null
    }
  }, [])

  const closeSnackbar = useCallback((id) => {
    setSnackbar((current) => {
      if (!current) return current
      if (id && current.id !== id) return current
      if (current.phase === 'exit') return current
      return { ...current, phase: 'exit' }
    })

    if (exitRef.current) window.clearTimeout(exitRef.current)
    exitRef.current = window.setTimeout(() => {
      setSnackbar((current) => {
        if (!current) return null
        if (id && current.id !== id) return current
        return null
      })
    }, EXIT_ANIMATION_MS)
  }, [])

  const scheduleAutoClose = useCallback((id, duration) => {
    if (autoCloseRef.current) {
      window.clearTimeout(autoCloseRef.current)
      autoCloseRef.current = null
    }
    if (!duration || duration <= 0) return
    autoCloseRef.current = window.setTimeout(() => {
      closeSnackbar(id)
    }, duration)
  }, [closeSnackbar])

  const showSnackbar = useCallback((config) => {
    const id = config?.id ?? `snackbar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const duration = config?.duration ?? 3000

    clearTimers()

    setSnackbar({
      id,
      message: config?.message ?? '',
      variant: config?.variant ?? 'default',
      loading: Boolean(config?.loading),
      icon: config?.icon ?? null,
      showCloseButton: Boolean(config?.showCloseButton),
      position: config?.position ?? 'default',
      phase: 'enter',
    })

    window.requestAnimationFrame(() => {
      setSnackbar((current) => (current?.id === id ? { ...current, phase: 'show' } : current))
    })

    scheduleAutoClose(id, duration)
    return id
  }, [clearTimers, scheduleAutoClose])

  const updateSnackbar = useCallback((id, next) => {
    setSnackbar((current) => {
      if (!current || current.id !== id) return current
      return {
        ...current,
        ...next,
        id: current.id,
        phase: next?.phase ?? 'show',
      }
    })

    if (next && Object.prototype.hasOwnProperty.call(next, 'duration')) {
      scheduleAutoClose(id, next.duration)
    }
  }, [scheduleAutoClose])

  useEffect(() => () => clearTimers(), [clearTimers])

  const value = useMemo(() => ({
    showSnackbar,
    updateSnackbar,
    closeSnackbar,
    registerMainContentContainer,
  }), [closeSnackbar, showSnackbar, updateSnackbar, registerMainContentContainer])

  const iconNode = snackbar ? (snackbar.icon ?? getFallbackIcon(snackbar)) : null

  const snackbarNode = snackbar && (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 pt-2.5 pb-3 shadow-lg transition-all duration-250 ease-out ${getVariantClasses(snackbar.variant)} ${
        snackbar.phase === 'show'
          ? 'opacity-100 translate-y-0'
          : snackbar.phase === 'exit'
            ? 'opacity-0 translate-y-4'
            : 'opacity-0 translate-y-3'
      }`}
      role="status"
      aria-live="polite"
    >
      {iconNode}
      <span className="text-sm font-medium">{snackbar.message}</span>
      {snackbar.showCloseButton && (
        <button
          type="button"
          onClick={() => closeSnackbar(snackbar.id)}
          className="ml-1 inline-flex items-center justify-center rounded p-0.5 text-white/80 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  const useMainContent = snackbar?.position === 'main-content' && mainContentContainerRef.current
  const isBottomRight = snackbar?.position === 'bottom-right'

  const snackbarContainerClass = isBottomRight
    ? 'pointer-events-none fixed right-6 bottom-6 z-100 flex justify-end px-4'
    : 'pointer-events-none fixed inset-x-0 bottom-6 z-100 flex justify-center px-4'

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snackbar && (
        useMainContent
          ? createPortal(
              <div className="pointer-events-none absolute inset-x-0 bottom-6 z-100 flex justify-center px-4">
                {snackbarNode}
              </div>,
              mainContentContainerRef.current
            )
          : (
              <div className={snackbarContainerClass}>
                {snackbarNode}
              </div>
            )
      )}
    </SnackbarContext.Provider>
  )
}

export function useSnackbar() {
  const context = useContext(SnackbarContext)
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider')
  }
  return context
}

/** Renders a container for snackbars positioned in the main content area. Mount inside the main content element (which should have position: relative). */
export function SnackbarMainContentContainer() {
  const { registerMainContentContainer } = useSnackbar()
  const ref = useRef(null)

  useEffect(() => {
    registerMainContentContainer(ref.current)
    return () => registerMainContentContainer(null)
  }, [registerMainContentContainer])

  return <div ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden />
}
