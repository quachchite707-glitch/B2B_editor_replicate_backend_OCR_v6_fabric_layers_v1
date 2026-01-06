/**
 * 文本测量工具
 * 统一处理文本尺寸计算、换行逻辑等
 */

export type TextMeasureParams = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  lineHeight?: number;
  widthLimit?: number;
  maxWidth?: number;
};

export class TextMeasurer {
  private static canvasCache: HTMLCanvasElement | null = null;

  /**
   * 获取测量用的 canvas context
   */
  private static getContext(): CanvasRenderingContext2D | null {
    if (!this.canvasCache) {
      this.canvasCache = document.createElement("canvas");
    }
    return this.canvasCache.getContext("2d");
  }

  /**
   * 测量单行文本宽度
   */
  static measureLineWidth(
    text: string,
    fontFamily: string,
    fontSize: number,
    fontStyle: string
  ): number {
    const ctx = this.getContext();
    if (!ctx) return 0;

    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  }

  /**
   * 将文本按宽度限制换行
   */
  static wrapText(
    text: string,
    fontFamily: string,
    fontSize: number,
    fontStyle: string,
    widthLimit: number
  ): string[] {
    const ctx = this.getContext();
    if (!ctx) return [text];

    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;

    const paragraphs = text.split("\n");
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push("");
        continue;
      }

      let currentLine = "";
      const chars = Array.from(paragraph);

      for (const char of chars) {
        const testLine = currentLine + char;
        const width = ctx.measureText(testLine).width;

        if (width <= widthLimit || currentLine.length === 0) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = char;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  /**
   * 测量文本框尺寸（支持 auto/fixed 两种模式）
   */
  static measureTextBox(params: TextMeasureParams): {
    width: number;
    height: number;
  } {
    const {
      text,
      fontFamily,
      fontSize,
      fontStyle,
      widthLimit,
      lineHeight = 1.2,
      maxWidth = 2000,
    } = params;

    const ctx = this.getContext();
    if (!ctx) {
      return { width: 200, height: Math.max(10, fontSize * lineHeight) };
    }

    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    const paragraphs = (text || "").split("\n");

    // fixed 模式：宽度固定，按宽度换行
    if (widthLimit !== undefined) {
      const limit = Math.max(1, widthLimit);
      const lines = this.wrapText(text, fontFamily, fontSize, fontStyle, limit);
      const h = Math.ceil(lines.length * fontSize * lineHeight);
      return {
        width: Math.max(1, Math.ceil(widthLimit)),
        height: Math.max(1, h),
      };
    }

    // auto 模式：先测单行最大宽，超过 maxWidth 则自动换行
    const lineWidths = paragraphs.map((p) =>
      p ? ctx.measureText(p).width : 0
    );
    const rawMaxWidth = Math.max(1, ...lineWidths);
    const needWrap = rawMaxWidth > maxWidth;

    if (needWrap) {
      const lines = this.wrapText(
        text,
        fontFamily,
        fontSize,
        fontStyle,
        maxWidth
      );
      const h = Math.ceil(lines.length * fontSize * lineHeight);
      return {
        width: Math.max(10, Math.ceil(maxWidth)),
        height: Math.max(10, h),
      };
    }

    const w = Math.ceil(rawMaxWidth);
    const h = Math.ceil(paragraphs.length * fontSize * lineHeight);
    return {
      width: Math.max(10, w),
      height: Math.max(10, h),
    };
  }

  /**
   * 测量单个字符的最大宽度（用于最小宽度限制）
   */
  static measureMaxCharWidth(
    text: string,
    fontFamily: string,
    fontSize: number,
    fontStyle: string
  ): number {
    const ctx = this.getContext();
    if (!ctx) return fontSize * 0.9;

    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    const chars = Array.from(text.replace(/\n/g, ""));
    const sample = chars.length ? chars : ["国"];

    let maxW = 0;
    for (const ch of sample) {
      const w = ctx.measureText(ch).width;
      if (Number.isFinite(w) && w > maxW) maxW = w;
    }

    return maxW > 0 ? Math.ceil(maxW) : Math.ceil(fontSize * 0.9);
  }
}

