import { fabric } from 'fabric'
import type { TemplateJSON, TemplateLayer, TemplateTextLayer, TemplateRectLayer, TemplateImageLayer } from '@/types/template'

/**
 * 将 TemplateJSON 渲染到 Fabric Canvas（可交互）。
 * - 为每个对象写入 obj.data = { layerId, slotId, type }
 */
export async function renderTemplateToFabricCanvas(
  canvas: fabric.Canvas,
  tpl: TemplateJSON,
  opts?: { signal?: AbortSignal }
) {
  // 防止 Fast Refresh / 页面切换时 canvas 已 dispose 还在异步 setBackgroundImage
  // 调用方可传入 AbortSignal，在卸载时中止。
  //（fabric 的 fromURL 是 callback 异步，最容易“回调晚到”导致 null/save 报错）
  const signal = opts?.signal

  const safeRender = () => {
    // fabric dispose 后 contextContainer 会变为 null
    if ((canvas as any).contextContainer) {
      canvas.requestRenderAll()
    }
  }

  canvas.clear()
  canvas.setWidth(tpl.canvas.w)
  canvas.setHeight(tpl.canvas.h)

  // 背景：用 backgroundImage，避免进入对象列表（便于校准）
  const bg = tpl.layers.find((l) => l.type === 'image') as TemplateImageLayer | undefined
  if (bg?.src) {
    // Fabric v5 的 Image.fromURL 是 callback 形式（v6 才支持 Promise）。
    // 如果把 options 当成第二个参数，会报错：TypeError: callback is not a function
    const img = await new Promise<fabric.Image>((resolve, reject) => {
      fabric.Image.fromURL(
        bg.src,
        (image) => {
          if (image) resolve(image)
          else reject(new Error('Failed to load background image'))
        },
        { crossOrigin: 'anonymous' }
      )
    })

    if (signal?.aborted) return

    img.set({ left: 0, top: 0, selectable: false, evented: false })
    img.scaleToWidth(tpl.canvas.w)
    img.scaleToHeight(tpl.canvas.h)
    canvas.setBackgroundImage(img, safeRender)
  } else {
    canvas.setBackgroundColor('#ffffff', safeRender)
  }

  // 其它层按 z 画
  const layers = tpl.layers.filter((l) => l.type !== 'image').sort((a, b) => a.z - b.z)
  for (const layer of layers) {
    const obj = createFabricObjectFromLayer(layer)
    if (!obj) continue
    canvas.add(obj)
  }
  safeRender()
}

export function createFabricObjectFromLayer(layer: TemplateLayer): fabric.Object | null {
  if (layer.type === 'rect') {
    const l = layer as TemplateRectLayer
    const rect = new fabric.Rect({
      left: l.x,
      top: l.y,
      width: l.w,
      height: l.h,
      fill: l.fill,
      rx: l.rx ?? 0,
      ry: l.ry ?? 0,
      strokeWidth: 0,
      selectable: true,
    })
    ;(rect as any).data = { layerId: l.id, slotId: l.slotId, type: 'rect' }
    return rect
  }
  if (layer.type === 'text') {
    const l = layer as TemplateTextLayer
    const tb = new fabric.Textbox(l.text, {
      left: l.x,
      top: l.y,
      width: l.w,
      fontSize: l.style.fontSize,
      fill: l.style.fill,
      fontWeight: l.style.fontWeight as any,
      fontFamily: l.style.fontFamily ?? 'Arial',
      textAlign: (l.style.align ?? 'left') as any,
      stroke: l.style.stroke,
      strokeWidth: l.style.strokeWidth,
    })
    // 锁住 Y 缩放（文本只允许改宽，不让字号被 scaleY 搞乱）
    tb.setControlsVisibility({ mt: false, mb: false })
    tb.lockScalingY = true
    ;(tb as any).data = { layerId: l.id, slotId: l.slotId, type: 'text' }
    return tb
  }
  return null
}

/**
 * 将 Fabric Canvas 当前对象转回 TemplateJSON。
 * MVP：只读取 rect/text，对 backgroundImage 仍用原 src（由调用方传入）。
 */
export function extractTemplateFromFabricCanvas(args: {
  canvas: fabric.Canvas
  backgroundSrc: string
  base: TemplateJSON
}): TemplateJSON {
  const { canvas, backgroundSrc, base } = args

  const layers: TemplateLayer[] = []
  layers.push({
    id: 'layer_bg',
    type: 'image',
    slotId: null,
    x: 0,
    y: 0,
    w: base.canvas.w,
    h: base.canvas.h,
    z: 0,
    src: backgroundSrc,
  })

  const objs = canvas.getObjects()
  let z = 10
  for (const obj of objs) {
    const data = (obj as any).data as { layerId?: string; slotId?: string | null; type?: string } | undefined
    const layerId = data?.layerId ?? `layer_${z}`
    const slotId = data?.slotId ?? null

    const left = obj.left ?? 0
    const top = obj.top ?? 0
    const w = (obj.getScaledWidth ? obj.getScaledWidth() : (obj.width ?? 0) * (obj.scaleX ?? 1))
    const h = (obj.getScaledHeight ? obj.getScaledHeight() : (obj.height ?? 0) * (obj.scaleY ?? 1))

    if (obj.type === 'rect') {
      const fill = (obj as any).fill ?? '#000000'
      const rx = (obj as any).rx ?? 0
      const ry = (obj as any).ry ?? 0
      layers.push({
        id: layerId,
        type: 'rect',
        slotId,
        x: Math.round(left),
        y: Math.round(top),
        w: Math.round(w),
        h: Math.round(h),
        z,
        fill: String(fill),
        rx,
        ry,
      } as any)
      z += 10
      continue
    }

    if (obj.type === 'textbox' || obj.type === 'text') {
      const tb: any = obj
      layers.push({
        id: layerId,
        type: 'text',
        slotId,
        x: Math.round(left),
        y: Math.round(top),
        w: Math.round(w),
        h: Math.round(h),
        z,
        text: String(tb.text ?? ''),
        style: {
          fontSize: Number(tb.fontSize ?? 32),
          fontWeight: tb.fontWeight ?? 400,
          fontFamily: tb.fontFamily ?? 'Arial',
          fill: String(tb.fill ?? '#000000'),
          align: (tb.textAlign ?? 'left') as any,
          stroke: tb.stroke,
          strokeWidth: tb.strokeWidth,
        },
      } as any)
      z += 10
      continue
    }
  }

  layers.sort((a, b) => a.z - b.z)
  return { ...base, layers }
}

/**
 * 关键：把 Textbox 缩放动作“收敛”为 width 的变化（避免 scaleX 累积）。
 */
export function attachTextboxScaleNormalization(canvas: fabric.Canvas) {
  canvas.on('object:scaling', (e) => {
    const obj = e.target as any
    if (!obj) return
    if (obj.type !== 'textbox') return

    // 只允许 X 方向改变宽度；把 scaleX 吸收进 width，然后 scaleX 归一
    const tb: any = obj
    const nextW = Math.max(10, (tb.width ?? 0) * (tb.scaleX ?? 1))
    tb.set({ width: nextW, scaleX: 1 })
    // Y 方向锁住
    tb.set({ scaleY: 1 })
  })
}
