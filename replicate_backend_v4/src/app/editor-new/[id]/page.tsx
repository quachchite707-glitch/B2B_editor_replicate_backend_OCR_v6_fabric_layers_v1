'use client'

import React, { useState } from 'react'
import { FabricCanvas } from '@/components/FabricCanvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Save,
  Download,
  Layers,
  Settings,
  Image as ImageIcon,
  Type,
  Shapes,
  QrCode,
  Upload,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'

export default function EditorNewPage({ params }: { params: { id: string } }) {
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [projectName, setProjectName] = useState('未命名项目')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [canvasRef, setCanvasRef] = useState<any>(null)

  const handleSave = () => {
    setSaveStatus('saving')
    // TODO: 实现保存逻辑
    setTimeout(() => setSaveStatus('saved'), 1000)
  }

  // 传递给 FabricCanvas 的回调，获取 canvas 实例
  const handleCanvasReady = (canvas: any) => {
    setCanvasRef(canvas)
  }

  // 添加文本
  const handleAddText = () => {
    if (!canvasRef) {
      alert('画布未初始化，请稍候再试')
      return
    }
    // 通过自定义事件通知 FabricCanvas 添加文本
    window.dispatchEvent(new CustomEvent('fabric-add-text'))
    setSaveStatus('unsaved')
  }

  // 添加矩形
  const handleAddRect = () => {
    if (!canvasRef) {
      alert('画布未初始化，请稍候再试')
      return
    }
    window.dispatchEvent(new CustomEvent('fabric-add-rect'))
    setSaveStatus('unsaved')
  }

  // 添加圆形
  const handleAddCircle = () => {
    if (!canvasRef) {
      alert('画布未初始化，请稍候再试')
      return
    }
    window.dispatchEvent(new CustomEvent('fabric-add-circle'))
    setSaveStatus('unsaved')
  }

  // 上传图片
  const handleUploadImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file && canvasRef) {
        const reader = new FileReader()
        reader.onload = (event) => {
          window.dispatchEvent(new CustomEvent('fabric-add-image', {
            detail: { imageUrl: event.target?.result }
          }))
          setSaveStatus('unsaved')
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 顶栏 */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/template">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-64 font-semibold"
              />
              <span className={`text-xs px-2 py-1 rounded-full ${
                saveStatus === 'saved' ? 'bg-green-100 text-green-700' :
                saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {saveStatus === 'saved' ? '已保存' :
                 saveStatus === 'saving' ? '保存中...' :
                 '未保存'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </header>

        {/* 主内容区 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧面板 */}
          {showLeftPanel && (
            <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 素材区 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      素材库
                    </CardTitle>
                    <CardDescription>添加图片、文本和元素</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
                      <Upload className="w-4 h-4 mr-2" />
                      上传图片
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Type className="w-4 h-4 mr-2" />
                      添加文本
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Shapes className="w-4 h-4 mr-2" />
                      添加形状
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <QrCode className="w-4 h-4 mr-2" />
                      添加二维码
                    </Button>
                  </CardContent>
                </Card>

                {/* 模板区 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      推荐模板
                    </CardTitle>
                    <CardDescription>快速开始设计</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="aspect-[9/16] rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center"
                        >
                          <span className="text-sm text-gray-600">模板 {i}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          )}

          {/* 画布区域 */}
          <main className="flex-1 flex flex-col">
            <FabricCanvas
              width={1080}
              height={1920}
              onObjectSelected={setSelectedObject}
              onCanvasChange={() => setSaveStatus('unsaved')}
            />
          </main>

          {/* 右侧面板 */}
          {showRightPanel && (
            <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* 图层列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-600" />
                      图层
                    </CardTitle>
                    <CardDescription>管理你的设计元素</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium">文本图层</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Unlock className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 属性面板 */}
                {selectedObject && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-green-600" />
                        属性
                      </CardTitle>
                      <CardDescription>调整选中元素</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">位置</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">X</label>
                            <Input type="number" defaultValue={0} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Y</label>
                            <Input type="number" defaultValue={0} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">尺寸</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">宽度</label>
                            <Input type="number" defaultValue={200} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">高度</label>
                            <Input type="number" defaultValue={100} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">颜色</label>
                        <Input type="color" defaultValue="#000000" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 插槽配置（新功能预告）*/}
                <Card className="border-2 border-dashed border-indigo-300 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      插槽配置
                    </CardTitle>
                    <CardDescription>批量生成功能（即将上线）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      将此图层标记为插槽，可在批量生成时自动填充不同内容
                    </p>
                    <Button variant="outline" className="w-full mt-4" disabled>
                      <Plus className="w-4 h-4 mr-2" />
                      配置插槽
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </aside>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

