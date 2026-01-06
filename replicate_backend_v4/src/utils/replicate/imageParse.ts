import type { TemplateJSON, TemplateLayer, TemplateRectLayer, TemplateTextLayer } from '@/types/template'

export type DetectedBar = {
  x: number
  y: number
  w: number
  h: number
  fill: string
}

export type OCRBox = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * MVP 解析：针对“照片背景 + 纯色横条 + 文字”的海报。
 * - 仅识别横向近似纯色矩形条（bar）
 * - OCR 由外部传入（可用 tesseract.js / 服务端 OCR）
 *
 * 注意：这是启发式算法，目标是 80~95% 自动化 + 人工校准兜底。
 */
export async function parseBarsFromImage(
  img: HTMLImageElement,
  opts?: {
    downscaleMaxW?: number
    sampleStep?: number
    rowVarianceThreshold?: number
    minBandHeight?: number
    maxBandHeight?: number
    minBandWidthRatio?: number
  }
): Promise<DetectedBar[]> {
  const downscaleMaxW = opts?.downscaleMaxW ?? 540
  const sampleStep = opts?.sampleStep ?? 6
  const rowVarianceThreshold = opts?.rowVarianceThreshold ?? 350 // 越小越严格
  const minBandHeight = opts?.minBandHeight ?? 18
  const maxBandHeight = opts?.maxBandHeight ?? 220
  const minBandWidthRatio = opts?.minBandWidthRatio ?? 0.45

  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const scale = srcW > downscaleMaxW ? downscaleMaxW / srcW : 1
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, w, h)
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  function getRGB(ix: number, iy: number) {
    const i = (iy * w + ix) * 4
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] }
  }

  // 1) 找“平坦行”：横向颜色方差很低
  const flatRow = new Array<boolean>(h).fill(false)
  const rowColor = new Array<{ r: number; g: number; b: number }>(h)
  for (let y = 0; y < h; y++) {
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      count = 0
    const samples: { r: number; g: number; b: number }[] = []
    for (let x = 0; x < w; x += sampleStep) {
      const { r, g, b, a } = getRGB(x, y)
      if (a < 10) continue
      samples.push({ r, g, b })
      sumR += r
      sumG += g
      sumB += b
      count++
    }
    if (count < 8) continue
    const meanR = sumR / count
    const meanG = sumG / count
    const meanB = sumB / count
    let varSum = 0
    for (const s of samples) {
      const dr = s.r - meanR
      const dg = s.g - meanG
      const db = s.b - meanB
      varSum += dr * dr + dg * dg + db * db
    }
    const variance = varSum / count
    // 行本身“太像照片”（方差大）就跳过
    if (variance < rowVarianceThreshold) {
      flatRow[y] = true
      rowColor[y] = { r: meanR, g: meanG, b: meanB }
    }
  }

  // 2) 合并连续平坦行 -> band
  const bands: { y0: number; y1: number }[] = []
  let y = 0
  while (y < h) {
    if (!flatRow[y]) {
      y++
      continue
    }
    let y0 = y
    while (y < h && flatRow[y]) y++
    let y1 = y - 1
    const bandH = y1 - y0 + 1
    if (bandH >= minBandHeight && bandH <= maxBandHeight) {
      bands.push({ y0, y1 })
    }
  }

  // 3) 对每个 band，找中线上的“主色区域”左右边界（忽略两侧背景）
  const bars: DetectedBar[] = []
  for (const b of bands) {
    const midY = Math.floor((b.y0 + b.y1) / 2)
    const c = rowColor[midY]
    if (!c) continue

    // 用中线扫描左右边界：找到最长的“接近该行均值颜色”的连续段
    const tol = 28 // 容差
    const isSimilar = (px: { r: number; g: number; b: number; a: number }) => {
      if (px.a < 30) return false
      return (
        Math.abs(px.r - c.r) < tol &&
        Math.abs(px.g - c.g) < tol &&
        Math.abs(px.b - c.b) < tol
      )
    }

    let bestLen = 0
    let bestX0 = 0
    let bestX1 = 0

    let x = 0
    while (x < w) {
      const px = getRGB(x, midY)
      if (!isSimilar(px)) {
        x++
        continue
      }
      const x0 = x
      while (x < w && isSimilar(getRGB(x, midY))) x++
      const x1 = x - 1
      const len = x1 - x0 + 1
      if (len > bestLen) {
        bestLen = len
        bestX0 = x0
        bestX1 = x1
      }
    }

    if (bestLen < w * minBandWidthRatio) continue

    const fill = rgbToHex(Math.round(c.r), Math.round(c.g), Math.round(c.b))
    const x0 = bestX0
    const x1 = bestX1

    // 还原到原图坐标
    const inv = 1 / scale
    bars.push({
      x: Math.round(x0 * inv),
      y: Math.round(b.y0 * inv),
      w: Math.round((x1 - x0 + 1) * inv),
      h: Math.round((b.y1 - b.y0 + 1) * inv),
      fill,
    })
  }

  // 4) 过滤重叠/重复（简单 NMS）
  const sorted = bars.sort((a, b) => a.y - b.y)
  const dedup: DetectedBar[] = []
  for (const bar of sorted) {
    const overlap = dedup.some((d) => iou(bar, d) > 0.55)
    if (!overlap) dedup.push(bar)
  }
  return dedup
}

