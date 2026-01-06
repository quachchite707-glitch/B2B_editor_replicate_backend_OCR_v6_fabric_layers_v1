import { fabric } from 'fabric'
import type { TemplateJSON, TemplateLayer } from '@/types/template'
import { renderTemplateToFabricCanvas } from './fabricTemplate'

export function applySlotsRandomly(tpl: TemplateJSON, seed?: string): TemplateJSON {
  // 简单随机：基于 Math.random（MVP），seed 暂不保证完全可复现
  const next: TemplateJSON = JSON.parse(JSON.stringify(tpl))

  const slotToPool = new Map(next.slots.map((s) => [s.slotId, s.poolId]))

  for (const layer of next.layers) {
    if (!layer.slotId) continue
    const poolId = slotToPool.get(layer.slotId)
    if (!poolId) continue
    const pool = next.pools[poolId] ?? []
    if (pool.length === 0) continue
    const val = pool[Math.floor(Math.random() * pool.length)]

    if (layer.type === 'text') {
      ;(layer as any).text = val
    }
    if (layer.type === 'rect') {
      ;(layer as any).fill = val
    }
  }
  return next
}

export async function renderTemplateToStaticCanvas(tpl: TemplateJSON): Promise<string> {
  const el = document.createElement('canvas')
  el.width = tpl.canvas.w
  el.height = tpl.canvas.h
  const canvas = new fabric.StaticCanvas(el, {
    width: tpl.canvas.w,
    height: tpl.canvas.h,
    renderOnAddRemove: false,
  })

  try {
    await renderTemplateToFabricCanvas(canvas as any, tpl)
    canvas.renderAll()
    // 统一导出为 JPEG（MVP），质量可后续做 1.5MB 自适应
    return canvas.toDataURL({ format: 'jpeg', quality: 0.92 })
  } finally {
    canvas.dispose()
  }
}
