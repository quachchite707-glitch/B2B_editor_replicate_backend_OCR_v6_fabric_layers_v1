export type Preset = "VERTICAL_9_16" | "SQUARE_1_1" | "HORIZONTAL_16_9";

export type LayerType = "BG_IMAGE" | "TEXT" | "IMAGE" | "SHAPE" | "QR";

// 左侧“一键添加文字”预设
export type TextPresetKey =
  | "headline"
  | "subtitle"
  | "benefit1"
  | "benefit2"
  | "contact";

export type LayerStyle = {
  // 文本样式
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fill?: string;
  align?: "left" | "center" | "right";
  
  // 形状样式
  stroke?: string;
  strokeWidth?: number;
  radius?: number; // 圆角半径
};

export type LayerDoc = {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
  data?: {
    // TEXT
    text?: string;
    // TEXT：文本框尺寸策略
    // - auto: 随内容自动调整 width/height（默认）
    // - fixed: 用户手动拉伸后固定 width，仅随内容调整 height
    textAutoSize?: "auto" | "fixed";
    
    // IMAGE / BG_IMAGE
    assetUrl?: string;
    fit?: "cover" | "contain";
    // IMAGE：首次插入/更换 URL 后自动贴合一次（fit=contain 去掉留白，让编辑框贴合四角）
    imageAutoFit?: boolean;
    
    // SHAPE
    shapeType?: "rect" | "circle" | "line";
    
    // QR
    qrValue?: string; // 二维码内容
  };
  style?: LayerStyle;
};

export type PageDoc = {
  id: string;
  width: number;
  height: number;
  layers: LayerDoc[];
};

export type ProjectDoc = {
  id: string;
  name: string;
  preset: Preset;
  pages: PageDoc[];
};

export type TemplateDoc = {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  defaultPage: PageDoc;
};

