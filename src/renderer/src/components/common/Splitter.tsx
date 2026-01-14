import { useEffect, useRef } from 'react'

type SplitterProps = {
  onDrag: (deltaX: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export default function Splitter({
  onDrag,
  onDragStart,
  onDragEnd
}: SplitterProps): React.ReactElement {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let dragging = false

    const onMouseDown = (e: MouseEvent): void => {
      dragging = true
      onDragStart && onDragStart()
      e.preventDefault()
    }

    const onMouseMove = (e: MouseEvent): void => {
      if (!dragging) return
      onDrag(e.movementX)
    }

    const onMouseUp = (): void => {
      if (!dragging) return
      dragging = false
      onDragEnd && onDragEnd()
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onDrag, onDragStart, onDragEnd])

  return (
    <div
      ref={ref}
      style={{
        width: 8,
        cursor: 'col-resize',
        background: 'transparent',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        zIndex: 10,
        userSelect: 'none'
      }}
    >
      <div style={{ width: 2, background: 'rgba(0,0,0,0.12)', borderRadius: 1, height: '100%' }} />
    </div>
  )
}
