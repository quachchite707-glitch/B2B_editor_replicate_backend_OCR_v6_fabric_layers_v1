'use client'

import React, { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { Button } from './ui/button'
import { 
  MousePointer2, 
  Type, 
  Image as ImageIcon, 
  Square, 
  Circle,
  QrCode,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { cn } from '@/lib/utils'

interface FabricCanvasProps {
  width?: number
  height?: number
  onObjectSelected?: (obj: fabric.Object | null) => void
  onCanvasChange?: () => void
}

export function FabricCanvas({
  width = 1080,
  height = 1920,
  onObjectSelected,
  onCanvasChange
}: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'image' | 'rect' | 'circle' | 'qr'>('select')
  const [zoom, setZoom] = useState(100)

  // 初始化 Fabric.js 画布
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    })

    fabricCanvasRef.current = canvas

    // 添加网格背景（可选）
    const gridSize = 50
    for (let i = 0; i < (width / gridSize); i++) {
      canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, height], {
        stroke: '#f0f0f0',
        selectable: false,
        evented: false,
      }))
      canvas.add(new fabric.Line([0, i * gridSize, width, i * gridSize], {
        stroke: '#f0f0f0',
        selectable: false,
        evented: false,
      }))
    }

    // 选中对象事件
    canvas.on('selection:created', (e) => {
      onObjectSelected?.(e.selected?.[0] || null)
    })

    canvas.on('selection:updated', (e) => {
      onObjectSelected?.(e.selected?.[0] || null)
    })

    canvas.on('selection:cleared', () => {
      onObjectSelected?.(null)
    })

    // 对象修改事件
    canvas.on('object:modified', () => {
      onCanvasChange?.()
    })

    canvas.on('object:added', () => {
      onCanvasChange?.()
    })

    canvas.on('object:removed', () => {
      onCanvasChange?.()
    })

    return () => {
      canvas.dispose()
    }
  }, [width, height, onObjectSelected, onCanvasChange])

  // 添加文本
  const addText = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const text = new fabric.Textbox('双击编辑文本', {
      left: 100,
      top: 100,
      width: 300,
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#000000',
      fontWeight: 'bold',
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.requestRenderAll()
    onCanvasChange?.()
  }

  // 添加矩形
  const addRect = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const rect = new fabric.Rect({
      left: 150,
      top: 150,
      width: 200,
      height: 150,
      fill: '#3b82f6',
      rx: 10,
      ry: 10,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.requestRenderAll()
    onCanvasChange?.()
  }

  // 添加圆形
  const addCircle = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 80,
      fill: '#10b981',
    })

    canvas.add(circle)
    canvas.setActiveObject(circle)
    canvas.requestRenderAll()
    onCanvasChange?.()
  }

  // 缩放控制
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 25))
  }

  const handleZoomFit = () => {
    setZoom(100)
  }

  // 应用缩放
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !containerRef.current) return

    const scale = zoom / 100
    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // 设置画布缩放
    canvas.setZoom(scale)
    canvas.setWidth(width * scale)
    canvas.setHeight(height * scale)

    // 居中显示
    const scrollLeft = (canvas.getWidth() - containerWidth) / 2
    const scrollTop = (canvas.getHeight() - containerHeight) / 2
    container.scrollLeft = scrollLeft
    container.scrollTop = scrollTop

    canvas.requestRenderAll()
  }, [zoom, width, height])

  const tools = [
    { id: 'select', icon: MousePointer2, label: '选择', onClick: () => setActiveTool('select') },
    { id: 'text', icon: Type, label: '文本', onClick: addText },
    { id: 'rect', icon: Square, label: '矩形', onClick: addRect },
    { id: 'circle', icon: Circle, label: '圆形', onClick: addCircle },
    { id: 'qr', icon: QrCode, label: '二维码', onClick: () => setActiveTool('qr') },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                    size="icon"
                    onClick={tool.onClick}
                  >
                    <tool.icon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* 缩放控制 */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>缩小</p>
              </TooltipContent>
            </Tooltip>

            <span className="px-3 py-1 text-sm font-medium bg-gray-100 rounded-lg min-w-[60px] text-center">
              {zoom}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>放大</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomFit}>
                  <Maximize2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>适应画布</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* 画布区域 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-8"
        style={{
          background: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="shadow-2xl rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}

