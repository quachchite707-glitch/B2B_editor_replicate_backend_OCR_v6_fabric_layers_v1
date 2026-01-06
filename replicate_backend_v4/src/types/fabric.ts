// Fabric.js 扩展类型定义

export type LayerType = 'TEXT' | 'IMAGE' | 'SHAPE' | 'QR' | 'BG_IMAGE'

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'line'

export type OverflowStrategy = 'AUTO_SHRINK' | 'TRUNCATE' | 'SWITCH_TEMPLATE'

export type FitMode = 'contain' | 'cover' | 'fill' | 'smart'

export type AutoFixStrategy = 'ADD_STROKE' | 'ADD_BACKGROUND_BAR' | 'SWITCH_COLOR'

/**
 * 文本约束配置
 */
export interface TextConstraints {
  overflowStrategy?: OverflowStrategy
  minFontSize?: number
  maxLines?: number
  contrastRule?: {
    minRatio: number // WCAG AA 标准: 4.5
    autoFix: AutoFixStrategy
    strokeColor?: string
    strokeWidth?: number
  }
}

/**
 * 图片约束配置
 */
export interface ImageConstraints {
  fitMode?: FitMode
  allowedRatios?: Array<{
    min: number
    max: number
  }>
}

/**
 * 图层约束（插槽配置）
 */
export interface LayerConstraints {
  text?: TextConstraints
  image?: ImageConstraints
}

/**
 * 图层文档（扩展了插槽支持）
 */
export interface LayerDoc {
  id: string
  type: LayerType
  
  // 基础属性
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity?: number
  scaleX?: number
  scaleY?: number
  
  // 图层管理
  locked?: boolean
  hidden?: boolean
  name?: string
  zIndex?: number
  
  // 🆕 插槽系统
  isSlot?: boolean // 是否是插槽
  slotId?: string // 插槽ID，如 "{{title}}"
  constraints?: LayerConstraints // 批量生成约束
  
  // 类型特定数据
  data?: {
    // TEXT
    text?: string
    placeholder?: string
    
    // IMAGE / BG_IMAGE
    assetId?: string
    imageUrl?: string
    fit?: 'cover' | 'contain'
    
    // SHAPE
    shapeType?: ShapeType
    
    // QR
    value?: string
  }
  
  // 样式
  style?: {
    // TEXT 样式
    fontFamily?: string
    fontSize?: number
    fontWeight?: string | number
    fill?: string
    stroke?: string
    strokeWidth?: number
    textAlign?: string
    lineHeight?: number
    letterSpacing?: number
    shadow?: {
      color: string
      blur: number
      offsetX: number
      offsetY: number
    }
    
    // SHAPE 样式
    radius?: number
    
    // 通用样式
    backgroundColor?: string
  }
}

/**
 * 字体层级配置
 */
export interface FontHierarchy {
  level: number
  fontSize: [number, number] // [min, max]
  fontWeight: string
  slotIds: string[]
}

/**
 * 配色方案
 */
export interface ColorScheme {
  name: string
  primary: string
  secondary: string
  accent?: string
}

/**
 * 样式模式配置（一致性规则）
 */
export interface StyleSchemaConfig {
  fontHierarchy: FontHierarchy[]
  colorPalette: {
    mode: 'COORDINATED' | 'RANDOM'
    schemes: ColorScheme[]
  }
}

/**
 * 页面文档
 */
export interface PageDoc {
  id: string
  width: number
  height: number
  layers: LayerDoc[]
  backgroundColor?: string
}

/**
 * 项目文档
 */
export interface ProjectDoc {
  id: string
  name: string
  preset: 'VERTICAL_9_16' | 'SQUARE_1_1' | 'HORIZONTAL_16_9'
  pages: PageDoc[]
  styleSchema?: StyleSchemaConfig // 🆕 一致性规则
  createdAt: string
  updatedAt: string
}

/**
 * 素材池类型
 */
export type AssetPoolType = 'TEXT' | 'IMAGE' | 'COLOR_SCHEME'

/**
 * 素材池
 */
export interface AssetPool {
  id: string
  name: string
  type: AssetPoolType
  items: any[] // TEXT: string[], IMAGE: ImageItem[], COLOR_SCHEME: ColorScheme[]
  createdAt: string
}

/**
 * 图片素材项
 */
export interface ImageItem {
  assetId: string
  url: string
  ratio: number // 宽高比
  width: number
  height: number
}

/**
 * 插槽映射配置
 */
export interface SlotMapping {
  slotId: string
  poolId: string
  strategy: 'random' | 'sequential'
}

/**
 * 批量任务配置
 */
export interface BatchJobConfig {
  templateId: string
  slotMappings: SlotMapping[]
  count: number // 生成数量
  seed?: number // 随机种子（可复现）
  validationRules: {
    enableContrastCheck: boolean
    enableOverflowCheck: boolean
    maxRetries: number
  }
}

/**
 * 批量任务
 */
export interface BatchJob {
  id: string
  templateId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  config: BatchJobConfig
  validationStats?: {
    total: number
    success: number
    failed: number
    failureReasons: Record<string, number>
  }
  resultZipUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
}

