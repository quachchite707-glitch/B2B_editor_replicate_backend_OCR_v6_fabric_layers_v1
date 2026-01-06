import { useEffect, useState } from "react";

// 简易版 use-image，支持 crossOrigin，避免额外依赖
export default function useImage(
  url?: string,
  crossOrigin?: "Anonymous" | "use-credentials"
): [HTMLImageElement | undefined, "loading" | "loaded" | "failed"] {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    "loading"
  );

  useEffect(() => {
    if (!url) {
      setImage(undefined);
      setStatus("failed");
      return;
    }

    const img = new window.Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    img.onload = () => {
      setImage(img);
      setStatus("loaded");
    };

    img.onerror = () => {
      setStatus("failed");
    };

    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url, crossOrigin]);

  return [image, status];
}

