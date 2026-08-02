import { useCallback, useEffect, useRef, useState } from 'react'

// Shared behaviour for the bottom sheets.
//
// The sheet fades out before it is unmounted, and that is load-bearing rather
// than decorative: pulling a full-screen dimmed overlay out of the DOM in one
// go makes iOS repaint the page underneath in tiles, and the dim visibly leaves
// in chunks — the middle of the screen first, the strip by the Dynamic Island
// last. Letting the overlay animate to transparent means it is already
// invisible by the time it goes away, so that repaint has nothing to show.
// The overlay is also given its own compositing layer (see styles.css) so the
// fade is one surface rather than a repaint of everything behind it.

// Only a backstop for the animationend below, never the normal path — hence
// the generous margin over the 0.2s fade.
const EXIT_FALLBACK_MS = 600

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function useSheet(onClose) {
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef(null)

  const finish = useCallback(() => {
    clearTimeout(timer.current)
    onClose()
  }, [onClose])

  const close = useCallback(() => {
    if (closed.current) return
    closed.current = true
    if (reducedMotion()) { onClose(); return }
    setClosing(true)
    timer.current = setTimeout(onClose, EXIT_FALLBACK_MS)
  }, [onClose])

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return {
    close,
    overlayProps: {
      className: `sheet-overlay${closing ? ' sheet-overlay--closing' : ''}`,
      onClick: (e) => { if (e.target === e.currentTarget) close() },
      // Unmount on the fade actually finishing, not on a timer that matches its
      // duration: the animation starts a frame or two after the class lands, so
      // a matching timeout fires while the dim is still ~12% opaque and yanks a
      // visible overlay out of the tree. Own animation only — the panel's slide
      // and the opening fade bubble through here too.
      onAnimationEnd: (e) => {
        if (closing && e.target === e.currentTarget) finish()
      },
    },
    sheetProps: {
      className: `sheet${closing ? ' sheet--closing' : ''}`,
    },
  }
}
