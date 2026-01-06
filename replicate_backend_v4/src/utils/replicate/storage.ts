import type { TemplateJSON } from '@/types/template'

export const WORKING_TEMPLATE_KEY = 'replicate:workingTemplate'
export const SAVED_TEMPLATES_KEY = 'replicate:savedTemplates'

export function saveWorkingTemplate(t: TemplateJSON) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WORKING_TEMPLATE_KEY, JSON.stringify(t))
}

export function loadWorkingTemplate(): TemplateJSON | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(WORKING_TEMPLATE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TemplateJSON
  } catch {
    return null
  }
}

export function saveTemplateToLibrary(t: TemplateJSON, name: string) {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(SAVED_TEMPLATES_KEY)
  const list: { id: string; name: string; template: TemplateJSON; createdAt: number }[] = raw ? safeJson(raw) ?? [] : []
  const id = `tpl_${Date.now()}`
  list.unshift({ id, name, template: t, createdAt: Date.now() })
  window.localStorage.setItem(SAVED_TEMPLATES_KEY, JSON.stringify(list))
  return id
}

export function listSavedTemplates() {
  if (typeof window === 'undefined') return [] as { id: string; name: string; template: TemplateJSON; createdAt: number }[]
  const raw = window.localStorage.getItem(SAVED_TEMPLATES_KEY)
  if (!raw) return []
  return (safeJson(raw) ?? []) as { id: string; name: string; template: TemplateJSON; createdAt: number }[]
}

export function getSavedTemplate(id: string) {
  return listSavedTemplates().find((t) => t.id === id) ?? null
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
