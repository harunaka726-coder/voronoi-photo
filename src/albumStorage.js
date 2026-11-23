const DB_NAME = 'voronoi-photo-album'
const DB_VERSION = 1
const STORE = 'items'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function listAlbumItems() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const items = (req.result || []).sort((a, b) => b.createdAt - a.createdAt)
      resolve(items)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function addAlbumItem(item) {
  const db = await openDb()
  const record = {
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: item.name || 'Untitled',
    kind: item.kind || 'photo',
    dataUrl: item.dataUrl,
    sources: item.sources || null,
    seedPoints: item.seedPoints || null,
    frameShape: item.frameShape || 'square',
    createdAt: item.createdAt || Date.now(),
  }
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(record)
  await txDone(tx)
  return record
}

export async function appendAlbumItems(items, onProgress) {
  const db = await openDb()
  const total = items.length
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    const record = {
      id: item.id || `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name || 'Untitled',
      kind: item.kind || 'photo',
      dataUrl: item.dataUrl,
      sources: item.sources || null,
      seedPoints: item.seedPoints || null,
      frameShape: item.frameShape || 'square',
      createdAt: item.createdAt || Date.now() + i,
    }
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    await txDone(tx)
    onProgress?.(i + 1, total)
  }
}

export async function deleteAlbumItem(id) {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).delete(id)
  await txDone(tx)
}

export async function clearAlbum() {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).clear()
  await txDone(tx)
}

export async function replaceAlbum(items, onProgress) {
  const db = await openDb()
  const clearTx = db.transaction(STORE, 'readwrite')
  clearTx.objectStore(STORE).clear()
  await txDone(clearTx)
  await appendAlbumItems(items, onProgress)
}

export async function exportAlbumJson() {
  const items = await listAlbumItems()
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function urlToDataUrl(url) {
  if (url.startsWith('data:')) return url
  const res = await fetch(url)
  const blob = await res.blob()
  return blobToDataUrl(blob)
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}
