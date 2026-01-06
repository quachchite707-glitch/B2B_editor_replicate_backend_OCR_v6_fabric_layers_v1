'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { LayerDoc, OverflowStrategy, AutoFixStrategy } from '@/types/fabric'
import {
  Settings,
  Sparkles,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'

interface SlotConfigPanelProps {
  layer: LayerDoc
  onUpdate: (layer: LayerDoc) => void
}

export function SlotConfigPanel({ layer, onUpdate }: SlotConfigPanelProps) {
  const [isSlot, setIsSlot] = useState(layer.isSlot || false)
  const [slotId, setSlotId] = useState(layer.slotId || '')
  const [overflowStrategy, setOverflowStrategy] = useState<OverflowStrategy>(
    layer.constraints?.text?.overflowStrategy || 'AUTO_SHRINK'
  )
  const [minFontSize, setMinFontSize] = useState(
    layer.constraints?.text?.minFontSize || 24
  )
  const [maxLines, setMaxLines] = useState(
    layer.constraints?.text?.maxLines || 3
  )
  const [enableContrast, setEnableContrast] = useState(
    !!layer.constraints?.text?.contrastRule
  )
  const [contrastRatio, setContrastRatio] = useState(
    layer.constraints?.text?.contrastRule?.minRatio || 4.5
  )
  const [autoFix, setAutoFix] = useState<AutoFixStrategy>(
    layer.constraints?.text?.contrastRule?.autoFix || 'ADD_STROKE'
  )

  const handleSave = () => {
    const updatedLayer: LayerDoc = {
      ...layer,
      isSlot,
      slotId: isSlot ? slotId : undefined,
      constraints: isSlot && layer.type === 'TEXT' ? {
        text: {
          overflowStrategy,
          minFontSize,
          maxLines,
          contrastRule: enableContrast ? {
            minRatio: contrastRatio,
            autoFix,
            strokeColor: '#000000',
            strokeWidth: 2,
          } : undefined,
        }
      } : undefined,
    }
    onUpdate(updatedLayer)
  }

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          插槽配置
        </CardTitle>
        <CardDescription>
          将此图层标记为插槽，可在批量生成时自动填充内容
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 启用插槽 */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-6 rounded-full relative transition-colors ${
              isSlot ? 'bg-indigo-600' : 'bg-gray-300'
            }`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                isSlot ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </div>
            <div>
              <p className="font-medium text-sm">启用插槽</p>
              <p className="text-xs text-gray-500">允许批量生成时替换内容</p>
            </div>
          </div>
          <Button
            variant={isSlot ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsSlot(!isSlot)}
          >
            {isSlot ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>

        {/* 插槽ID */}
        {isSlot && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                插槽 ID
                <span className="text-xs text-gray-500 ml-2">
                  (如: {{'{{'}}title{{'}}'}})
                </span>
              </label>
              <Input
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                placeholder="输入插槽ID，如: title"
                className="font-mono"
              />
            </div>

            {/* 文本溢出策略 */}
            {layer.type === 'TEXT' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-3">
                    文本溢出策略
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'AUTO_SHRINK' as OverflowStrategy, label: '自动缩字', desc: '逐步缩小字号直到适配' },
                      { value: 'TRUNCATE' as OverflowStrategy, label: '截断省略', desc: '限制行数并添加省略号' },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          overflowStrategy === option.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => setOverflowStrategy(option.value)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            overflowStrategy === option.value
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-gray-300'
                          }`}>
                            {overflowStrategy === option.value && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 最小字号 */}
                {overflowStrategy === 'AUTO_SHRINK' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      最小字号（px）
                    </label>
                    <Input
                      type="number"
                      value={minFontSize}
                      onChange={(e) => setMinFontSize(Number(e.target.value))}
                      min={12}
                      max={48}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      缩字时不会小于此值
                    </p>
                  </div>
                )}

                {/* 最大行数 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    最大行数
                  </label>
                  <Input
                    type="number"
                    value={maxLines}
                    onChange={(e) => setMaxLines(Number(e.target.value))}
                    min={1}
                    max={10}
                  />
                </div>

                {/* 对比度检查 */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-sm">对比度检查</p>
                      <p className="text-xs text-gray-500">确保文字清晰可读（WCAG AA标准）</p>
                    </div>
                    <Button
                      variant={enableContrast ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEnableContrast(!enableContrast)}
                    >
                      {enableContrast ? '已启用' : '未启用'}
                    </Button>
                  </div>

                  {enableContrast && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          最小对比度
                        </label>
                        <Input
                          type="number"
                          value={contrastRatio}
                          onChange={(e) => setContrastRatio(Number(e.target.value))}
                          min={3}
                          max={7}
                          step={0.1}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          WCAG AA 标准: 4.5, AAA 标准: 7.0
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          自动修复策略
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'ADD_STROKE' as AutoFixStrategy, label: '添加描边' },
                            { value: 'ADD_BACKGROUND_BAR' as AutoFixStrategy, label: '添加底色条' },
                            { value: 'SWITCH_COLOR' as AutoFixStrategy, label: '切换颜色' },
                          ].map((option) => (
                            <div
                              key={option.value}
                              className={`p-2 rounded-lg border cursor-pointer ${
                                autoFix === option.value
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              onClick={() => setAutoFix(option.value)}
                            >
                              <p className="text-sm">{option.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 保存按钮 */}
            <Button onClick={handleSave} className="w-full" size="lg">
              <Check className="w-5 h-5 mr-2" />
              保存插槽配置
            </Button>

            {/* 提示 */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                配置完成后，可在批量生成页面选择素材池，自动填充此插槽的内容
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

