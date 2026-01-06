import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { templates, createProjectFromTemplate } from "../lib/mockData";
import { nanoid } from "nanoid";
import type { LayerDoc, ProjectDoc } from "../types";
import type { TextPresetKey } from "../types";
import { alignLayers, distributeLayers, type AlignType, type DistributeType } from "../utils/alignUtils";

type EditorState = {
  templates: typeof templates;
  projects: Record<string, ProjectDoc>;
  currentProjectId?: string;
  currentPageIndex: number;
  selectedLayerId?: string;
  createProject: (templateId: string) => string;
  setCurrentProject: (projectId: string) => void;
  selectLayer: (layerId?: string) => void;
  setPageSize: (args: { width: number; height: number }) => void;
  updateLayer: (
    layerId: string,
    updater: (layer: LayerDoc) => LayerDoc
  ) => void;
  reorderLayers: (from: number, to: number) => void;
  toggleLayerHidden: (layerId: string) => void;
  toggleLayerLocked: (layerId: string) => void;
  updateTextStyle: (
    layerId: string,
    style: Partial<NonNullable<LayerDoc["style"]>>
  ) => void;
  addTextLayer: (preset: TextPresetKey) => void;
  addImageLayer: (assetUrl: string) => void;
  addShapeLayer: (shapeType: "rect" | "circle") => void;
  addQRLayer: (qrValue: string) => void;
  setBackgroundAssetUrl: (assetUrl: string) => void;
  deleteLayer: (layerId: string) => void;
  // 多页管理
  addPage: () => void;
  deletePage: (pageIndex: number) => void;
  duplicatePage: (pageIndex: number) => void;
  setCurrentPage: (pageIndex: number) => void;
  // 对齐和分布
  alignSelectedLayer: (type: AlignType) => void;
  distributeSelectedLayers: (type: DistributeType) => void;
};

