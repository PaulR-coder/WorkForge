export interface SidebarPrefs {
  collapsedGroups: string[]
  hiddenItems: string[]
  customGroups: { label: string; items: string[] }[]
  itemOrder: Record<string, string[]>
}

export const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = {
  collapsedGroups: [],
  hiddenItems: [],
  customGroups: [],
  itemOrder: {},
}

export function mergeSidebarPrefs(raw: unknown): SidebarPrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_SIDEBAR_PREFS }
  const r = raw as Record<string, unknown>
  return {
    collapsedGroups: Array.isArray(r.collapsedGroups) ? r.collapsedGroups.filter((x): x is string => typeof x === 'string') : [],
    hiddenItems:     Array.isArray(r.hiddenItems)     ? r.hiddenItems.filter((x): x is string => typeof x === 'string')     : [],
    customGroups:    Array.isArray(r.customGroups)    ? r.customGroups.filter(g => g && typeof g === 'object' && typeof (g as Record<string,unknown>).label === 'string') as SidebarPrefs['customGroups'] : [],
    itemOrder:       (r.itemOrder && typeof r.itemOrder === 'object' && !Array.isArray(r.itemOrder)) ? r.itemOrder as Record<string, string[]> : {},
  }
}
