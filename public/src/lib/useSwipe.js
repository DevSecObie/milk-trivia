import { useRef, useEffect } from 'react'

export function useSwipe(onSwipeLeft, onSwipeRight) {
  const touchStart = useRef(null)
  const touchEnd = useRef(null)
  const minSwipe = 60

  useEffect(() => {
    const onTouchStart = (e) => {
      touchEnd.current = null
      touchStart.current = e.targetTouches[0].clientX
    }
    const onTouchMove = (e) => {
      touchEnd.current = e.targetTouches[0].clientX
    }
    const onTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return
      const dist = touchStart.current - touchEnd.current
      if (Math.abs(dist) > minSwipe) {
        if (dist > 0 && onSwipeLeft) onSwipeLeft()
        if (dist < 0 && onSwipeRight) onSwipeRight()
      }
    }

    document.addEventListener('touchstart', onTouchStart)
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight])
}
