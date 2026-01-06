'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus,
  Database,
  Type,
  Image as ImageIcon,
  Palette,
  Edit,
  Trash2,
  ArrowLeft,
  Upload,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { AssetPool, AssetPoolType } from '@/types/fabric'

const mockPools: AssetPool[] = [
  {
    id: '1',
    name: '营销标题库',
    type: 'TEXT',
    items: [
      '限时优惠！立即抢购',
      '专业服务，值得信赖',
      '新品上市，火爆热销',
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: '产品背景图',
    type: 'IMAGE',
    items: [
      { assetId: 'img1', url: '/placeholder.jpg', ratio: 0.56, width: 1080, height: 1920 },
      { assetId: 'img2', url: '/placeholder.jpg', ratio: 0.56, width: 1080, height: 1920 },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: '配色方案',
    type: 'COLOR_SCHEME',
    items: [
      { name: '活力橙', primary: '#FF6B6B', secondary: '#4ECDC4', accent: '#FFE66D' },
      { name: '自然绿', primary: '#2E7D32', secondary: '#FFC107', accent: '#FFFFFF' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },
]

export default function AssetPoolsPage() {
  const [pools, setPools] = useState<AssetPool[]>(mockPools)
  const [isCreating, setIsCreating] = useState(false)
  const [newPoolType, setNewPoolType] = useState<AssetPoolType>('TEXT')
  const [newPoolName, setNewPoolName] = useState('')
  const [newPoolItems, setNewPoolItems] = useState('')

  const handleCreate = () => {
    // TODO: 实现创建逻辑
    const newPool: AssetPool = {
      id: Date.now().toString(),
      name: newPoolName,
      type: newPoolType,
      items: newPoolType === 'TEXT' 
        ? newPoolItems.split('\n').filter(item => item.trim())
        : [],
      createdAt: new Date().toISOString(),
    }
    setPools([...pools, newPool])
    setIsCreating(false)
    setNewPoolName('')
    setNewPoolItems('')
  }

  const getPoolIcon = (type: AssetPoolType) => {
    switch (type) {
      case 'TEXT':
        return <Type className="w-5 h-5 text-blue-600" />
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5 text-green-600" />
      case 'COLOR_SCHEME':
        return <Palette className="w-5 h-5 text-purple-600" />
    }
  }

  const getPoolColor = (type: AssetPoolType) => {
    switch (type) {
      case 'TEXT':
        return 'from-blue-500 to-cyan-500'
      case 'IMAGE':
        return 'from-green-500 to-emerald-500'
      case 'COLOR_SCHEME':
        return 'from-purple-500 to-pink-500'
    }
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
                <Database className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-2xl font-bold">素材池管理</h1>
                  <p className="text-sm text-gray-500">管理批量生成的素材内容</p>
                </div>
              </div>
            </div>

            <Button onClick={() => setIsCreating(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              创建素材池
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-6 py-12">
        {/* 创建表单 */}
        {isCreating && (
          <Card className="mb-8 border-2 border-indigo-300 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-6 h-6" />
                创建新素材池
              </CardTitle>
              <CardDescription>选择类型并添加素材内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 类型选择 */}
              <div>
                <label className="block text-sm font-medium mb-3">素材池类型</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { type: 'TEXT' as AssetPoolType, icon: Type, label: '文本池', desc: '文案、标题等' },
                    { type: 'IMAGE' as AssetPoolType, icon: ImageIcon, label: '图片池', desc: '背景、产品图等' },
                    { type: 'COLOR_SCHEME' as AssetPoolType, icon: Palette, label: '配色池', desc: '颜色方案' },
                  ].map((option) => (
                    <div
                      key={option.type}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        newPoolType === option.type
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => setNewPoolType(option.type)}
                    >
                      <option.icon className={`w-8 h-8 mb-2 ${
                        newPoolType === option.type ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 素材池名称 */}
              <div>
                <label className="block text-sm font-medium mb-2">素材池名称</label>
                <Input
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  placeholder="如: 营销标题库"
                />
              </div>

              {/* 内容输入 */}
              {newPoolType === 'TEXT' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    文本内容（每行一个）
                  </label>
                  <textarea
                    value={newPoolItems}
                    onChange={(e) => setNewPoolItems(e.target.value)}
                    placeholder={'限时优惠！立即抢购\n专业服务，值得信赖\n新品上市，火爆热销'}
                    className="w-full h-40 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    已输入 {newPoolItems.split('\n').filter(item => item.trim()).length} 条文本
                  </p>
                </div>
              )}

              {newPoolType === 'IMAGE' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">上传图片素材</p>
                  <Button variant="outline">选择文件</Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newPoolName.trim()}>
                <Check className="w-4 h-4 mr-2" />
                创建
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 素材池列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <Card
              key={pool.id}
              className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-indigo-300 overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${getPoolColor(pool.type)}`} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${
                      pool.type === 'TEXT' ? 'from-blue-100 to-cyan-100' :
                      pool.type === 'IMAGE' ? 'from-green-100 to-emerald-100' :
                      'from-purple-100 to-pink-100'
                    }`}>
                      {getPoolIcon(pool.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pool.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {pool.type === 'TEXT' ? '文本池' :
                         pool.type === 'IMAGE' ? '图片池' :
                         '配色池'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">素材数量</span>
                    <span className="font-semibold text-indigo-600">
                      {pool.items.length} 个
                    </span>
                  </div>

                  {/* 预览 */}
                  {pool.type === 'TEXT' && pool.items.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">预览:</p>
                      <p className="text-sm truncate">{pool.items[0] as string}</p>
                      {pool.items.length > 1 && (
                        <p className="text-xs text-gray-400 mt-1">
                          +{pool.items.length - 1} 更多...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* 空状态 */}
        {pools.length === 0 && !isCreating && (
          <Card className="p-12 text-center">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <CardTitle className="mb-2">还没有素材池</CardTitle>
            <CardDescription className="mb-6">
              创建素材池来管理批量生成的内容
            </CardDescription>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-5 h-5 mr-2" />
              创建第一个素材池
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}

