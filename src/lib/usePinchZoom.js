import { useEffect, useRef } from 'react'

export function usePinchZoom(containerRef, onZoomChange) {
  const initialDistanceRef = useRef(null)
  const initialScaleRef = useRef(1)

  useEffect(() => {
    if (!containerRef?.current) return

    const el = containerRef.current
    let currentScale = 1

    function getDistance(touches) {
      if (touches.length !== 2) return null
      const [t1, t2] = touches
      const dx = t1.clientX - t2.clientX
      const dy = t1.clientY - t2.clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        initialDistanceRef.current = getDistance(e.touches)
        initialScaleRef.current = currentScale
        e.preventDefault()
      }
    }

    function handleTouchMove(e) {
      if (e.touches.length !== 2 || !initialDistanceRef.current) return

      const currentDistance = getDistance(e.touches)
      if (!currentDistance) return

      const ratio = currentDistance / initialDistanceRef.current
      currentScale = Math.max(1, Math.min(3, initialScaleRef.current * ratio))

      el.style.transform = `scale(${currentScale})`
      el.style.transformOrigin = 'center center'
      el.style.transition = 'none'

      if (onZoomChange) {
        onZoomChange(currentScale)
      }

      e.preventDefault()
    }

    function handleTouchEnd(e) {
      if (e.touches.length < 2) {
        initialDistanceRef.current = null
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, onZoomChange])
}
