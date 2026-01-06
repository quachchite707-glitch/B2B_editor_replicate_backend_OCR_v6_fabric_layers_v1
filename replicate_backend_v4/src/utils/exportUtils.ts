/**
 * 导出工具
 * 处理 PNG/JPEG 导出、质量压缩、1.5MB 限制等
 */

import Konva from "konva";
import type { LayerDoc, PageDoc } from "../types";
import { ImageRenderer } from "./imageUtils";

export type ExportFormat = "png" | "jpeg";

export type ExportOptions = {
  format: ExportFormat;
  pixelRatio: 1 | 2;
  quality?: number; // 0-1, for JPEG
  maxSizeMB?: number; // 默认 1.5MB
};

export class ExportManager {
  /**
   * 导出单页为图片
   */
  static async exportPage(
    page: PageDoc,
    options: ExportOptions
  ): Promise<string | null> {
    const { format, pixelRatio, quality = 0.92, maxSizeMB = 1.5 } = options;

    try {
      // 创建离屏容器
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-100000px";
      container.style.top = "0";
      container.style.width = `${page.width}px`;
      container.style.height = `${page.height}px`;
      document.body.appendChild(container);

      // 创建离屏 Stage
      const stage = new Konva.Stage({
        container,
        width: page.width,
        height: page.height,
      });

      const layer = new Konva.Layer();
      stage.add(layer);

      // 按层级顺序渲染
      await this.renderLayers(page.layers, layer);

      layer.draw();

      // 导出
      let dataURL: string;
      const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";

      if (format === "jpeg") {
        dataURL = stage.toDataURL({
          mimeType,
          quality,
          pixelRatio,
        });
      } else {
        dataURL = stage.toDataURL({
          mimeType: "image/png",
          pixelRatio,
        });
      }

      // 检查文件大小
      const blob = ImageRenderer.dataURLToBlob(dataURL);
      if (blob) {
        const sizeMB = ImageRenderer.getBlobSizeMB(blob);

        // 如果超过限制且是 JPEG，尝试降低质量
        if (format === "jpeg" && sizeMB > maxSizeMB && quality > 0.3) {
          console.log(
            `Export size ${sizeMB.toFixed(2)}MB exceeds ${maxSizeMB}MB, reducing quality...`
          );
          stage.destroy();
          container.remove();

          // 递归降低质量
          return this.exportPage(page, {
            ...options,
            quality: quality * 0.85,
          });
        }

        console.log(
          `Exported as ${format.toUpperCase()}: ${sizeMB.toFixed(2)}MB`
        );
      }

      // 清理
      stage.destroy();
      container.remove();

      return dataURL;
    } catch (error) {
      console.error("Export failed:", error);
      return null;
    }
  }

  /**
   * 渲染图层到 Konva Layer
   */
  private static async renderLayers(
    layers: LayerDoc[],
    konvaLayer: Konva.Layer
  ): Promise<void> {
    for (const l of layers) {
      if (l.hidden || (l.opacity ?? 1) <= 0.001) continue;

      if (l.type === "BG_IMAGE" || l.type === "IMAGE") {
        await this.renderImageLayer(l, konvaLayer);
      } else if (l.type === "TEXT") {
        this.renderTextLayer(l, konvaLayer);
      } else if (l.type === "SHAPE") {
        this.renderShapeLayer(l, konvaLayer);
      } else if (l.type === "QR") {
        await this.renderQRLayer(l, konvaLayer);
      }
    }
  }

  /**
   * 渲染图片图层
   */
  private static async renderImageLayer(
    layer: LayerDoc,
    konvaLayer: Konva.Layer
  ): Promise<void> {
    const url = layer.data?.assetUrl;
    if (!url) return;

    const imgEl = await ImageRenderer.load(url);
    if (!imgEl) return;

    const fit = layer.data?.fit ?? "contain";
    const canvas = ImageRenderer.renderToCanvas(
      imgEl,
      layer.width,
      layer.height,
      fit
    );

    konvaLayer.add(
      new Konva.Image({
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        rotation: layer.rotation ?? 0,
        image: canvas,
        opacity: layer.opacity ?? 1,
      })
    );
  }

  /**
   * 渲染文本图层
   */
  private static renderTextLayer(
    layer: LayerDoc,
    konvaLayer: Konva.Layer
  ): void {
    konvaLayer.add(
      new Konva.Text({
        x: layer.x,
        y: layer.y,
        width: layer.width,
        rotation: layer.rotation ?? 0,
        text: layer.data?.text ?? "",
        fontFamily: layer.style?.fontFamily ?? "Inter",
        fontSize: layer.style?.fontSize ?? 48,
        fontStyle: (layer.style?.fontWeight ?? 500) >= 700 ? "bold" : "normal",
        fill: layer.style?.fill ?? "#111827",
        align: layer.style?.align ?? "left",
        lineHeight: 1.2,
        wrap: "word",
        opacity: layer.opacity ?? 1,
      })
    );
  }

  /**
   * 渲染形状图层
   */
  private static renderShapeLayer(
    layer: LayerDoc,
    konvaLayer: Konva.Layer
  ): void {
    const shapeType = layer.data?.shapeType ?? "rect";
    const fill = layer.style?.fill ?? "#3b82f6";
    const stroke = layer.style?.stroke ?? "";
    const strokeWidth = layer.style?.strokeWidth ?? 0;

    if (shapeType === "rect") {
      konvaLayer.add(
        new Konva.Rect({
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation ?? 0,
          fill,
          stroke,
          strokeWidth,
          cornerRadius: layer.style?.radius ?? 0,
          opacity: layer.opacity ?? 1,
        })
      );
    } else if (shapeType === "circle") {
      const radius = Math.min(layer.width, layer.height) / 2;
      konvaLayer.add(
        new Konva.Circle({
          x: layer.x + layer.width / 2,
          y: layer.y + layer.height / 2,
          radius,
          rotation: layer.rotation ?? 0,
          fill,
          stroke,
          strokeWidth,
          opacity: layer.opacity ?? 1,
        })
      );
    }
  }

  /**
   * 渲染二维码图层
   */
  private static async renderQRLayer(
    layer: LayerDoc,
    konvaLayer: Konva.Layer
  ): Promise<void> {
    // 二维码图层暂时用文本表示，后续可以接 QRCode 库
    konvaLayer.add(
      new Konva.Text({
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        text: "QR: " + (layer.data?.qrValue ?? ""),
        fontFamily: "monospace",
        fontSize: 16,
        fill: "#000",
        align: "center",
        verticalAlign: "middle",
        opacity: layer.opacity ?? 1,
      })
    );
  }

  /**
   * 下载文件
   */
  static downloadDataURL(
    dataURL: string,
    filename: string = "export.png"
  ): void {
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    a.click();
  }
}

