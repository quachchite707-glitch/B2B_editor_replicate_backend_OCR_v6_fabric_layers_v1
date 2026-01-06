# 后端识别（PaddleOCR）使用说明

这个版本新增了一个独立的后端服务（FastAPI），用于：
- 中文 OCR（比浏览器 tesseract 稳定/准确）
- 基于 OCR 的“横条块（bar）”检测（更稳）

## 启动方式（本地开发）

### 1) 启动后端

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

### 2) 启动前端

```bash
npm i
npm run dev
```

打开：`http://localhost:3000/replicate`

在“复刻图片模板”页勾选：**优先使用后端识别**。

## 可选：修改后端地址

前端默认请求 `http://localhost:8001/parse`。
如果你部署到别的地址，可以在 `.env.local` 里配置：

```
NEXT_PUBLIC_PARSE_BACKEND_URL=http://你的域名:8001/parse
```
