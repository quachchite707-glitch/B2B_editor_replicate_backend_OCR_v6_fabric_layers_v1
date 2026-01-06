import { fabric } from 'fabric'
import { TextConstraints } from '@/types/fabric'
import { getContrastRatio } from '../utils'

/**
 * 文本溢出检查和处理
 */
export class TextOverflowHandler {
  /**
   * 检查文本是否溢出
   */
  static isOverflowing(
    text: fabric.Textbox,
    maxWidth: number,
    maxHeight: number
  ): boolean {
    return text.width! > maxWidth || text.height! > maxHeight
  }

  /**
   * 自动缩字策略
   */
  static async autoShrink(
    text: fabric.Textbox,
    constraints: TextConstraints,
    maxWidth: number,
    maxHeight: number
  ): Promise<boolean> {
    const minFontSize = constraints.minFontSize || 12
    const currentFontSize = text.fontSize || 16

    // 逐步缩小字号
    for (let fontSize = currentFontSize; fontSize >= minFontSize; fontSize -= 2) {
      text.set('fontSize', fontSize)
      text.setCoords()

      // 检查是否适配
      if (!this.isOverflowing(text, maxWidth, maxHeight)) {
        return true // 成功适配
      }
    }

    return false // 缩到最小字号仍溢出
  }

  /**
   * 截断策略
   */
  static truncate(
    text: fabric.Textbox,
    constraints: TextConstraints
  ): void {
    const maxLines = constraints.maxLines || 3
    const lines = text.text?.split('\n') || []

    if (lines.length > maxLines) {
      const truncated = lines.slice(0, maxLines).join('\n') + '...'
      text.set('text', truncated)
    }
  }

  /**
   * 应用文本约束
   */
  static async apply(
    text: fabric.Textbox,
    constraints: TextConstraints,
    maxWidth: number,
    maxHeight: number
  ): Promise<{
    success: boolean
    reason?: string
  }> {
    const strategy = constraints.overflowStrategy || 'AUTO_SHRINK'

    switch (strategy) {
      case 'AUTO_SHRINK':
        const shrinkSuccess = await this.autoShrink(text, constraints, maxWidth, maxHeight)
        if (!shrinkSuccess) {
          return {
            success: false,
            reason: `文本缩到最小字号 ${constraints.minFontSize}px 仍溢出`
          }
        }
        return { success: true }

      case 'TRUNCATE':
        this.truncate(text, constraints)
        return { success: true }

      case 'SWITCH_TEMPLATE':
        // TODO: 实现模板切换逻辑
        return { success: true }

      default:
        return { success: true }
    }
  }
}

/**
 * 对比度检查器
 */
export class ContrastChecker {
  /**
   * 检查文本和背景的对比度
   */
  static check(
    textColor: string,
    backgroundColor: string,
    minRatio: number = 4.5
  ): {
    passed: boolean
    ratio: number
  } {
    const ratio = getContrastRatio(textColor, backgroundColor)
    return {
      passed: ratio >= minRatio,
      ratio
    }
  }

  /**
   * 自动修复对比度
   */
  static autoFix(
    text: fabric.Textbox,
    backgroundColor: string,
    autoFixStrategy: 'ADD_STROKE' | 'ADD_BACKGROUND_BAR' | 'SWITCH_COLOR'
  ): void {
    switch (autoFixStrategy) {
      case 'ADD_STROKE':
        // 添加描边
        text.set({
          stroke: '#000000',
          strokeWidth: 2,
        })
        break

      case 'ADD_BACKGROUND_BAR':
        // TODO: 添加半透明底色条（需要创建额外的矩形对象）
        break

      case 'SWITCH_COLOR':
        // 切换为高对比度颜色
        const currentColor = text.fill as string
        const isDark = this.isDarkColor(backgroundColor)
        text.set('fill', isDark ? '#FFFFFF' : '#000000')
        break
    }
  }

