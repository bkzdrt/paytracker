import { useCallback, useEffect, useRef, useState } from 'react'

// Shared behaviour for the bottom sheets: drag-to-dismiss that follows the
// finger, a background that stays put while the sheet is open, and a proper
// exit animation. Returns props to spread onto the overlay and the sheet.
//
// Drag only arms when the content is scrolled to the top, so flicking through a
// long list never dismisses the sheet by accident.

const EXIT_MS = 200
const DISMISS_PX = 90

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function useSheet(onClose) {
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  // Sticks once the user drags: the entry animation also drives `transform`, so
  // it has to stay switched off afterwards or it replays on every release.
  const [dragged, setDragged] = useState(false)
  const sheetRef = useRef(null)
  const startY = useRef(0)
  const dragging = useRef(false)
  const closed = useRef(false)
  // Mirrors dragY. On a quick flick the final touchmove and the touchend land in
  // the same frame, so the handler's captured dragY is still a render behind —
  // the dismiss decision has to read the live value.
  const offset = useRef(0)

  const close = useCallback(() => {
    if (closed.current) return
    closed.current = true
    dragging.current = false
    offset.current = 0
    setDragY(0) // drop the inline transform so the exit animation owns it
    if (reducedMotion()) { onClose(); return }
    setClosing(true)
    setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Keep the page behind the sheet from scrolling under the user's finger
  useEffect(() => {
    const { body } = document
    const previous = body.style.overflow
    body.style.overflow = 'hidden'
    return () => { body.style.overflow = previous }
  }, [])

  const overlayProps = {
    className: `sheet-overlay${closing ? ' sheet-overlay--closing' : ''}`,
    onClick: (e) => { if (e.target === e.currentTarget) close() },
  }

  const sheetProps = {
    ref: sheetRef,
    className: `sheet${dragged ? ' sheet--dragged' : ''}${closing ? ' sheet--closing' : ''}`,
    // No transition while the finger is down — the sheet must track it 1:1
    style: dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined,
    onTouchStart: (e) => {
      if (closed.current) return
      // Anything but the very top of the content means the user is scrolling
      if ((sheetRef.current?.scrollTop ?? 0) > 0) return
      startY.current = e.touches[0].clientY
      dragging.current = true
    },
    onTouchMove: (e) => {
      if (!dragging.current) return
      const dy = Math.max(0, e.touches[0].clientY - startY.current)
      if (dy > 0 && !dragged) setDragged(true)
      offset.current = dy
      setDragY(dy)
    },
    onTouchEnd: () => {
      if (!dragging.current) return
      dragging.current = false
      if (offset.current > DISMISS_PX) close()
      else { offset.current = 0; setDragY(0) } // snap back
    },
  }

  return { close, overlayProps, sheetProps }
}
