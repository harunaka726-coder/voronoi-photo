import { dataUrlToBlob } from './albumStorage'

export async function dataUrlToPngFile(dataUrl, filename) {
  const blob = await dataUrlToBlob(dataUrl)
  const pngBlob =
    blob.type === 'image/png' ? blob : new Blob([await blob.arrayBuffer()], { type: 'image/png' })
  return new File([pngBlob], filename, { type: 'image/png' })
}

async function saveBlobWithPicker(blob, filename, accept) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: filename.split('.').pop()?.toUpperCase() || 'File',
            accept,
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'saved'
    } catch (error) {
      if (error?.name === 'AbortError') return 'aborted'
      // fall through
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

export async function savePngDataUrl(dataUrl, filename) {
  const file = await dataUrlToPngFile(dataUrl, filename)
  return saveBlobWithPicker(file, filename, { 'image/png': ['.png'] })
}

export async function saveJsonObject(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  return saveBlobWithPicker(blob, filename, { 'application/json': ['.json'] })
}

export async function sharePngDataUrl(dataUrl, filename, title = 'Voronoi Photo Art') {
  if (!window.isSecureContext) {
    throw new Error('share-needs-https')
  }
  if (typeof navigator.share !== 'function') {
    throw new Error('share-unsupported')
  }

  const file = await dataUrlToPngFile(dataUrl, filename)

  // Prefer file share for LINE / X image sharing
  try {
    await navigator.share({ files: [file], title, text: title })
    return
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    // Some browsers reject files; try again only if canShare says no files
  }

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title, text: title })
    return
  }

  throw new Error('share-unsupported')
}
