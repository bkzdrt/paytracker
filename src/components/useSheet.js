import { useCallback, useEffect, useRef } from 'react'

// Shared behaviour for the bottom sheets. Deliberately static: it appears and
// disappears with no motion at all.
//
// It used to slide in, follow a drag, animate out and lock the body scroll
// while open. On iOS that combination flickered — a transform-driven sheet, the
// scroll container rubber-banding underneath it, and `overflow: hidden` on the
// body moving the page behind. None of it was worth the trouble, so the sheet
// is now a plain panel and the page behind it is left alone. Closing is by the
// ✕ button, a tap outside, or Escape.

export function useSheet(onClose) {
  const closed = useRef(false)

  const close = useCallback(() => {
    if (closed.current) return
    closed.current = true
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return {
    close,
    overlayProps: {
      className: 'sheet-overlay',
      onClick: (e) => { if (e.target === e.currentTarget) close() },
    },
    sheetProps: { className: 'sheet' },
  }
}
