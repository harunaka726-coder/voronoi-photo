import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Delaunay } from 'd3-delaunay'
import { addAlbumItem, urlToDataUrl } from './albumStorage'
import { useEditorSession } from './editorSession'
import { savePngDataUrl, sharePngDataUrl } from './fileActions'
import { useI18n } from './i18n'

const CANVAS_SIZE = 640
const EXPORT_SIZE = 1080
const MARGIN = 24
const MAX_PHOTOS = 20

const DEMO_SAMPLES = [
  { name: 'Landscape', src: '/samples/01-landscape.jpg' },
  { name: 'Portrait', src: '/samples/02-portrait.jpg' },
  { name: 'Group', src: '/samples/03-group.jpg' },
  { name: 'Pet', src: '/samples/04-pet.jpg' },
  { name: 'Animal', src: '/samples/05-animal.jpg' },
  { name: 'Building', src: '/samples/06-building.jpg' },
  { name: 'Food', src: '/samples/07-food.jpg' },
  { name: 'Street', src: '/samples/08-street.jpg' },
]

const FRAME_SHAPES = [
  { id: 'square', sides: 4 },
  { id: 'circle', sides: 0 },
  { id: 'hexagon', sides: 6 },
  { id: 'octagon', sides: 8 },
]

function borderColorOptions(t) {
  return [
    { id: 'white', label: t.white, value: '#FFFFFF' },
    { id: 'charcoal', label: t.charcoal, value: '#2C2C2C' },
    { id: 'black', label: t.black, value: '#0A0A0A' },
    { id: 'gold', label: t.gold, value: '#C4A35A' },
  ]
}

function clampPoint(point, size, margin = MARGIN) {
  return [
    Math.min(size - margin, Math.max(margin, point[0])),
    Math.min(size - margin, Math.max(margin, point[1])),
  ]
}

function polygonCentroid(polygon) {
  if (!polygon || polygon.length < 3) return null
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const cross = xj * yi - xi * yj
    area += cross
    cx += (xi + xj) * cross
    cy += (yi + yj) * cross
  }
  area *= 0.5
  if (Math.abs(area) < 1e-6) {
    const avgX = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length
    const avgY = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length
    return [avgX, avgY]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

function cellBounds(polygon) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

function createPhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function regularPolygonPoints(sides, size, inset = 8) {
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - inset
  const start = sides % 2 === 0 ? Math.PI / sides : -Math.PI / 2
  return Array.from({ length: sides }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / sides
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
  })
}

function frameClipElement(shapeId, size) {
  if (shapeId === 'circle') {
    return <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} />
  }
  if (shapeId === 'square') {
    return <rect x={4} y={4} width={size - 8} height={size - 8} />
  }
  const sides = shapeId === 'hexagon' ? 6 : 8
  const pts = regularPolygonPoints(sides, size, 8)
    .map((p) => p.join(','))
    .join(' ')
  return <polygon points={pts} />
}

function frameBorderPath(shapeId, size) {
  if (shapeId === 'circle') {
    const r = size / 2 - 4
    return `M ${size / 2 + r},${size / 2} A ${r},${r} 0 1 1 ${size / 2 - r},${size / 2} A ${r},${r} 0 1 1 ${size / 2 + r},${size / 2}`
  }
  if (shapeId === 'square') {
    return `M 4,4 H ${size - 4} V ${size - 4} H 4 Z`
  }
  const sides = shapeId === 'hexagon' ? 6 : 8
  const pts = regularPolygonPoints(sides, size, 8)
  return `${pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ')} Z`
}

