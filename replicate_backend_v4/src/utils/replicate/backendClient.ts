import type { OCRBox, DetectedBar } from './imageParse'

export type BackendParseResult = {
  width: number
  height: number
  texts: { text: string; bbox: [number, number, number, number]; score?: number }[]
  bars: { bbox: [number, number, number, number]; fill: string; score?: number }[]
}

const DEFAULT_BACKEND_URL = 'http://localhost:8001/parse'

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mimeMatch = meta.match(/data:(.*?);base64/)
  const mime = mimeMatch?.[1] ?? 'application/octet-stream'
  const binary = atob(b64)
  const len = binary.length
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

async function imageUrlToBlob(imageUrl: string): Promise<Blob> {
  if (imageUrl.startsWith('data:')) {
    return dataUrlToBlob(imageUrl)
  }
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return await res.blob()
}

export async function parsePosterByBackend(args: {
  imageUrl: string
  backendUrl?: string
  detectBars?: boolean
}): Promise<{ width: number; height: number; bars: DetectedBar[]; ocr: OCRBox[] }>
{
  const { imageUrl, backendUrl = DEFAULT_BACKEND_URL, detectBars = true } = args

  const blob = await imageUrlToBlob(imageUrl)
  const fd = new FormData()
  fd.append('file', blob, 'poster.png')
  fd.append('detect_bars', detectBars ? '1' : '0')

  const res = await fetch(backendUrl, {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend parse failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as BackendParseResult

  const bars: DetectedBar[] = (json.bars ?? []).map((b) => {
    const [x0, y0, x1, y1] = b.bbox
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), fill: b.fill }
  })

  const ocr: OCRBox[] = (json.texts ?? []).map((t) => {
    const [x0, y0, x1, y1] = t.bbox
    return { text: t.text, x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
  })

  return { width: json.width, height: json.height, bars, ocr }
}
