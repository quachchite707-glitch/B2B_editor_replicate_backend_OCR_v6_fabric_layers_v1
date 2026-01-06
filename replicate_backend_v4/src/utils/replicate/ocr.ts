import type { OCRBox } from './imageParse'

/**
 * 前端 OCR（tesseract.js）。
 *
 * 注意：
 * - 中文识别依赖网络下载语言包（chi_sim）。
 * - 若语言包下载失败/过慢，请在 UI 里允许用户手动修改文本。
 */
export async function runOcrTesseract(args: {
  imageUrl: string
  lang?: 'chi_sim' | 'eng'
}): Promise<OCRBox[]> {
  const { imageUrl, lang = 'chi_sim' } = args

  // 注意：tesseract.js v5 在部分构建环境下，如果传入 logger/onProgress 这类函数，
  // 可能会触发 Worker.postMessage 的 DataCloneError（函数无法结构化克隆）。
  // MVP 先禁用进度回调，保证稳定跑通；需要进度可改为 UI 端分阶段提示。
  const { createWorker } = await import('tesseract.js')

  // 给 Worker / WASM / 语言包指定 CDN 路径，减少 “Failed to fetch” 几率。
  //（如果你的网络环境无法访问 CDN，可后续改为把资源放到 public/ 下。）
  let worker: any = null
  try {
    // ✅ tesseract.js v5：语言和 OEM 在 createWorker 里指定
    // v5 里 loadLanguage/initialize 已变为 no-op（可删除），否则容易在不同构建环境里踩坑。
    // 参考官方 v5 变更说明：createWorker("chi_sim", 1) 取代 loadLanguage/initialize。
    worker = await createWorker(lang, 1, {
      workerPath: 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js',
      // v5: corePath 建议指向包含 4 个 core 文件的目录；不建议直接指向单个 wasm.js 文件。
      corePath: 'https://unpkg.com/tesseract.js-core@5.1.0',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    })

    const result = await worker.recognize(imageUrl)

    // tesseract 的 bbox 是基于原图像素
    const words: any[] = result?.data?.words ?? []
    // 合并为“行级 box”：按 line/group 合并是更好，但 MVP 先按 word 合并到近似行
    const lines = mergeWordsToLines(words)
    return lines
      .map((l) => ({
        text: String(l.text ?? '').trim(),
        x: Math.round(l.bbox.x0),
        y: Math.round(l.bbox.y0),
        w: Math.round(l.bbox.x1 - l.bbox.x0),
        h: Math.round(l.bbox.y1 - l.bbox.y0),
      }))
      .filter((b) => b.text.length > 0 && b.w > 8 && b.h > 8)
  } catch (err) {
    // OCR 失败时返回空数组，让上层继续进入“校准”流程（手动改文字）。
    console.warn('[OCR] failed, fallback to empty OCR results:', err)
    return []
  } finally {
    try {
      await worker?.terminate?.()
    } catch {
      // ignore
    }
  }
}

function mergeWordsToLines(words: any[]): { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] {
  // words: { text, bbox: { x0,y0,x1,y1 }, confidence }
  const clean = words
    .filter((w) => w?.text && w?.bbox)
    .map((w) => ({
      text: String(w.text).trim(),
      bbox: w.bbox,
      cy: (w.bbox.y0 + w.bbox.y1) / 2,
      cx: (w.bbox.x0 + w.bbox.x1) / 2,
    }))
    .filter((w) => w.text.length > 0)

  clean.sort((a, b) => a.cy - b.cy || a.cx - b.cx)

  const lines: any[] = []
  const yTol = 18
  for (const w of clean) {
    let line = lines.find((l) => Math.abs(l.cy - w.cy) < yTol)
    if (!line) {
      line = {
        words: [],
        cy: w.cy,
        bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
      }
      lines.push(line)
    }
    line.words.push(w)
    line.cy = (line.cy + w.cy) / 2
    line.bbox.x0 = Math.min(line.bbox.x0, w.bbox.x0)
    line.bbox.y0 = Math.min(line.bbox.y0, w.bbox.y0)
    line.bbox.x1 = Math.max(line.bbox.x1, w.bbox.x1)
    line.bbox.y1 = Math.max(line.bbox.y1, w.bbox.y1)
  }

  return lines.map((l) => {
    l.words.sort((a: any, b: any) => a.bbox.x0 - b.bbox.x0)
    const text = l.words.map((x: any) => x.text).join(' ')
    return { text, bbox: l.bbox }
  })
}