async function renderSvgToPngDataUrl(svg, size = EXPORT_SIZE) {
  const clone = svg.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', String(size))
  clone.setAttribute('height', String(size))
  clone.querySelectorAll('[data-export-hide="true"]').forEach((node) => node.remove())

  const images = Array.from(clone.querySelectorAll('image'))
  await Promise.all(
    images.map(async (imageEl) => {
      const href =
        imageEl.getAttribute('href') ||
        imageEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      if (!href || href.startsWith('data:')) return
      const dataUrl = await urlToDataUrl(href)
      imageEl.setAttribute('href', dataUrl)
      imageEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl)
    }),
  )

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clone)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FAF9F6'
    ctx.fillRect(0, 0, size, size)
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    ctx.drawImage(img, 0, 0, size, size)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V5M12 5l-4 4M12 5l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5h11l3 3v11H5V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 5v5h8V5M8 19v-6h8v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v11M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 13l8 5M8 11l8-5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconForward() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShapeIcon({ id, active, size = 18 }) {
  const stroke = active ? '#FAF9F6' : '#2C2C2C'
  if (id === 'circle') {
    return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke={stroke} strokeWidth="1.7" /></svg>
  }
  if (id === 'square') {
    return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.7" /></svg>
  }
  if (id === 'hexagon') {
    return <svg width={size} height={size} viewBox="0 0 24 24"><polygon points="12,4 19,8 19,16 12,20 5,16 5,8" fill="none" stroke={stroke} strokeWidth="1.7" /></svg>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24"><polygon points="8,4 16,4 20,8 20,16 16,20 8,20 4,16 4,8" fill="none" stroke={stroke} strokeWidth="1.7" /></svg>
}

function IconShuffle({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconAdjust({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h9M17 6h3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 12h3M11 12h9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 18h7M15 18h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="13.1" y="3.6" width="3.8" height="4.8" rx="1.9" fill="currentColor" />
      <rect x="7.1" y="9.6" width="3.8" height="4.8" rx="1.9" fill="currentColor" />
      <rect x="11.1" y="15.6" width="3.8" height="4.8" rx="1.9" fill="currentColor" />
    </svg>
  )
}

const iconBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/70 text-ink transition hover:bg-white disabled:opacity-40'

export default function VoronoiPhotoArt() {
  const { t } = useI18n()
  const {
    photos,
    setPhotos,
    points,
    setPoints,
    initializedRef,
    randomPoints: sessionRandomPoints,
  } = useEditorSession()
  const svgRef = useRef(null)
  const fileInputRef = useRef(null)
  const dragIndexRef = useRef(null)
  const pointsRef = useRef(points)
  const historyRef = useRef([])
  const histIndexRef = useRef(-1)
  const skipHistRef = useRef(false)

  const [showHandles, setShowHandles] = useState(true)
  const [borderWidth, setBorderWidth] = useState(3)
  const [borderColor, setBorderColor] = useState('#2C2C2C')
  const [frameShape, setFrameShape] = useState('square')
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [histIndex, setHistIndex] = useState(-1)
  const [showPhotoList, setShowPhotoList] = useState(false)

  pointsRef.current = points

  const pushPointsHistory = useCallback((nextPoints) => {
    if (skipHistRef.current) return
    const snap = nextPoints.map((p) => [p[0], p[1]])
    const base = historyRef.current.slice(0, histIndexRef.current + 1)
    base.push(snap)
    while (base.length > 40) base.shift()
    historyRef.current = base
    histIndexRef.current = base.length - 1
    setHistIndex(histIndexRef.current)
  }, [])

  const resetPointsHistory = useCallback((nextPoints) => {
    const snap = nextPoints.map((p) => [p[0], p[1]])
    historyRef.current = [snap]
    histIndexRef.current = 0
    setHistIndex(0)
  }, [])

  const undo = () => {
    if (histIndexRef.current <= 0) return
    const i = histIndexRef.current - 1
    skipHistRef.current = true
    setPoints(historyRef.current[i].map((p) => [p[0], p[1]]))
    histIndexRef.current = i
    setHistIndex(i)
    skipHistRef.current = false
  }

  const redo = () => {
    if (histIndexRef.current >= historyRef.current.length - 1) return
    const i = histIndexRef.current + 1
    skipHistRef.current = true
    setPoints(historyRef.current[i].map((p) => [p[0], p[1]]))
    histIndexRef.current = i
    setHistIndex(i)
    skipHistRef.current = false
  }

  const cells = useMemo(() => {
    if (points.length < 1) return []
    const delaunay = Delaunay.from(points)
    const voronoi = delaunay.voronoi([0, 0, CANVAS_SIZE, CANVAS_SIZE])
    return points.map((point, index) => {
      const path = voronoi.renderCell(index)
      const polygon = voronoi.cellPolygon(index)
      const bounds = polygon ? cellBounds(polygon) : null
      return { index, point, path, polygon, bounds }
    })
  }, [points])

  const revokeOne = useCallback((photo) => {
    if (photo?.revokeOnCleanup && photo.src?.startsWith('blob:')) {
      URL.revokeObjectURL(photo.src)
    }
  }, [])

  const revokePhotos = useCallback(
    (list) => list.forEach(revokeOne),
    [revokeOne],
  )

  const replacePhotos = useCallback(
    (nextPhotos) => {
      const nextPoints = sessionRandomPoints(nextPhotos.length)
      setPhotos((prev) => {
        revokePhotos(prev)
        return nextPhotos
      })
      setPoints(nextPoints)
      resetPointsHistory(nextPoints)
    },
    [revokePhotos, setPhotos, setPoints, sessionRandomPoints, resetPointsHistory],
  )

  const appendPhotos = useCallback(
    (incoming) => {
      setPhotos((prev) => {
        const room = MAX_PHOTOS - prev.length
        const added = incoming.slice(0, Math.max(0, room))
        if (added.length === 0) return prev
        const extra = sessionRandomPoints(added.length)
        setPoints((prevPoints) => {
          const nextPoints = [...prevPoints, ...extra]
          resetPointsHistory(nextPoints)
          return nextPoints
        })
        return [...prev, ...added]
      })
    },
    [setPhotos, setPoints, sessionRandomPoints, resetPointsHistory],
  )

  const removePhotoAt = useCallback(
    (index) => {
      setPhotos((prev) => {
        revokeOne(prev[index])
        setPoints((pts) => {
          const nextPoints = pts.filter((_, i) => i !== index)
          resetPointsHistory(nextPoints)
          return nextPoints
        })
        return prev.filter((_, i) => i !== index)
      })
    },
    [revokeOne, setPhotos, setPoints, resetPointsHistory],
  )

  const loadDemoPhotos = useCallback(() => {
    replacePhotos(
      DEMO_SAMPLES.map((sample) => ({
        id: createPhotoId(),
        name: sample.name,
        src: sample.src,
        revokeOnCleanup: false,
      })),
    )
  }, [replacePhotos])

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (files.length === 0) return
      appendPhotos(
        files.map((file) => ({
          id: createPhotoId(),
          name: file.name,
          src: URL.createObjectURL(file),
          file,
          revokeOnCleanup: true,
        })),
      )
    },
    [appendPhotos],
  )

  const onFileChange = (event) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDropActive(false)
    handleFiles(event.dataTransfer.files)
  }

  const shufflePoints = () => {
    if (photos.length === 0) return
    const next = sessionRandomPoints(photos.length)
    setPoints(next)
    pushPointsHistory(next)
  }

  const relaxOnce = () => {
    if (points.length < 2) return
    const delaunay = Delaunay.from(points)
    const voronoi = delaunay.voronoi([0, 0, CANVAS_SIZE, CANVAS_SIZE])
    const next = points.map((point, index) => {
      const centroid = polygonCentroid(voronoi.cellPolygon(index))
      if (!centroid) return point
      return clampPoint(
        [
          point[0] + (centroid[0] - point[0]) * 0.85,
          point[1] + (centroid[1] - point[1]) * 0.85,
        ],
        CANVAS_SIZE,
      )
    })
    setPoints(next)
    pushPointsHistory(next)
  }

  const clientToSvgPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return clampPoint(
      [
        ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
        ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
      ],
      CANVAS_SIZE,
    )
  }, [])

  const onPointerDownHandle = (event, index) => {
    event.preventDefault()
    event.stopPropagation()
    dragIndexRef.current = index
    setIsDragging(true)
    document.body.classList.add('dragging')
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // some mobile browsers reject capture on SVG; window listeners still handle drag
    }
  }

  useEffect(() => {
    if (!isDragging) return undefined

    const onMove = (event) => {
      if (dragIndexRef.current === null) return
      event.preventDefault()
      const nextPoint = clientToSvgPoint(event.clientX, event.clientY)
      if (!nextPoint) return
      const index = dragIndexRef.current
      setPoints((prev) => {
        const next = prev.slice()
        next[index] = nextPoint
        return next
      })
    }

    const onUp = () => {
      if (dragIndexRef.current === null) return
      dragIndexRef.current = null
      setIsDragging(false)
      document.body.classList.remove('dragging')
      pushPointsHistory(pointsRef.current)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isDragging, clientToSvgPoint, pushPointsHistory, setPoints])

  const buildArtworkPayload = async () => {
    const svg = svgRef.current
    if (!svg || photos.length === 0) return null
    const dataUrl = await renderSvgToPngDataUrl(svg, EXPORT_SIZE)
    const sources = await Promise.all(
      photos.map(async (photo) => ({
        name: photo.name,
        dataUrl: await urlToDataUrl(photo.src),
      })),
    )
    return {
      dataUrl,
      sources,
      seedPoints: points.map((p) => [p[0], p[1]]),
      frameShape,
    }
  }

  const saveToAlbum = async () => {
    if (busy || photos.length === 0) return
    setBusy(true)
    try {
      const payload = await buildArtworkPayload()
      if (!payload) return
      await addAlbumItem({
        name: `Voronoi ${new Date().toLocaleString()}`,
        kind: 'artwork',
        ...payload,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(false)
    }
  }

  const exportPng = async () => {
    if (busy || photos.length === 0) return
    setBusy(true)
    try {
      const payload = await buildArtworkPayload()
      if (!payload) return
      await savePngDataUrl(payload.dataUrl, `voronoi-photo-art-${Date.now()}.png`)
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(false)
    }
  }

  const shareArt = async () => {
    if (busy || photos.length === 0) return
    setBusy(true)
    try {
      const payload = await buildArtworkPayload()
      if (!payload) return
      await sharePngDataUrl(
        payload.dataUrl,
        `voronoi-photo-art-${Date.now()}.png`,
        'Voronoi Photo Art',
      )
    } catch (error) {
      if (error?.name === 'AbortError') return
      if (error?.message === 'share-needs-https') {
        window.alert(t.shareNeedsHttps)
        return
      }
      if (error?.message === 'share-unsupported') {
        window.alert(t.shareUnsupported)
        return
      }
      console.error(error)
      window.alert(
        window.isSecureContext ? t.shareUnsupported : t.shareNeedsHttps,
      )
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      loadDemoPhotos()
    }
  }, [initializedRef, loadDemoPhotos])

  const colors = borderColorOptions(t)
  const outerBorder = frameBorderPath(frameShape, CANVAS_SIZE)

  const actionToolbar = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={undo}
          disabled={histIndex <= 0}
          className={iconBtn}
          aria-label={t.undo}
          title={t.undo}
        >
          <IconBack />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={histIndex < 0 || histIndex >= historyRef.current.length - 1}
          className={iconBtn}
          aria-label={t.redo}
          title={t.redo}
        >
          <IconForward />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={saveToAlbum}
          disabled={photos.length === 0 || busy}
          className={iconBtn}
          aria-label={t.saveAlbum}
          title={t.saveAlbum}
        >
          <IconSave />
        </button>
        <button
          type="button"
          onClick={exportPng}
          disabled={photos.length === 0 || busy}
          className={iconBtn}
          aria-label={t.download}
          title={t.download}
        >
          <IconDownload />
        </button>
        <button
          type="button"
          onClick={shareArt}
          disabled={photos.length === 0 || busy}
          className={iconBtn}
          aria-label={t.share}
          title={t.share}
        >
          <IconShare />
        </button>
      </div>
    </div>
  )

  const photoGrid =
    photos.length > 0 ? (
      <ul className="grid grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-sm ring-1 ring-black/5"
          >
            <img src={photo.src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhotoAt(index)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2C2C2C]/75 text-[11px] text-white"
              aria-label={t.delete}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-stretch gap-3 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
      <div className="w-full shrink-0 lg:hidden">{actionToolbar}</div>

      <div
        className={`relative mx-auto aspect-square w-[min(100%,calc(100dvh-8.75rem))] max-w-full overflow-hidden lg:mx-0 lg:h-[min(640px,calc(100dvh-13.5rem))] lg:w-[min(640px,calc(100dvh-13.5rem),100%)] ${
          isDragging ? 'select-none' : ''
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          width="100%"
          height="100%"
          className="block h-full w-full touch-none"
          style={{ touchAction: 'none' }}
          role="img"
          aria-label="Voronoi Photo Art"
        >
          <defs>
            <clipPath id="frame-clip">{frameClipElement(frameShape, CANVAS_SIZE)}</clipPath>
            {cells.map((cell) =>
              cell.path ? (
                <clipPath key={`clip-${cell.index}`} id={`voronoi-clip-${cell.index}`}>
                  <path d={cell.path} />
                </clipPath>
              ) : null,
            )}
          </defs>

          <rect width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#FAF9F6" />

          <g clipPath="url(#frame-clip)">
            {cells.map((cell) => {
              const photo = photos[cell.index]
              if (!photo || !cell.path || !cell.bounds) return null
              const pad = Math.max(cell.bounds.width, cell.bounds.height) * 0.35
              const imgW = cell.bounds.width + pad * 2
              const imgH = cell.bounds.height + pad * 2
              return (
                <g key={`cell-${cell.index}`} clipPath={`url(#voronoi-clip-${cell.index})`}>
                  <image
                    href={photo.src}
                    x={cell.point[0] - imgW / 2}
                    y={cell.point[1] - imgH / 2}
                    width={imgW}
                    height={imgH}
                    preserveAspectRatio="xMidYMid slice"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              )
            })}

            {cells.map((cell) =>
              cell.path ? (
                <path
                  key={`border-${cell.index}`}
                  d={cell.path}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'none' }}
                />
              ) : null,
            )}
          </g>

          <path
            d={outerBorder}
            fill="none"
            stroke={borderColor}
            strokeWidth={Math.max(borderWidth, 2)}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />

          {showHandles &&
            points.map((point, index) => (
              <g key={`handle-${index}`} data-export-hide="true">
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r={36}
                  fill="transparent"
                  style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                  onPointerDown={(e) => onPointerDownHandle(e, index)}
                />
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r={7}
                  fill="#FAF9F6"
                  stroke={borderColor === '#FFFFFF' ? '#2C2C2C' : borderColor}
                  strokeWidth={1.5}
                  style={{ pointerEvents: 'none' }}
                />
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r={2.5}
                  fill={borderColor === '#FFFFFF' ? '#2C2C2C' : borderColor}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}
        </svg>
      </div>

      <aside className="mx-auto w-full max-w-sm shrink-0 space-y-3 overflow-y-auto lg:mx-0 lg:max-h-[calc(100dvh-13.5rem)]">
        <div className="hidden lg:block">{actionToolbar}</div>

        {/* Mobile: ①②③ = same content width stack; shapes/colors are a separate right column */}
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex w-full items-start gap-2">
            <div className="inline-block min-w-0 max-w-[calc(100%-10.75rem)]">
              <div className="flex flex-col gap-2">
                <div className="flex w-full items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={iconBtn}
                    aria-label={t.uploadPhotos}
                    title={t.uploadPhotos}
                  >
                    <IconUpload />
                  </button>
                  {photos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPhotoList((v) => !v)}
                      className="whitespace-nowrap rounded-full border border-line bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white"
                    >
                      {t.photoList}
                      {showPhotoList ? ' ▴' : ' ▾'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={loadDemoPhotos}
                    className="ml-auto whitespace-nowrap rounded-full border border-line bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white"
                  >
                    {t.loadDemo}
                  </button>
                </div>

                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="7.5" fill="#FAF9F6" stroke="#2C2C2C" strokeWidth="1.6" />
                        <circle cx="12" cy="12" r="3" fill="#2C2C2C" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHandles((v) => !v)}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                        showHandles ? 'bg-ink' : 'bg-[#d9d4cb]'
                      }`}
                      aria-label={t.showHandles}
                      aria-pressed={showHandles}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                          showHandles ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={shufflePoints}
                      disabled={photos.length === 0}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/70 text-ink transition hover:bg-white disabled:opacity-40"
                      aria-label={t.shuffle}
                      title={t.shuffle}
                    >
                      <IconShuffle size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={relaxOnce}
                      disabled={photos.length < 2}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/70 text-ink transition hover:bg-white disabled:opacity-40"
                      aria-label={t.relax}
                      title={t.relax}
                    >
                      <IconAdjust size={20} />
                    </button>
                  </div>
                </div>

                <label className="flex h-9 w-full min-w-0 items-center gap-2 text-sm">
                  <span className="shrink-0 leading-none text-muted">{t.width}</span>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    className="line-range h-9 min-w-0 flex-1 accent-[#2C2C2C]"
                  />
                  <span className="w-6 shrink-0 text-center text-xs leading-none tabular-nums">
                    {borderWidth}
                  </span>
                </label>
              </div>
            </div>

            <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
              <div className="h-10" aria-hidden="true" />
              <div className="flex h-9 items-center gap-1.5">
                {FRAME_SHAPES.map((shape) => {
                  const active = frameShape === shape.id
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setFrameShape(shape.id)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/70 text-ink transition hover:bg-white ${
                        active ? 'outline outline-2 outline-offset-2 outline-ink' : ''
                      }`}
                      aria-label={t[`frame_${shape.id}`]}
                      title={t[`frame_${shape.id}`]}
                    >
                      <ShapeIcon id={shape.id} active={false} size={16} />
                    </button>
                  )
                })}
              </div>
              <div className="flex h-9 items-center gap-1.5">
                {colors.map((option) => {
                  const selected = borderColor === option.value
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBorderColor(option.value)}
                      title={option.label}
                      className={`h-9 w-9 rounded-full ring-1 ring-black/15 ${
                        selected ? 'outline outline-2 outline-offset-2 outline-ink' : ''
                      }`}
                      style={{ background: option.value }}
                      aria-label={option.label}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {photos.length > 0 && showPhotoList && <div>{photoGrid}</div>}
        </div>

        {/* Desktop: drop zone */}
        <div className="hidden items-stretch gap-2 lg:flex">
          <div
            onDragEnter={(e) => {
              e.preventDefault()
              setDropActive(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDropActive(true)
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-3 py-3 text-sm transition ${
              dropActive
                ? 'border-ink bg-[#efece4]'
                : 'border-line bg-white/50 hover:bg-white'
            }`}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[#FAF9F6]">
              <IconUpload />
            </span>
            <span className="min-w-0 text-xs leading-snug text-muted">{t.dropHint}</span>
          </div>
          <button
            type="button"
            onClick={loadDemoPhotos}
            className="shrink-0 rounded-full border border-line bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white"
          >
            {t.loadDemo}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileChange}
        />

        {photos.length > 0 && <div className="hidden lg:block">{photoGrid}</div>}

        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <span>{t.showHandles}</span>
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                showHandles ? 'bg-ink' : 'bg-[#d9d4cb]'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={showHandles}
                onChange={(e) => setShowHandles(e.target.checked)}
              />
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                  showHandles ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </span>
          </label>
          <button
            type="button"
            onClick={shufflePoints}
            disabled={photos.length === 0}
            className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white disabled:opacity-40"
          >
            {t.shuffle}
          </button>
          <button
            type="button"
            onClick={relaxOnce}
            disabled={photos.length < 2}
            className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white disabled:opacity-40"
          >
            {t.relax}
          </button>
        </div>

        <div className="hidden h-7 items-center gap-3 lg:flex">
          <label className="flex h-7 min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="shrink-0 leading-none text-muted">{t.width}</span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
              className="line-range h-7 min-w-0 flex-1 accent-[#2C2C2C]"
            />
            <span className="w-6 shrink-0 text-center text-xs leading-none tabular-nums">
              {borderWidth}
            </span>
          </label>
          <div className="flex h-7 shrink-0 items-center gap-1.5">
            {colors.map((option) => {
              const selected = borderColor === option.value
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBorderColor(option.value)}
                  title={option.label}
                  className={`h-7 w-7 rounded-full ring-1 ring-black/15 ${
                    selected ? 'outline outline-2 outline-offset-2 outline-ink' : ''
                  }`}
                  style={{ background: option.value }}
                  aria-label={option.label}
                />
              )
            })}
          </div>
        </div>

        {/* Desktop frame shapes */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {FRAME_SHAPES.map((shape) => {
            const active = frameShape === shape.id
            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => setFrameShape(shape.id)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  active
                    ? 'border-ink bg-ink text-[#FAF9F6]'
                    : 'border-line bg-white/70 text-ink hover:bg-white'
                }`}
                aria-label={t[`frame_${shape.id}`]}
                title={t[`frame_${shape.id}`]}
              >
                <ShapeIcon id={shape.id} active={active} />
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
