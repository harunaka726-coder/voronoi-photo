import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const EditorSessionContext = createContext(null)
const MARGIN = 24
const CANVAS_SIZE = 640

function randomPoints(count) {
  return Array.from({ length: count }, () => [
    MARGIN + Math.random() * (CANVAS_SIZE - MARGIN * 2),
    MARGIN + Math.random() * (CANVAS_SIZE - MARGIN * 2),
  ])
}

function normalizePhotos(nextPhotos) {
  return nextPhotos.map((photo, i) => ({
    id: photo.id || `edit-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    name: photo.name || `Photo ${i + 1}`,
    src: photo.src || photo.dataUrl,
    revokeOnCleanup: Boolean(photo.revokeOnCleanup),
  }))
}

export function EditorSessionProvider({ children }) {
  const [photos, setPhotos] = useState([])
  const [points, setPoints] = useState([])
  const initializedRef = useRef(false)

  const loadIntoEditor = useCallback((nextPhotos, nextPoints) => {
    const normalized = normalizePhotos(nextPhotos)
    setPhotos(normalized)
    if (Array.isArray(nextPoints) && nextPoints.length === normalized.length) {
      setPoints(nextPoints.map((p) => [Number(p[0]), Number(p[1])]))
    } else {
      setPoints(randomPoints(normalized.length))
    }
    initializedRef.current = true
  }, [])

  const value = useMemo(
    () => ({
      photos,
      setPhotos,
      points,
      setPoints,
      loadIntoEditor,
      initializedRef,
      randomPoints,
      canvasSize: CANVAS_SIZE,
    }),
    [photos, points, loadIntoEditor],
  )

  return (
    <EditorSessionContext.Provider value={value}>
      {children}
    </EditorSessionContext.Provider>
  )
}

export function useEditorSession() {
  const ctx = useContext(EditorSessionContext)
  if (!ctx) throw new Error('useEditorSession must be used within EditorSessionProvider')
  return ctx
}
