import { nanoid } from "nanoid";
import type { PageDoc, TemplateDoc } from "../types";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;

const defaultPage: PageDoc = {
  id: "page-1",
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  layers: [
    {
      id: "bg",
      name: "背景",
      type: "BG_IMAGE",
      x: 0,
      y: 0,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      rotation: 0,
      opacity: 1,
      locked: true,
      hidden: false,
      data: {
        assetUrl:
          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1200&auto=format&fit=crop",
        fit: "cover",
      },
    },
    {
      id: "headline",
      name: "主标题",
      type: "TEXT",
      x: 120,
      y: 240,
      width: 840,
      height: 200,
      rotation: 0,
      opacity: 1,
      data: { text: "让你的产品一眼吸睛" },
      style: {
        fontSize: 72,
        fontWeight: 700,
        fill: "#111827",
        align: "left",
        fontFamily: "Inter, sans-serif",
      },
    },
    {
      id: "subtitle",
      name: "副标题",
      type: "TEXT",
      x: 120,
      y: 420,
      width: 760,
      height: 160,
      rotation: 0,
      opacity: 0.9,
      data: { text: "拖拽、缩放、旋转文字，右侧面板可调整样式" },
      style: {
        fontSize: 42,
        fontWeight: 500,
        fill: "#374151",
        align: "left",
        fontFamily: "Inter, sans-serif",
      },
    },
  ],
};

export const templates: TemplateDoc[] = [
  {
    id: "tpl-1",
    name: "竖版海报",
    description: "1080x1920 背景 + 2 文本层",
    coverUrl:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&auto=format&fit=crop",
    defaultPage: defaultPage,
  },
];

export const createProjectFromTemplate = (templateId: string) => {
  const tpl = templates.find((t) => t.id === templateId) ?? templates[0];
  const projectId = nanoid(8);

  const pageCopy: PageDoc = {
    ...tpl.defaultPage,
    id: `page-${projectId}`,
    layers: tpl.defaultPage.layers.map((l) => ({
      ...l,
      id: `${l.id}-${projectId}-${nanoid(4)}`,
    })),
  };

  return {
    id: projectId,
    name: `项目-${projectId}`,
    preset: "VERTICAL_9_16" as const,
    pages: [pageCopy],
  };
};

