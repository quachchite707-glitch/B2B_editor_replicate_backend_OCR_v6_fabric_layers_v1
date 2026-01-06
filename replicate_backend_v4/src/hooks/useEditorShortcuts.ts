/**
 * 编辑器快捷键 Hook
 */

import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore";

export function useEditorShortcuts() {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const deleteLayer = useEditorStore((state) => state.deleteLayer);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // 如果在输入框中，只处理特定快捷键
      if (isInput) {
        // Esc: 失去焦点
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      // Delete / Backspace: 删除选中图层
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLayerId) {
          e.preventDefault();
          deleteLayer(selectedLayerId);
        }
        return;
      }

      // Ctrl/Cmd + D: 复制图层（目前简化为不实现，可扩展）
      if (modifier && e.key === "d") {
        e.preventDefault();
        console.log("Duplicate layer - coming soon!");
        return;
      }

      // 方向键：移动图层
      if (
        selectedLayerId &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;

        updateLayer(selectedLayerId, (layer) => {
          let { x, y } = layer;

          switch (e.key) {
            case "ArrowUp":
              y -= step;
              break;
            case "ArrowDown":
              y += step;
              break;
            case "ArrowLeft":
              x -= step;
              break;
            case "ArrowRight":
              x += step;
              break;
          }

          return { ...layer, x, y };
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, updateLayer, deleteLayer]);
}