const findLayerIndex = (project: ProjectDoc, pageIndex: number, layerId: string) => {
  const page = project.pages[pageIndex];
  return page?.layers.findIndex((l) => l.id === layerId) ?? -1;
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      templates,
      projects: {},
      currentProjectId: undefined,
      currentPageIndex: 0,
      selectedLayerId: undefined,
      createProject: (templateId: string) => {
        const project = createProjectFromTemplate(templateId);
        set((state) => ({
          projects: { ...state.projects, [project.id]: project },
          currentProjectId: project.id,
          selectedLayerId: undefined,
          currentPageIndex: 0,
        }));
        return project.id;
      },
      setCurrentProject: (projectId: string) => {
        set({ currentProjectId: projectId, selectedLayerId: undefined });
      },
      selectLayer: (layerId) => set({ selectedLayerId: layerId }),
      setPageSize: ({ width, height }) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];
        if (!page) return;

        const nextW = Math.max(10, Math.round(width));
        const nextH = Math.max(10, Math.round(height));

        // 同步背景层尺寸（背景语义：始终铺满画布）
        const nextLayers = page.layers.map((l) => {
          if (l.type !== "BG_IMAGE") return l;
          return {
            ...l,
            x: 0,
            y: 0,
            width: nextW,
            height: nextH,
          };
        });

        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, width: nextW, height: nextH, layers: nextLayers };
        const newProject: ProjectDoc = {
          ...project,
          pages: newPages,
        };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
        }));
      },
      updateLayer: (layerId, updater) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];
        const idx = page.layers.findIndex((l) => l.id === layerId);
        if (idx === -1) return;
        const updatedLayer = updater(page.layers[idx]);
        const newLayers = [...page.layers];
        newLayers[idx] = updatedLayer;
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers: newLayers };
        const newProject: ProjectDoc = {
          ...project,
          pages: newPages,
        };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
        }));
      },
      reorderLayers: (from, to) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];
        const layers = [...page.layers];
        const [moved] = layers.splice(from, 1);
        layers.splice(to, 0, moved);
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = {
          ...project,
          pages: newPages,
        };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
        }));
      },
      toggleLayerHidden: (layerId) => {
        get().updateLayer(layerId, (layer) => ({
          ...layer,
          hidden: !layer.hidden,
        }));
      },
      toggleLayerLocked: (layerId) => {
        get().updateLayer(layerId, (layer) => ({
          ...layer,
          locked: !layer.locked,
        }));
      },
      updateTextStyle: (layerId, style) => {
        get().updateLayer(layerId, (layer) => {
          const nextStyle = { ...layer.style, ...style };

          // 治本：当通过属性面板调整字号时，确保文本框至少能容纳一行，避免编辑态 textarea 首次输入被裁切
          if (layer.type === "TEXT") {
            const nextFontSize = nextStyle.fontSize ?? layer.style?.fontSize ?? 48;
            const minOneLineH = Math.ceil(nextFontSize * 1.2) + 16; // lineHeight=1.2 + 上下留白
            const nextHeight = Math.max(layer.height ?? 0, minOneLineH, 10);
            return { ...layer, style: nextStyle, height: nextHeight };
          }

          return { ...layer, style: nextStyle };
        });
      },
      addTextLayer: (preset) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];

        const baseX = 120;
        const id = `text-${preset}-${nanoid(6)}`;
        const fontSize =
          preset === "headline"
            ? 72
            : preset === "subtitle"
            ? 40
            : preset === "contact"
            ? 34
            : 36;
        // 治本：文本层初始 height 不能写死 80，否则大字号（如 72）进入编辑态时第一下输入会被裁切
        const initialHeight = Math.max(40, Math.ceil(fontSize * 1.2) + 16);
        const common: LayerDoc = {
          id,
          type: "TEXT",
          name:
            preset === "headline"
              ? "主标题"
              : preset === "subtitle"
              ? "副标题"
              : preset === "benefit1"
              ? "卖点 1"
              : preset === "benefit2"
              ? "卖点 2"
              : "联系方式",
          x: baseX,
          y:
            preset === "headline"
              ? 220
              : preset === "subtitle"
              ? 360
              : preset === "benefit1"
              ? 520
              : preset === "benefit2"
              ? 620
              : 1680,
          width: preset === "contact" ? 840 : 840,
          height: initialHeight,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          data: {
            text:
              preset === "headline"
                ? "主标题（可替换）"
                : preset === "subtitle"
                ? "副标题（可替换）"
                : preset === "benefit1"
                ? "卖点 1：填写优势"
                : preset === "benefit2"
                ? "卖点 2：填写优势"
                : "联系方式：139-0000-0000",
            textAutoSize: "auto",
          },
          style: {
            fontSize,
            fontWeight: preset === "headline" ? 700 : 500,
            fill: preset === "contact" ? "#111827" : "#111827",
            align: "left",
            fontFamily: "Inter, sans-serif",
          },
        };

        const layers = [...page.layers, common];
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          selectedLayerId: id,
        }));
      },
      addImageLayer: (assetUrl) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];

        const id = `img-${nanoid(8)}`;
        const layer: LayerDoc = {
          id,
          type: "IMAGE",
          name: "图片",
          x: 240,
          y: 700,
          width: 600,
          height: 600,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          data: { assetUrl, fit: "contain", imageAutoFit: true },
        };

        const layers = [...page.layers, layer];
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          selectedLayerId: id,
        }));
      },
      setBackgroundAssetUrl: (assetUrl) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];
        const idx = page.layers.findIndex((l) => l.type === "BG_IMAGE");
        if (idx === -1) return;
        const prev = page.layers[idx];
        const next: LayerDoc = {
          ...prev,
          data: { ...(prev.data ?? {}), assetUrl, fit: prev.data?.fit ?? "cover" },
        };
        const layers = [...page.layers];
        layers[idx] = next;
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
        }));
      },
      deleteLayer: (layerId) => {
        const { currentProjectId, projects, selectedLayerId } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[get().currentPageIndex];
        const idx = page.layers.findIndex((l) => l.id === layerId);
        if (idx === -1) return;
        // 背景层不允许删除（只允许隐藏/替换/透明）
        if (page.layers[idx].type === "BG_IMAGE") return;
        const layers = page.layers.filter((l) => l.id !== layerId);
        const newPages = [...project.pages];
        newPages[get().currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          selectedLayerId: selectedLayerId === layerId ? undefined : selectedLayerId,
        }));
      },
      addShapeLayer: (shapeType) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];

        const id = `shape-${nanoid(8)}`;
        const layer: LayerDoc = {
          id,
          type: "SHAPE",
          name: shapeType === "circle" ? "圆形" : "矩形",
          x: 300,
          y: 500,
          width: shapeType === "circle" ? 200 : 300,
          height: shapeType === "circle" ? 200 : 200,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          data: { shapeType },
          style: {
            fill: "#3b82f6",
            stroke: "#1e40af",
            strokeWidth: 2,
            radius: shapeType === "rect" ? 8 : 0,
          },
        };

        const layers = [...page.layers, layer];
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          selectedLayerId: id,
        }));
      },
      addQRLayer: (qrValue) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];

        const id = `qr-${nanoid(8)}`;
        const layer: LayerDoc = {
          id,
          type: "QR",
          name: "二维码",
          x: 800,
          y: 1600,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          data: { qrValue },
        };

        const layers = [...page.layers, layer];
        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          selectedLayerId: id,
        }));
      },
      addPage: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;

        const newPage: PageDoc = {
          id: `page-${nanoid(8)}`,
          width: project.pages[0].width,
          height: project.pages[0].height,
          layers: [
            {
              id: `bg-${nanoid(8)}`,
              name: "背景",
              type: "BG_IMAGE",
              x: 0,
              y: 0,
              width: project.pages[0].width,
              height: project.pages[0].height,
              rotation: 0,
              opacity: 1,
              locked: true,
              hidden: false,
              data: {
                assetUrl: project.pages[0].layers[0]?.data?.assetUrl ?? "",
                fit: "cover",
              },
            },
          ],
        };

        const newProject: ProjectDoc = {
          ...project,
          pages: [...project.pages, newPage],
        };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          currentPageIndex: newProject.pages.length - 1,
          selectedLayerId: undefined,
        }));
      },
      deletePage: (pageIndex) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        if (project.pages.length <= 1) return; // 至少保留一页

        const newPages = project.pages.filter((_, i) => i !== pageIndex);
        const newProject: ProjectDoc = { ...project, pages: newPages };
        
        let nextPageIndex = currentPageIndex;
        if (pageIndex === currentPageIndex) {
          nextPageIndex = Math.max(0, pageIndex - 1);
        } else if (pageIndex < currentPageIndex) {
          nextPageIndex = currentPageIndex - 1;
        }

        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          currentPageIndex: nextPageIndex,
          selectedLayerId: undefined,
        }));
      },
      duplicatePage: (pageIndex) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const sourcePage = project.pages[pageIndex];
        if (!sourcePage) return;

        const newPage: PageDoc = {
          ...sourcePage,
          id: `page-${nanoid(8)}`,
          layers: sourcePage.layers.map((l) => ({
            ...l,
            id: `${l.type.toLowerCase()}-${nanoid(8)}`,
          })),
        };

        const newPages = [...project.pages];
        newPages.splice(pageIndex + 1, 0, newPage);
        const newProject: ProjectDoc = { ...project, pages: newPages };
        
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
          currentPageIndex: pageIndex + 1,
          selectedLayerId: undefined,
        }));
      },
      setCurrentPage: (pageIndex) => {
        set({ currentPageIndex: pageIndex, selectedLayerId: undefined });
      },
      alignSelectedLayer: (type) => {
        const { currentProjectId, projects, currentPageIndex, selectedLayerId } = get();
        if (!currentProjectId || !selectedLayerId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];
        
        const selectedLayer = page.layers.find((l) => l.id === selectedLayerId);
        if (!selectedLayer) return;

        const aligned = alignLayers([selectedLayer], type, page.width, page.height);
        const newLayers = page.layers.map((l) =>
          l.id === selectedLayerId ? aligned[0] : l
        );

        const newPages = [...project.pages];
        newPages[currentPageIndex] = { ...page, layers: newLayers };
        const newProject: ProjectDoc = { ...project, pages: newPages };
        set((state) => ({
          projects: { ...state.projects, [project.id]: newProject },
        }));
      },
      distributeSelectedLayers: (type) => {
        const { currentProjectId, projects, currentPageIndex } = get();
        if (!currentProjectId) return;
        const project = projects[currentProjectId];
        if (!project) return;
        const page = project.pages[currentPageIndex];

        // 简化版：暂时不支持多选，留待后续扩展
        // 这里可以扩展为支持多选图层
        console.log("Distribute feature requires multi-selection, coming soon!");
      },
    }),
    {
      name: "b2b-editor-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates,
        projects: state.projects,
      }),
    }
  )
);

export const normalizeKonvaTransform = (node: any, layer: LayerDoc) => {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const width = Math.max(1, node.width() * scaleX);
  const height = Math.max(1, node.height() * scaleY);
  node.scaleX(1);
  node.scaleY(1);
  return {
    ...layer,
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    width,
    height,
  };
};

export const getCurrentProject = (state: EditorState) => {
  if (!state.currentProjectId) return undefined;
  return state.projects[state.currentProjectId];
};

