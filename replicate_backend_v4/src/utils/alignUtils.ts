/**
 * 对齐和分布工具
 */

import type { LayerDoc } from "../types";

export type AlignType =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export type DistributeType = "horizontal" | "vertical";

/**
 * 对齐图层
 */
export function alignLayers(
  layers: LayerDoc[],
  type: AlignType,
  canvasWidth: number,
  canvasHeight: number
): LayerDoc[] {
  if (layers.length === 0) return layers;

  // 计算参考值
  let referenceValue: number;

  switch (type) {
    case "left":
      referenceValue = Math.min(...layers.map((l) => l.x));
      return layers.map((l) => ({ ...l, x: referenceValue }));

    case "right":
      referenceValue = Math.max(...layers.map((l) => l.x + l.width));
      return layers.map((l) => ({ ...l, x: referenceValue - l.width }));

    case "center":
      // 居中到画布
      return layers.map((l) => ({ ...l, x: (canvasWidth - l.width) / 2 }));

    case "top":
      referenceValue = Math.min(...layers.map((l) => l.y));
      return layers.map((l) => ({ ...l, y: referenceValue }));

    case "bottom":
      referenceValue = Math.max(...layers.map((l) => l.y + l.height));
      return layers.map((l) => ({ ...l, y: referenceValue - l.height }));

    case "middle":
      // 垂直居中到画布
      return layers.map((l) => ({ ...l, y: (canvasHeight - l.height) / 2 }));

    default:
      return layers;
  }
}

/**
 * 分布图层
 */
export function distributeLayers(
  layers: LayerDoc[],
  type: DistributeType
): LayerDoc[] {
  if (layers.length < 3) return layers; // 至少需要 3 个元素才能分布

  const sorted = [...layers].sort((a, b) => {
    if (type === "horizontal") {
      return a.x - b.x;
    } else {
      return a.y - b.y;
    }
  });

  if (type === "horizontal") {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = last.x - (first.x + first.width);
    const gap = totalSpace / (sorted.length - 1);

    let currentX = first.x + first.width + gap;
    const distributed = sorted.map((layer, index) => {
      if (index === 0 || index === sorted.length - 1) {
        return layer;
      }
      const newLayer = { ...layer, x: currentX };
      currentX = currentX + layer.width + gap;
      return newLayer;
    });

    return distributed;
  } else {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = last.y - (first.y + first.height);
    const gap = totalSpace / (sorted.length - 1);

    let currentY = first.y + first.height + gap;
    const distributed = sorted.map((layer, index) => {
      if (index === 0 || index === sorted.length - 1) {
        return layer;
      }
      const newLayer = { ...layer, y: currentY };
      currentY = currentY + layer.height + gap;
      return newLayer;
    });

    return distributed;
  }
}

