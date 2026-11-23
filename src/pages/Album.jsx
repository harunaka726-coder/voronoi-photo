import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addAlbumItem,
  appendAlbumItems,
  clearAlbum,
  deleteAlbumItem,
  exportAlbumJson,
  listAlbumItems,
  replaceAlbum,
} from '../albumStorage'
import { useEditorSession } from '../editorSession'
import { saveJsonObject, sharePngDataUrl } from '../fileActions'
import { useI18n } from '../i18n'

function normalizeImportList(data) {
  const list = Array.isArray(data) ? data : data.items
  if (!Array.isArray(list)) throw new Error('invalid')
  return list
    .filter((item) => item && typeof item.dataUrl === 'string')
    .map((item, i) => ({
      id: `imported-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name || `Item ${i + 1}`,
      kind: item.kind || 'photo',
      dataUrl: item.dataUrl,
      sources: Array.isArray(item.sources) ? item.sources : null,
      seedPoints: Array.isArray(item.seedPoints) ? item.seedPoints : null,
      frameShape: item.frameShape || 'square',
      createdAt: item.createdAt || Date.now() + i,
    }))
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 13l8 5M8 11l8-5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatCreatedAt(value, lang) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const locale =
    lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : 'en-US'
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Album() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { loadIntoEditor } = useEditorSession()
  const [items, setItems] = useState([])
  const [importModeOpen, setImportModeOpen] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const pendingFileRef = useRef(null)
  const importRef = useRef(null)

  const refresh = useCallback(async () => {
    setItems(await listAlbumItems())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onExport = async () => {
    const payload = await exportAlbumJson()
    await saveJsonObject(payload, `voronoi-album-${Date.now()}.json`)
  }

  const runImport = async (mode) => {
    const file = pendingFileRef.current
    if (!file) return

    if (mode === 'overwrite' && !window.confirm(t.overwriteConfirm)) {
      return
    }

    pendingFileRef.current = null
    setImportModeOpen(false)

    try {
      const text = await file.text()
      const cleaned = normalizeImportList(JSON.parse(text))
      setImportProgress({ done: 0, total: cleaned.length || 1 })
      const onProgress = (done, total) => setImportProgress({ done, total })
      if (mode === 'overwrite') {
        await replaceAlbum(cleaned, onProgress)
      } else {
        await appendAlbumItems(cleaned, onProgress)
      }
      await refresh()
    } catch {
      // silent
    } finally {
      setImportProgress(null)
    }
  }

  const onImportPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    pendingFileRef.current = file
    setImportModeOpen(true)
  }

  const onDeleteAll = async () => {
    if (!window.confirm(t.deleteConfirm)) return
    await clearAlbum()
    await refresh()
  }

  const onDuplicate = async (item, event) => {
    event.stopPropagation()
    await addAlbumItem({
      name: item.name,
      kind: item.kind || 'artwork',
      dataUrl: item.dataUrl,
      sources: item.sources || null,
      seedPoints: item.seedPoints || null,
      frameShape: item.frameShape || 'square',
      createdAt: Date.now(),
    })
    await refresh()
  }

  const onShare = async (item, event) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      await sharePngDataUrl(
        item.dataUrl,
        `${item.name || 'voronoi-photo-art'}.png`,
        item.name || 'Voronoi Photo Art',
      )
    } catch (error) {
      if (error?.name === 'AbortError') return
      window.alert(
        error?.message === 'share-needs-https' || !window.isSecureContext
          ? t.shareNeedsHttps
          : t.shareUnsupported,
      )
    }
  }

  const onDeleteOne = async (item, event) => {
    event.stopPropagation()
    if (!window.confirm(t.deleteOneConfirm)) return
    await deleteAlbumItem(item.id)
    await refresh()
  }

  const onOpen = (item) => {
    const sources = Array.isArray(item.sources)
      ? item.sources.filter((s) => s && typeof s.dataUrl === 'string')
      : []

    if (sources.length > 0) {
      loadIntoEditor(
        sources.map((source, i) => ({
          id: `src-${item.id}-${i}`,
          name: source.name || `Photo ${i + 1}`,
          src: source.dataUrl,
        })),
        item.seedPoints,
      )
    } else {
      loadIntoEditor([
        {
          id: item.id,
          name: item.name,
          src: item.dataUrl,
        },
      ])
    }
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="rounded-full border border-line bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-white"
        >
          {t.import}
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded-full border border-line bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-white"
        >
          {t.exportData}
        </button>
        <button
          type="button"
          onClick={onDeleteAll}
          className="rounded-full border border-line bg-white/70 px-4 py-2.5 text-sm font-medium text-[#8a3b2c] transition hover:bg-white"
        >
          {t.deleteData}
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportPick}
        />
      </div>

      {importProgress && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted">
            {t.importProgress(importProgress.done, importProgress.total)}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8e4dc]">
            <div
              className="h-full bg-ink transition-all"
              style={{
                width: `${Math.round(
                  (importProgress.done / Math.max(importProgress.total, 1)) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-12 text-sm text-muted">{t.albumEmpty}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-sm ring-1 ring-black/5"
            >
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="block w-full text-left"
              >
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="aspect-square w-full object-cover"
                />
                <p className="bg-white/80 px-2 py-1.5 text-[11px] leading-tight text-muted">
                  {formatCreatedAt(item.createdAt, lang)}
                </p>
              </button>
              <div className="flex items-center justify-around bg-white/70 px-1 py-1.5">
                <button
                  type="button"
                  onClick={(e) => onDuplicate(item, e)}
                  className="rounded-full p-2 text-ink hover:bg-[#efece4]"
                  aria-label={t.copy}
                  title={t.copy}
                >
                  <IconCopy />
                </button>
                <button
                  type="button"
                  onClick={(e) => onShare(item, e)}
                  className="rounded-full p-2 text-ink hover:bg-[#efece4]"
                  aria-label={t.share}
                  title={t.share}
                >
                  <IconShare />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeleteOne(item, e)}
                  className="rounded-full p-2 text-[#8a3b2c] hover:bg-[#efece4]"
                  aria-label={t.delete}
                  title={t.delete}
                >
                  <IconTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {importModeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2C2C]/45 px-4">
          <div className="w-full max-w-sm rounded-sm bg-[#FAF9F6] p-5 ring-1 ring-black/5">
            <p className="font-display text-lg font-medium">{t.importModeTitle}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => runImport('append')}
                className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-[#FAF9F6]"
              >
                {t.importAppend}
              </button>
              <button
                type="button"
                onClick={() => runImport('overwrite')}
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-medium"
              >
                {t.importOverwrite}
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full text-sm text-muted"
              onClick={() => {
                pendingFileRef.current = null
                setImportModeOpen(false)
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
