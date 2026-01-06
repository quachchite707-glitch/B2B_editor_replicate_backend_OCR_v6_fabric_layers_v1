# 🎨 B2B 图文设计器 - 全新版本

> 专业的模板插槽系统 + 批量生成引擎，让营销图片制作更高效！

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?logo=next.js)](https://nextjs.org/)
[![Fabric.js](https://img.shields.io/badge/Fabric.js-5.3.0-orange?logo=javascript)](http://fabricjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

---

## ✨ 全新特性

### 🎯 模板插槽系统
- 将图层标记为插槽，批量生成时自动填充内容
- 支持文本、图片、形状、二维码等多种类型
- 智能约束规则：文本溢出自动缩字、对比度自动修复

### 📦 素材池管理
- **文本池**：批量管理标题、卖点、文案
- **图片池**：批量上传背景图、产品图
- **配色池**：预设品牌配色方案

### ⚡ 批量生成引擎
- 一键生成数千张营销图片
- 实时进度显示和成片率统计
- seed 随机确保结果可复现
- 智能校验和失败原因分析

### 🎨 现代化 UI
- 参考 Canva/Figma 的专业设计
- 渐变背景、卡片阴影、流畅动画
- 响应式布局，适配各种屏幕
- 使用 shadcn/ui 和 Lucide Icons

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 访问应用

打开浏览器访问 [http://localhost:3000/template-new](http://localhost:3000/template-new)

---

## 📱 页面导航

### 1. 模板库 (`/template-new`)
- 浏览和搜索模板
- 查看评分、浏览量、分类
- 创建新项目

### 2. 编辑器 (`/editor-new/[id]`)
- 可视化设计界面
- 拖拽、缩放、旋转元素
- 配置插槽和约束规则
- 实时预览效果

### 3. 素材池管理 (`/asset-pools`)
- 创建和管理素材池
- 支持文本、图片、配色三种类型
- 批量导入和编辑

### 4. 批量生成 (`/batch`)
- 选择模板
- 映射插槽到素材池
- 设置生成参数和校验规则
- 下载批量生成的图片

---

## 🎯 核心功能

### 插槽配置
```typescript
// 文本插槽示例
{
  isSlot: true,
  slotId: "{{title}}",
  constraints: {
    text: {
      overflowStrategy: "AUTO_SHRINK", // 自动缩字
      minFontSize: 32,                 // 最小字号
      maxLines: 2,                     // 最大行数
      contrastRule: {
        minRatio: 4.5,                 // 对比度（WCAG AA）
        autoFix: "ADD_STROKE"          // 自动加描边
      }
    }
  }
}
```

### 批量生成
```typescript
// 批量任务配置
{
  templateId: "template_001",
  slotMappings: [
    { slotId: "{{title}}", poolId: "pool_titles", strategy: "random" },
    { slotId: "{{bg_image}}", poolId: "pool_backgrounds", strategy: "random" }
  ],
  count: 1000,                    // 生成数量
  seed: 12345,                    // 随机种子（可复现）
  validationRules: {
    enableContrastCheck: true,    // 启用对比度检查
    enableOverflowCheck: true,    // 启用溢出检查
    maxRetries: 3                 // 最大重试次数
  }
}
```

---

## 🏗️ 技术架构

### 前端
- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **画布**：Fabric.js（替代 Konva）
- **样式**：Tailwind CSS
- **组件**：shadcn/ui（基于 Radix UI）
- **图标**：Lucide Icons
- **状态**：Zustand

### 后端（TODO）
- **API**：Next.js API Routes
- **数据库**：Prisma + PostgreSQL
- **存储**：S3 / OSS / MinIO
- **渲染**：node-canvas + Fabric.js

---

## 📂 项目结构

```
src/
├── app/
│   ├── template-new/        # 模板库首页
│   ├── editor-new/[id]/     # 编辑器
│   ├── asset-pools/         # 素材池管理
│   └── batch/               # 批量生成
├── components/
│   ├── FabricCanvas.tsx     # Fabric.js 画布组件
│   ├── SlotConfigPanel.tsx  # 插槽配置面板
│   └── ui/                  # UI 组件库
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── tooltip.tsx
├── lib/
│   ├── utils.ts             # 工具函数
│   └── constraints/         # 约束校验逻辑
│       └── textValidator.ts
└── types/
    └── fabric.ts            # TypeScript 类型定义
```

---

## 🎨 UI 组件

### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="lg">
  点击按钮
</Button>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
</Card>
```

### Tooltip
```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>悬停我</TooltipTrigger>
    <TooltipContent>
      <p>提示内容</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 🔧 开发指南

### 添加新的 UI 组件
1. 在 `src/components/ui/` 创建组件文件
2. 使用 `cn()` 函数合并类名
3. 使用 `class-variance-authority` 定义变体

### 创建新页面
1. 在 `src/app/` 对应路径创建 `page.tsx`
2. 使用 `'use client'` 标记客户端组件
3. 导入所需的 UI 组件

### 添加约束规则
1. 在 `src/lib/constraints/` 创建新的校验器
2. 扩展 `LayerConstraints` 类型
3. 在 `LayerValidator.validateLayer()` 中集成

---

## 📚 文档

- [快速入门指南](./docs/QUICK_START.md) - 5 分钟上手新功能
- [项目改造总结](./docs/PROJECT_MAKEOVER_SUMMARY.md) - 了解所有改动
- [技术对比](./docs/KONVA_VS_FABRIC_COMPARISON.md) - Konva vs Fabric.js
- [完整规范](./docs/MASTER_SPEC.md) - 产品需求和技术方案

---

## 🎯 TODO

### 阶段 1：服务端批量渲染（预计 5-7 天）
- [ ] 安装 `canvas` 和相关依赖
- [ ] 实现 node-canvas + Fabric.js 渲染引擎
- [ ] 集成约束校验逻辑
- [ ] 实现 seed 随机（PRNG）
- [ ] 图片压缩到 1.5MB
- [ ] 上传到 S3 并打包 ZIP

### 阶段 2：数据库集成（预计 2-3 天）
- [ ] 创建 Prisma schema
- [ ] 实现 API Routes
- [ ] 模板 CRUD
- [ ] 素材池 CRUD
- [ ] 批量任务管理

### 阶段 3：高级功能（预计 3-5 天）
- [ ] 多页支持
- [ ] 模板变体（根据文案长度自动换模板）
- [ ] A/B 测试（多 seed 对比）
- [ ] 失败重试（换素材重新生成）

---

## 🐛 已知问题

- [ ] 编辑器快捷键未实现
- [ ] 撤销/重做功能未实现
- [ ] 图片上传功能未实现
- [ ] 服务端批量渲染未实现

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

MIT License

---

## 🎉 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Fabric.js](http://fabricjs.com/) - Canvas 库
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件
- [Radix UI](https://www.radix-ui.com/) - 无障碍组件
- [Lucide Icons](https://lucide.dev/) - 图标库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---

Made with ❤️ by [Your Name]

