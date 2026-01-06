'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Search,
  Plus,
  Sparkles,
  TrendingUp,
  Heart,
  Eye,
  Star,
  Filter,
  Grid3x3,
  List,
} from 'lucide-react'
import Link from 'next/link'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const templates = [
  {
    id: '1',
    name: '价值主张单图',
    description: '突出产品核心价值',
    category: '营销海报',
    thumbnail: '/placeholder-1.jpg',
    views: 1234,
    likes: 89,
    rating: 4.8,
  },
  {
    id: '2',
    name: '四页漏斗',
    description: '完整的转化流程',
    category: '系列图文',
    thumbnail: '/placeholder-2.jpg',
    views: 892,
    likes: 67,
    rating: 4.6,
  },
  {
    id: '3',
    name: 'ABM 单图',
    description: 'B2B 营销专用',
    category: '营销海报',
    thumbnail: '/placeholder-3.jpg',
    views: 1567,
    likes: 123,
    rating: 4.9,
  },
  {
    id: '4',
    name: '产品对比图',
    description: '对比优势一目了然',
    category: '信息图表',
    thumbnail: '/placeholder-4.jpg',
    views: 734,
    likes: 45,
    rating: 4.5,
  },
  {
    id: '5',
    name: '客户见证墙',
    description: '社交证明增强信任',
    category: '营销海报',
    thumbnail: '/placeholder-5.jpg',
    views: 2103,
    likes: 178,
    rating: 4.9,
  },
  {
    id: '6',
    name: '限时优惠',
    description: '紧迫感促进转化',
    category: '促销海报',
    thumbnail: '/placeholder-6.jpg',
    views: 3421,
    likes: 267,
    rating: 4.7,
  },
]

const categories = ['全部', '营销海报', '系列图文', '信息图表', '促销海报']

export default function TemplateNewPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        {/* 顶栏 */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    B2B 图文设计器
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/editor-new/new">
                  <Button size="lg" className="shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    创建空白项目
                  </Button>
                </Link>

                <Link href="/replicate">
                  <Button size="lg" variant="outline" className="shadow-lg">
                    复刻图片模板（测试）
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 英雄区 */}
        <section className="container mx-auto px-6 py-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              创建专业的营销图文
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              使用模板快速开始，或从头开始创建你的设计。支持批量生成，轻松制作数千张图片。
            </p>

            {/* 搜索栏 */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-14 text-lg shadow-lg"
              />
            </div>
          </div>

          {/* 分类筛选 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 模板网格 */}
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {templates.map((template) => (
              <Card
                key={template.id}
                className="group hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-2 hover:border-indigo-300"
              >
                <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-400 text-lg font-semibold">{template.name}</span>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {template.rating}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                      <Link href={`/editor-new/${template.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          使用模板
                        </Button>
                      </Link>
                      <Button variant="secondary" size="icon">
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-indigo-600 transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardFooter className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {template.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {template.likes}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {template.category}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* 底部 CTA */}
        <section className="container mx-auto px-6 py-16">
          <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">准备好开始了吗？</CardTitle>
              <CardDescription className="text-white/80 text-lg">
                立即创建你的第一个设计，或探索更多模板
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-4">
              <Link href="/editor-new/new">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  创建新项目
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Sparkles className="w-5 h-5 mr-2" />
                查看所有模板
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </TooltipProvider>
  )
}