export function buildTemplateFromDetections(args: {
  canvasW: number
  canvasH: number
  backgroundSrc: string
  bars: DetectedBar[]
  ocr: OCRBox[]
}): TemplateJSON {
  const { canvasW, canvasH, backgroundSrc, bars, ocr } = args

  const layers: TemplateLayer[] = []
  const slots: TemplateJSON['slots'] = []
  const pools: TemplateJSON['pools'] = {}

  layers.push({
    id: 'layer_bg',
    type: 'image',
    slotId: null,
    x: 0,
    y: 0,
    w: canvasW,
    h: canvasH,
    z: 0,
    src: backgroundSrc,
  })

  // bars -> rect layers
  bars.forEach((b, idx) => {
    const slotId = `slot_block_${idx + 1}`
    const poolId = `pool_block_${idx + 1}`
    const layerId = `layer_block_${idx + 1}`

    const rect: TemplateRectLayer = {
      id: layerId,
      type: 'rect',
      slotId,
      x: clamp(b.x, 0, canvasW - 1),
      y: clamp(b.y, 0, canvasH - 1),
      w: clamp(b.w, 1, canvasW),
      h: clamp(b.h, 1, canvasH),
      fill: b.fill,
      z: 10 + idx * 10,
    }
    layers.push(rect)
    slots.push({ slotId, slotType: 'block', poolId })
    pools[poolId] = [b.fill]
  })

  // OCR -> text layers
  const textBoxes = ocr
    .filter((t) => t.text.trim().length > 0)
    .map((t) => ({
      ...t,
      // 规范化：防止超出画布
      x: clamp(t.x, 0, canvasW - 1),
      y: clamp(t.y, 0, canvasH - 1),
      w: clamp(t.w, 1, canvasW),
      h: clamp(t.h, 1, canvasH),
    }))

  textBoxes.forEach((t, idx) => {
    const slotId = `slot_text_${idx + 1}`
    const poolId = `pool_text_${idx + 1}`
    const layerId = `layer_text_${idx + 1}`

    // 简单估计 fontSize：bbox 高度的 0.8
    const fontSize = Math.max(14, Math.min(120, Math.round(t.h * 0.8)))

    const textLayer: TemplateTextLayer = {
      id: layerId,
      type: 'text',
      slotId,
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
      z: 15 + idx * 10,
      text: t.text,
      style: {
        fontSize,
        fontWeight: 700,
        fill: '#000000',
        align: 'left',
      },
    }
    layers.push(textLayer)
    slots.push({ slotId, slotType: 'text', poolId })
    pools[poolId] = [t.text]
  })

  // 按 z 排序
  layers.sort((a, b) => a.z - b.z)

  return {
    version: 'mvp-1',
    canvas: { w: canvasW, h: canvasH },
    layers,
    slots,
    pools,
  }
}

export function matchTextsToBars(texts: OCRBox[], bars: DetectedBar[]): { attached: OCRBox[]; detached: OCRBox[] } {
  const attached: OCRBox[] = []
  const detached: OCRBox[] = []
  for (const t of texts) {
    const r = { x: t.x, y: t.y, w: t.w, h: t.h }
    const isOnBar = bars.some((b) => rectIntersectArea(r, b) / (r.w * r.h) > 0.15)
    if (isOnBar) attached.push(t)
    else detached.push(t)
  }
  return { attached, detached }
}

function rectIntersectArea(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const x0 = Math.max(a.x, b.x)
  const y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  const iw = Math.max(0, x1 - x0)
  const ih = Math.max(0, y1 - y0)
  return iw * ih
}

function iou(a: DetectedBar, b: DetectedBar) {
  const inter = rectIntersectArea(a, b)
  const union = a.w * a.h + b.w * b.h - inter
  return union <= 0 ? 0 : inter / union
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const h = x.toString(16)
        return h.length === 1 ? '0' + h : h
      })
      .join('')
  )
}
