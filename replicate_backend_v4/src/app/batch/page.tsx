'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Sparkles,
  Zap,
  ChevronRight,
  Play,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Layers,
  Database,
} from 'lucide-react'
import Link from 'next/link'
import { BatchJob, SlotMapping } from '@/types/fabric'

export default function BatchPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [seed, setSeed] = useState<number>(12345)
  const [count, setCount] = useState<number>(100)
  const [slotMappings, setSlotMappings] = useState<SlotMapping[]>([
    { slotId: '{{title}}', poolId: 'pool_001', strategy: 'random' },
    { slotId: '{{bg_image}}', poolId: 'pool_002', strategy: 'random' },
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BatchJob | null>(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    setProgress(0)

    // 模拟批量生成进度
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsGenerating(false)
          setResult({
            id: 'batch_' + Date.now(),
            templateId: 'template_001',
            status: 'completed',
            progress: 100,
            config: {
              templateId: 'template_001',
              slotMappings,
              count,
              seed,
              validationRules: {
                enableContrastCheck: true,
                enableOverflowCheck: true,
                maxRetries: 3,
              },
            },
            validationStats: {
              total: count,
              success: Math.floor(count * 0.95),
              failed: Math.floor(count * 0.05),
              failureReasons: {
                'text_overflow': 15,
                'contrast_failed': 8,
                'ratio_mismatch': 2,
              },
            },
            resultZipUrl: '/downloads/batch_result.zip',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          })
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* 顶栏 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/template-new">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-2xl font-bold">批量生成</h1>
                  <p className="text-sm text-gray-500">一键生成数千张营销图片</p>
                </div>
              </div>
            </div>

            <Link href="/asset-pools">
              <Button variant="outline">
                <Database className="w-4 h-4 mr-2" />
                管理素材池
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：配置 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 步骤 1：选择模板 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  选择模板
                </CardTitle>
                <CardDescription>选择一个已配置插槽的模板</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {['价值主张单图', '四页漏斗', 'ABM 单图'].map((template, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTemplate === template
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center">
                        <Layers className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="font-medium text-sm">{template}</p>
                      <p className="text-xs text-gray-500">3 个插槽</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 步骤 2：插槽映射 */}
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    插槽映射
                  </CardTitle>
                  <CardDescription>为每个插槽选择素材池</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {slotMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">插槽: {mapping.slotId}</p>
                        <p className="text-xs text-gray-500">类型: 文本</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <select className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none">
                          <option>营销标题库 (50条)</option>
                          <option>产品卖点库 (80条)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">随机抽取</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 步骤 3：生成参数 */}
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    生成参数
                  </CardTitle>
                  <CardDescription>配置生成数量和随机种子</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        生成数量
                      </label>
                      <Input
                        type="number"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        min={1}
                        max={10000}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        最多 10,000 张
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        随机种子
                      </label>
                      <Input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(Number(e.target.value))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        用于可复现生成
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <label className="flex items-center gap-2 mb-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm font-medium">启用对比度检查（WCAG AA）</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="text-sm font-medium">启用溢出检查（自动缩字）</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：预览和执行 */}
          <div className="space-y-6">
            {/* 预览 */}
            {selectedTemplate && !isGenerating && !result && (
              <Card className="border-2 border-indigo-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    准备生成
                  </CardTitle>
                  <CardDescription>确认配置无误后开始</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">模板</span>
                    <span className="font-medium">{selectedTemplate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">插槽数量</span>
                    <span className="font-medium">{slotMappings.length} 个</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">生成数量</span>
                    <span className="font-medium text-indigo-600">{count} 张</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">预计成片率</span>
                    <span className="font-medium text-green-600">~95%</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleGenerate} className="w-full" size="lg">
                    <Play className="w-5 h-5 mr-2" />
                    开始批量生成
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* 进度 */}
            {isGenerating && (
              <Card className="border-2 border-blue-300 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    生成中...
                  </CardTitle>
                  <CardDescription>请稍候，正在批量渲染图片</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span>进度</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      已生成 {Math.floor(count * progress / 100)} / {count} 张
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 结果 */}
            {result && (
              <Card className="border-2 border-green-300 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    生成完成！
                  </CardTitle>
                  <CardDescription>查看统计和下载结果</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 统计 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {result.validationStats?.total}
                      </p>
                      <p className="text-xs text-gray-500">总数</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {result.validationStats?.success}
                      </p>
                      <p className="text-xs text-gray-500">成功</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {result.validationStats?.failed}
                      </p>
                      <p className="text-xs text-gray-500">失败</p>
                    </div>
                  </div>

                  {/* 成片率 */}
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">成片率</span>
                      <span className="text-2xl font-bold text-green-600">
                        {result.validationStats && Math.round((result.validationStats.success / result.validationStats.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{
                          width: `${result.validationStats && (result.validationStats.success / result.validationStats.total) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* 失败原因 */}
                  {result.validationStats && result.validationStats.failed > 0 && (
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">失败原因</p>
                      <div className="space-y-2">
                        {Object.entries(result.validationStats.failureReasons).map(([reason, count]) => (
                          <div key={reason} className="flex justify-between text-xs">
                            <span className="text-gray-600">{reason}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button className="w-full" size="lg">
                    <Download className="w-5 h-5 mr-2" />
                    下载 ZIP ({result.validationStats?.success} 张)
                  </Button>
                  {result.validationStats && result.validationStats.failed > 0 && (
                    <Button variant="outline" className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新生成失败项
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}

            {/* 提示 */}
            {!selectedTemplate && (
              <Card className="border-2 border-dashed border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-400">
                    <AlertCircle className="w-5 h-5" />
                    开始之前
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600">1.</span>
                      <span>选择一个已配置插槽的模板</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600">2.</span>
                      <span>为每个插槽选择素材池</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600">3.</span>
                      <span>设置生成数量和随机种子</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600">4.</span>
                      <span>点击开始，等待完成</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

