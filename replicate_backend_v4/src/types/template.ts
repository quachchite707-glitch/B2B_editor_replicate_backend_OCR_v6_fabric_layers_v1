export type TemplateVersion = 'mvp-1'

export type TemplateLayerType = 'image' | 'rect' | 'text'

export type SlotType = 'text' | 'block'

export type TemplateLayerBase = {
  id: string
  type: TemplateLayerType
  slotId: string | null
  x: number
  y: number
  w: number
  h: number
  z: number
}

export type TemplateImageLayer = TemplateLayerBase & {
  type: 'image'
  src: string
}

export type TemplateRectLayer = TemplateLayerBase & {
  type: 'rect'
  fill: string
  rx?: number
  ry?: number
}

export type TemplateTextStyle = {
  fontSize: number
  fontWeight?: number | string
  fontFamily?: string
  fill: string
  align?: 'left' | 'center' | 'right'
  stroke?: string
  strokeWidth?: number
  shadow?: {
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}

export type TemplateTextLayer = TemplateLayerBase & {
  type: 'text'
  text: string
  style: TemplateTextStyle
}

export type TemplateLayer = TemplateImageLayer | TemplateRectLayer | TemplateTextLayer

export type TemplateSlot = {
  slotId: string
  slotType: SlotType
  poolId: string
}

export type TemplateJSON = {
  version: TemplateVersion
  canvas: { w: number; h: number }
  layers: TemplateLayer[]
  slots: TemplateSlot[]
  pools: Record<string, string[]>
}
