/**
 * 图片处理工具类
 * 统一处理图片加载、渲染、fit 计算等逻辑
 */

export class ImageRenderer {
  /**
   * 加载图片（带 CORS 支持）
   */
  static async load(url: string): Promise<HTMLImageElement | null> {
    if (!url) return null;
    
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load image: ${url}`);
        resolve(null);
      };
      img.src = url;
    });
  }

  /**
   * 批量加载图片
   */
  static async loadBatch(urls: string[]): Promise<(HTMLImageElement | null)[]> {
    return Promise.all(urls.map((url) => this.load(url)));
  }

  /**
   * 创建 canvas
   */
  static createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  /**
   * 计算 fit (cover/contain) 的渲染参数
   */
  static calculateFit(
    imageWidth: number,
    imageHeight: number,
    boxWidth: number,
    boxHeight: number,
    fit: "cover" | "contain"
  ): {
    scale: number;
    drawWidth: number;
    drawHeight: number;
    offsetX: number;
    offsetY: number;
  } {
    const scale =
      fit === "cover"
        ? Math.max(boxWidth / imageWidth, boxHeight / imageHeight)
        : Math.min(boxWidth / imageWidth, boxHeight / imageHeight);

    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const offsetX = (boxWidth - drawWidth) / 2;
    const offsetY = (boxHeight - drawHeight) / 2;

    return { scale, drawWidth, drawHeight, offsetX, offsetY };
  }

  /**
   * 在 canvas 上绘制带 fit 的图片
   */
  static drawFit(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    fit: "cover" | "contain"
  ): void {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;

    if (!iw || !ih) return;

    const { drawWidth, drawHeight, offsetX, offsetY } = this.calculateFit(
      iw,
      ih,
      width,
      height,
      fit
    );

    ctx.clearRect(x, y, width, height);
    ctx.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);
  }

  /**
   * 将图片渲染到新的 canvas（用于 contain/cover 预处理）
   */
  static renderToCanvas(
    image: HTMLImageElement,
    width: number,
    height: number,
    fit: "cover" | "contain"
  ): HTMLCanvasElement {
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      this.drawFit(ctx, image, 0, 0, width, height, fit);
    }
    
    return canvas;
  }

  /**
   * 将 data URL 转换为 Blob
   */
  static dataURLToBlob(dataURL: string): Blob | null {
    try {
      const arr = dataURL.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("Failed to convert dataURL to Blob:", e);
      return null;
    }
  }

  /**
   * 获取 Blob 大小（MB）
   */
  static getBlobSizeMB(blob: Blob): number {
    return blob.size / (1024 * 1024);
  }
}

