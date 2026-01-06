'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { TemplateJSON, TemplateLayer, TemplateTextLayer, TemplateRectLayer } from '@/types/template'
import { getSavedTemplate, listSavedTemplates, loadWorkingTemplate } from '@/utils/replicate/storage'
import { renderTemplateToStaticCanvas, applySlotsRandomly } from '@/utils/replicate/previewGen'

export default function BatchPreviewPage() {
  const [working, setWorking] = useState<TemplateJSON | null>(null)
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<string>('working')
  const [count, setCount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [imgs, setImgs] = useState<string[]>([])

  useEffect(() => {
    setWorking(loadWorkingTemplate())
    setSaved(listSavedTemplates().map((t) => ({ id: t.id, name: t.name })))
  }, [])

  const tpl = useMemo(() => {
    if (selectedId === 'working') return working
    const t = getSavedTemplate(selectedId)
    return t?.template ?? null
  }, [selectedId, working])

  const generate = async () => {
    if (!tpl) return
    setBusy(true)
    setImgs([])
    try {
      const out: string[] = []
      for (let i = 0; i < count; i++) {
        const filled = applySlotsRandomly(tpl, `${Date.now()}_${i}`)
        const dataUrl = await renderTemplateToStaticCanvas(filled)
        out.push(dataUrl)
      }
      setImgs(out)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/template-new"><Button variant="ghost">返回模板库</Button></Link>
            <h1 className="text-xl font-bold">批量预览（10 张）</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/replicate"><Button variant="outline">去复刻解析</Button></Link>
            <Link href="/replicate/calibrate"><Button variant="outline">去校准</Button></Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>选择模板并生成预览</CardTitle>
            <CardDescription>随机规则：每个 slot 从候选池随机取 1 个值（文本取一条文案，色条取一种颜色）。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">模板来源</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="working">workingTemplate（当前校准结果）</option>
                {saved.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}（{t.id}）
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <div className="text-sm text-gray-600 mb-1">生成数量</div>
              <Input type="number" value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value || 10))))} />
            </div>
            <Button disabled={!tpl || busy} onClick={generate}>
              {busy ? '生成中...' : '生成预览'}
            </Button>
          </CardContent>
        </Card>

        {!tpl && (
          <div className="text-gray-600">没有可用模板。请先去 /replicate 上传图片并解析，再校准保存。</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {imgs.map((u, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`preview-${idx}`} className="w-full h-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
