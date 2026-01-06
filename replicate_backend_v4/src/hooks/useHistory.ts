/**
 * 撤销/重做 Hook
 * 基于 Zustand 的历史记录管理
 */

import { useCallback, useEffect } from "react";
import { useEditorStore } from "../store/editorStore";
import type { ProjectDoc } from "../types";

export type HistoryEntry = {
  project: ProjectDoc;
  timestamp: number;
};

// 历史记录存储
const historyStacks = new Map<
  string,
  {
    past: HistoryEntry[];
    future: HistoryEntry[];
  }
>();

const MAX_HISTORY = 50;

/**
 * 获取项目的历史栈
 */
function getHistoryStack(projectId: string) {
  if (!historyStacks.has(projectId)) {
    historyStacks.set(projectId, {
      past: [],
      future: [],
    });
  }
  return historyStacks.get(projectId)!;
}

/**
 * 撤销/重做 Hook
 */
export function useHistory(projectId?: string) {
  const currentProject = useEditorStore((state) =>
    projectId ? state.projects[projectId] : undefined
  );

  /**
   * 推入新的历史记录
   */
  const pushHistory = useCallback(
    (project: ProjectDoc) => {
      if (!project) return;

      const stack = getHistoryStack(project.id);

      // 添加到 past
      stack.past.push({
        project: JSON.parse(JSON.stringify(project)),
        timestamp: Date.now(),
      });

      // 限制历史记录数量
      if (stack.past.length > MAX_HISTORY) {
        stack.past.shift();
      }

      // 清空 future（新操作会清空重做栈）
      stack.future = [];
    },
    []
  );

  /**
   * 撤销
   */
  const undo = useCallback(() => {
    if (!currentProject) return false;

    const stack = getHistoryStack(currentProject.id);
    if (stack.past.length === 0) return false;

    // 从 past 弹出
    const previous = stack.past.pop()!;

    // 当前状态推入 future
    stack.future.push({
      project: JSON.parse(JSON.stringify(currentProject)),
      timestamp: Date.now(),
    });

    // 恢复到之前的状态
    useEditorStore.setState((state) => ({
      projects: {
        ...state.projects,
        [currentProject.id]: previous.project,
      },
    }));

    return true;
  }, [currentProject]);

  /**
   * 重做
   */
  const redo = useCallback(() => {
    if (!currentProject) return false;

    const stack = getHistoryStack(currentProject.id);
    if (stack.future.length === 0) return false;

    // 从 future 弹出
    const next = stack.future.pop()!;

    // 当前状态推入 past
    stack.past.push({
      project: JSON.parse(JSON.stringify(currentProject)),
      timestamp: Date.now(),
    });

    // 恢复到之后的状态
    useEditorStore.setState((state) => ({
      projects: {
        ...state.projects,
        [currentProject.id]: next.project,
      },
    }));

    return true;
  }, [currentProject]);

  /**
   * 检查是否可以撤销/重做
   */
  const canUndo = currentProject
    ? getHistoryStack(currentProject.id).past.length > 0
    : false;

  const canRedo = currentProject
    ? getHistoryStack(currentProject.id).future.length > 0
    : false;

  /**
   * 清空历史记录
   */
  const clearHistory = useCallback(() => {
    if (!currentProject) return;
    const stack = getHistoryStack(currentProject.id);
    stack.past = [];
    stack.future = [];
  }, [currentProject]);

  return {
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}

/**
 * 键盘快捷键 Hook
 */
export function useHistoryShortcuts(projectId?: string) {
  const { undo, redo } = useHistory(projectId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      // Ctrl/Cmd + Z: 撤销
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z: 重做
      // Ctrl/Cmd + Y: 重做（Windows 风格）
      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
}

