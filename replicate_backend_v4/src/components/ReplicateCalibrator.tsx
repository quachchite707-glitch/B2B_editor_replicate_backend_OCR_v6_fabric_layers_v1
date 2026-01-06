'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TemplateJSON, TemplateLayer } from '@/types/template'
import {
  attachTextboxScaleNormalization,
  extractTemplateFromFabricCanvas,
  renderTemplateToFabricCanvas,
} from '@/utils/replicate/fabricTemplate'

type Props = {
  template: TemplateJSON
  onChangeTemplate: (t: TemplateJSON) => void
  onDownload?: (t: TemplateJSON) => void
}

export function ReplicateCalibrator({ template, onChangeTemplate, onDownload }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [name, setName] = useState('未命名复刻模板')

  // 初始化 fabric
  useEffect(() => {
    if (!canvasElRef.current) return
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: template.canvas.w,
      height: template.canvas.h,
      preserveObjectStacking: true,
      selection: true,
    })
    fabricRef.current = canvas
    attachTextboxScaleNormalization(canvas)

    const onSel = () => {
      const obj = canvas.getActiveObject() as any
      const layerId = obj?.data?.layerId ?? null
      setSelectedLayerId(layerId)
    }
    canvas.on('selection:created', onSel)
    canvas.on('selection:updated', onSel)
    canvas.on('selection:cleared', () => setSelectedLayerId(null))

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 每当 template 变化，重新渲染到画布
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const ac = new AbortController()
    void renderTemplateToFabricCanvas(canvas, template, { signal: ac.signal })
    return () => ac.abort()
  }, [template])

  const layers = useMemo(
    () => template.layers.filter((l) => l.type !== 'image').sort((a, b) => a.z - b.z),
    [template.layers]
  )

  const selectedLayer = useMemo(
    () => (selectedLayerId ? template.layers.find((l) => l.id === selectedLayerId) ?? null : null),
    [template.layers, selectedLayerId]
  )

  const selectLayerOnCanvas = (layerId: string) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => o?.data?.layerId === layerId)
    if (obj) {
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
      setSelectedLayerId(layerId)
    }
  }

  const updateSelectedObject = (patch: any) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject() as any
    if (!obj) return
    obj.set(patch)
    canvas.requestRenderAll()
  }

  const syncFromCanvas = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const bg = template.layers.find((l) => l.type === 'image') as any
    const next = extractTemplateFromFabricCanvas({
      canvas,
      backgroundSrc: bg?.src ?? '',
      base: template,
    })
    // slots/pools 保留
    onChangeTemplate({ ...next, slots: template.slots, pools: template.pools })
  }

  const ensureSlotForLayer = (layer: TemplateLayer) => {
    if (!layer.slotId) return
    const exists = template.slots.some((s) => s.slotId === layer.slotId)
    if (exists) return
    const poolId = layer.type === 'text' ? `pool_text_${template.slots.length + 1}` : `pool_block_${template.slots.length + 1}`
    const slotType = layer.type === 'text' ? 'text' : 'block'
    const next: TemplateJSON = {
      ...template,
      slots: [...template.slots, { slotId: layer.slotId, slotType, poolId }],
      pools: { ...template.pools, [poolId]: [] },
    }
    onChangeTemplate(next)
  }

  const updatePoolValues = (poolId: string, raw: string) => {
    const arr = raw
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
    onChangeTemplate({ ...template, pools: { ...template.pools, [poolId]: arr } })
  }

  const getPoolIdForSlot = (slotId: string) => template.slots.find((s) => s.slotId === slotId)?.poolId

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>校准画布</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={syncFromCanvas}>
              同步图层数据
            </Button>
            <Button onClick={() => onDownload?.(template)}>下载模板 JSON</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="inline-block shadow-2xl rounded-lg overflow-hidden bg-white">
              <canvas ref={canvasElRef} />
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-3">
            提示：拖拽/缩放对象可调整位置和尺寸；文本宽度拖动会自动换行。修改完成后点“同步图层数据”。
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>模板信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">模板名称</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="text-sm text-gray-600">
              画布尺寸：{template.canvas.w}×{template.canvas.h}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>图层列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {layers.map((l) => (
              <button
                key={l.id}
                className={`w-full text-left px-3 py-2 rounded border ${selectedLayerId === l.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'} hover:border-indigo-300`}
                onClick={() => selectLayerOnCanvas(l.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {l.type === 'rect' ? '色条' : '文本'} · {l.id}
                  </div>
                  <div className="text-xs text-gray-500">z={l.z}</div>
                </div>
                {l.slotId && <div className="text-xs text-gray-500 mt-1">slot: {l.slotId}</div>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>选中图层编辑</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedLayer ? (
              <div className="text-sm text-gray-500">请在画布或图层列表中选中一个图层。</div>
            ) : (
              <>
                <div className="text-xs text-gray-500">{selectedLayer.id}</div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">slotId（用于批量随机）</div>
                  <Input
                    value={selectedLayer.slotId ?? ''}
                    onChange={(e) => {
                      const slotId = e.target.value || null
                      // 更新 template 中对应 layer
                      const nextLayers = template.layers.map((x) => (x.id === selectedLayer.id ? ({ ...x, slotId } as any) : x))
                      const next = { ...template, layers: nextLayers }
                      onChangeTemplate(next)
                      if (slotId) ensureSlotForLayer({ ...(selectedLayer as any), slotId } as any)
                      // 同步到 canvas object
                      const canvas = fabricRef.current
                      const obj = canvas?.getObjects().find((o: any) => o?.data?.layerId === selectedLayer.id) as any
                      if (obj) obj.data = { ...(obj.data ?? {}), slotId }
                    }}
                    placeholder="例如 slot_text_1"
                  />
                </div>

                {selectedLayer.type === 'text' && (
                  <>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">文字内容</div>
                      <Input
                        value={(selectedLayer as any).text ?? ''}
                        onChange={(e) => {
                          updateSelectedObject({ text: e.target.value })
                          // 同步到 template（即时）
                          const nextLayers = template.layers.map((x: any) => (x.id === selectedLayer.id ? { ...x, text: e.target.value } : x))
                          onChangeTemplate({ ...template, layers: nextLayers })
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">字号</div>
                        <Input
                          type="number"
                          value={(selectedLayer as any).style?.fontSize ?? 32}
                          onChange={(e) => {
                            const v = Number(e.target.value || 32)
                            updateSelectedObject({ fontSize: v })
                            const nextLayers = template.layers.map((x: any) =>
                              x.id === selectedLayer.id ? { ...x, style: { ...x.style, fontSize: v } } : x
                            )
                            onChangeTemplate({ ...template, layers: nextLayers })
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">颜色</div>
                        <Input
                          value={(selectedLayer as any).style?.fill ?? '#000000'}
                          onChange={(e) => {
                            const v = e.target.value
                            updateSelectedObject({ fill: v })
                            const nextLayers = template.layers.map((x: any) =>
                              x.id === selectedLayer.id ? { ...x, style: { ...x.style, fill: v } } : x
                            )
                            onChangeTemplate({ ...template, layers: nextLayers })
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedLayer.type === 'rect' && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">填充色</div>
                    <Input
                      value={(selectedLayer as any).fill ?? '#ffffff'}
                      onChange={(e) => {
                        const v = e.target.value
                        updateSelectedObject({ fill: v })
                        const nextLayers = template.layers.map((x: any) => (x.id === selectedLayer.id ? { ...x, fill: v } : x))
                        onChangeTemplate({ ...template, layers: nextLayers })
                      }}
                    />
                  </div>
                )}

                {selectedLayer.slotId && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">候选池（每行一个）</div>
                    <textarea
                      className="w-full h-28 p-2 border rounded text-sm"
                      value={(template.pools[getPoolIdForSlot(selectedLayer.slotId) ?? ''] ?? []).join('\n')}
                      onChange={(e) => {
                        const poolId = getPoolIdForSlot(selectedLayer.slotId!)
                        if (!poolId) return
                        updatePoolValues(poolId, e.target.value)
                      }}
                      placeholder={selectedLayer.type === 'text' ? '输入多条文案' : '输入多种颜色（#rrggbb）'}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      poolId: {getPoolIdForSlot(selectedLayer.slotId) ?? '未绑定（请先填 slotId）'}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