  /**
   * 判断是否是深色
   */
  private static isDarkColor(hex: string): boolean {
    const rgb = parseInt(hex.slice(1), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = rgb & 0xff
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma < 128
  }

  /**
   * 应用对比度约束
   */
  static apply(
    text: fabric.Textbox,
    backgroundColor: string,
    constraints: TextConstraints
  ): {
    success: boolean
    ratio?: number
    fixed?: boolean
  } {
    if (!constraints.contrastRule) {
      return { success: true }
    }

    const textColor = text.fill as string
    const { passed, ratio } = this.check(
      textColor,
      backgroundColor,
      constraints.contrastRule.minRatio
    )

    if (!passed) {
      // 尝试自动修复
      this.autoFix(text, backgroundColor, constraints.contrastRule.autoFix)
      return {
        success: true,
        ratio,
        fixed: true
      }
    }

    return { success: true, ratio }
  }
}

/**
 * 字体层级校验器
 */
export class FontHierarchyValidator {
  /**
   * 校验字体层级是否符合约束
   */
  static validate(
    layers: Array<{
      slotId: string
      fontSize: number
      level?: number
    }>,
    hierarchy: Array<{
      level: number
      fontSize: [number, number]
      slotIds: string[]
    }>
  ): {
    passed: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // 检查每个层级的字号范围
    for (const rule of hierarchy) {
      const [minSize, maxSize] = rule.fontSize
      const layersInLevel = layers.filter(l => rule.slotIds.includes(l.slotId))

      for (const layer of layersInLevel) {
        if (layer.fontSize < minSize || layer.fontSize > maxSize) {
          violations.push(
            `插槽 ${layer.slotId} 的字号 ${layer.fontSize}px 不在 level ${rule.level} 的范围 [${minSize}, ${maxSize}] 内`
          )
        }
      }
    }

    // 检查层级之间的关系（level1 > level2 > level3）
    const levelMap = new Map<number, number[]>()
    for (const layer of layers) {
      const level = hierarchy.find(h => h.slotIds.includes(layer.slotId))?.level
      if (level !== undefined) {
        if (!levelMap.has(level)) {
          levelMap.set(level, [])
        }
        levelMap.get(level)!.push(layer.fontSize)
      }
    }

    const levels = Array.from(levelMap.keys()).sort()
    for (let i = 0; i < levels.length - 1; i++) {
      const currentLevel = levels[i]
      const nextLevel = levels[i + 1]
      const currentMax = Math.max(...levelMap.get(currentLevel)!)
      const nextMin = Math.min(...levelMap.get(nextLevel)!)

      if (currentMax <= nextMin) {
        violations.push(
          `level ${currentLevel} 的最大字号 ${currentMax}px 应该大于 level ${nextLevel} 的最小字号 ${nextMin}px`
        )
      }
    }

    return {
      passed: violations.length === 0,
      violations
    }
  }
}

/**
 * 综合校验器
 */
export class LayerValidator {
  /**
   * 校验单个图层
   */
  static async validateLayer(
    object: fabric.Object,
    constraints: TextConstraints | undefined,
    backgroundColor: string,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<{
    success: boolean
    reason?: string
    warnings?: string[]
  }> {
    if (!constraints) {
      return { success: true }
    }

    const warnings: string[] = []

    if (object.type === 'textbox') {
      const text = object as fabric.Textbox

      // 1. 检查溢出
      const overflowResult = await TextOverflowHandler.apply(
        text,
        constraints,
        canvasWidth,
        canvasHeight
      )

      if (!overflowResult.success) {
        return overflowResult
      }

      // 2. 检查对比度
      const contrastResult = ContrastChecker.apply(
        text,
        backgroundColor,
        constraints
      )

      if (contrastResult.fixed) {
        warnings.push('对比度不足，已自动添加描边')
      }
    }

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * 批量校验所有图层
   */
  static async validateAll(
    canvas: fabric.Canvas,
    layers: Array<{
      object: fabric.Object
      constraints?: TextConstraints
    }>,
    backgroundColor: string
  ): Promise<{
    success: boolean
    failed: number
    reasons: Record<string, number>
    warnings: string[]
  }> {
    const reasons: Record<string, number> = {}
    const warnings: string[] = []
    let failed = 0

    for (const layer of layers) {
      const result = await this.validateLayer(
        layer.object,
        layer.constraints,
        backgroundColor,
        canvas.width!,
        canvas.height!
      )

      if (!result.success) {
        failed++
        const reason = result.reason || 'unknown_error'
        reasons[reason] = (reasons[reason] || 0) + 1
      }

      if (result.warnings) {
        warnings.push(...result.warnings)
      }
    }

    return {
      success: failed === 0,
      failed,
      reasons,
      warnings
    }
  }
}

