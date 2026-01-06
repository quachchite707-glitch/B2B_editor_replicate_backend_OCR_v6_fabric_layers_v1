'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { parseBarsFromImage, buildTemplateFromDetections, type OCRBox } from '@/utils/replicate/imageParse'
import { runOcrTesseract } from '@/utils/replicate/ocr'
import { parsePosterByBackend } from '@/utils/replicate/backendClient'
import { saveWorkingTemplate } from '@/utils/replicate/storage'

export default function ReplicatePage() {
  const router = useRouter()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [useBackend, setUseBackend] = useState(true)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string>('')
  const canStart = useMemo(() => !!imageUrl && !busy, [imageUrl, busy])

  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => setImageUrl(String(reader.result))
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const startParse = async () => {
    if (!imageUrl) return
    setBusy(true)
    setLog('加载图片...')
    try {
      let canvasW = 0
      let canvasH = 0
      let bars: any[] = []
      let ocr: OCRBox[] = []

      if (useBackend) {
        setLog('使用后端识别（PaddleOCR + bars 检测）...')
        try {
          const r = await parsePosterByBackend({ imageUrl, detectBars: true })
          canvasW = r.width
          canvasH = r.height
          bars = r.bars
          ocr = r.ocr
          setLog(`后端识别完成：bars=${bars.length}，texts=${ocr.length}。正在组装模板...`)
        } catch (e: any) {
          console.warn('[replicate] backend parse failed, fallback to browser parse:', e)
          setLog('后端识别失败（请确认 backend 已启动、端口 8001 可访问）。改用前端启发式解析 + tesseract OCR...')
        }
      }

      if (canvasW === 0 || canvasH === 0) {
        const img = await loadImage(imageUrl)
        canvasW = img.naturalWidth || img.width
        canvasH = img.naturalHeight || img.height

        setLog('识别横条块（bars）...')
        bars = await parseBarsFromImage(img)

        setLog(`横条块识别完成：${bars.length} 个。开始 OCR（中文）...`)
        ocr = await runOcrTesseract({ imageUrl, lang: 'chi_sim' })
        if (ocr.length > 0) setLog(`OCR 完成：${ocr.length} 个文本框。正在组装模板...`)
        else setLog('OCR 失败/跳过（可能是语言包下载问题）。你仍然可以在下一步手动添加/修改文本。')
      }

      const tpl = buildTemplateFromDetections({
        canvasW,
        canvasH,
        backgroundSrc: imageUrl,
        bars,
        ocr,
      })

      saveWorkingTemplate(tpl)
      router.push('/replicate/calibrate')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/template-new">
              <Button variant="ghost">返回模板库</Button>
            </Link>
            <h1 className="text-xl font-bold">复刻图片模板（MVP 测试版）</h1>
          </div>
          <Link href="/batch/preview">
            <Button variant="outline">批量预览（10 张）</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1）上传参考海报</CardTitle>
            <CardDescription>支持：照片背景 + 纯色横条 + 文字。解析不准也没关系，下一步可校准。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleUpload}>选择图片</Button>
              <Button
                variant="outline"
                onClick={() => setImageUrl('/samples/sample1.png')}
              >
                载入示例 1
              </Button>
              <Button
                variant="outline"
                onClick={() => setImageUrl('/samples/sample2.png')}
              >
                载入示例 2
              </Button>
              <Button disabled={!canStart} onClick={startParse}>
                {busy ? '解析中...' : '开始解析 → 校准'}
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={useBackend}
                onChange={(e) => setUseBackend(e.target.checked)}
              />
              优先使用后端识别（推荐：中文更准、不会受浏览器 Worker/语言包影响）
            </label>

            {busy && <div className="text-sm text-gray-600">正在解析…（OCR 可能需要下载语言包，首次会慢）</div>}

            <div className="text-sm text-gray-700 whitespace-pre-wrap">{log}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2）预览</CardTitle>
            <CardDescription>解析前先确认图片方向和清晰度（文字越清晰，OCR 越准）。</CardDescription>
          </CardHeader>
          <CardContent>
            {imageUrl ? (
              <div className="rounded-lg overflow-hidden shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="upload" className="w-full h-auto" />
              </div>
            ) : (
              <div className="h-[420px] flex items-center justify-center text-gray-500 border-2 border-dashed rounded-lg">
                请选择一张海报图片
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
