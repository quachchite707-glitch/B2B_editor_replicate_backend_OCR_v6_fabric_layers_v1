'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReplicateCalibrator } from '@/components/ReplicateCalibrator'
import type { TemplateJSON } from '@/types/template'
import { loadWorkingTemplate, saveWorkingTemplate, saveTemplateToLibrary } from '@/utils/replicate/storage'

export default function CalibratePage() {
  const router = useRouter()
  const [tpl, setTpl] = useState<TemplateJSON | null>(null)

  useEffect(() => {
    const t = loadWorkingTemplate()
    if (!t) {
      router.replace('/replicate')
      return
    }
    setTpl(t)
  }, [router])

  const handleDownload = (t: TemplateJSON) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveWorking = () => {
    if (!tpl) return
    saveWorkingTemplate(tpl)
    alert('已保存到本地（workingTemplate）')
  }

  const handleSaveToLibrary = () => {
    if (!tpl) return
    const name = window.prompt('给这个模板取个名字：', '复刻模板') || '复刻模板'
    const id = saveTemplateToLibrary(tpl, name)
    alert(`已保存到模板库：${name}（${id}）`) 
  }

  if (!tpl) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        正在加载解析结果...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/replicate">
              <Button variant="ghost">返回重新解析</Button>
            </Link>
            <h1 className="text-xl font-bold">校准解析结果</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSaveWorking}>保存（本地）</Button>
            <Button variant="outline" onClick={handleSaveToLibrary}>保存到模板库</Button>
            <Link href="/batch/preview"><Button>去批量预览</Button></Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
            <CardDescription>
              这是测试版：先做到“横条+文字”自动化。你可以拖拽/缩放/改文本，然后保存为模板 JSON，进入批量预览。
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            常见问题：OCR 不准很正常，直接在右侧改字即可；颜色请用 #rrggbb。文本宽度拖动会自动换行。
          </CardContent>
        </Card>

        <ReplicateCalibrator
          template={tpl}
          onChangeTemplate={(t) => {
            setTpl(t)
            saveWorkingTemplate(t)
          }}
          onDownload={handleDownload}
        />
      </div>
    </div>
  )
}
