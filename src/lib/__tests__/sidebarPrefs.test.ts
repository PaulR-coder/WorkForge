import { mergeSidebarPrefs, DEFAULT_SIDEBAR_PREFS } from '../sidebarPrefs'

describe('mergeSidebarPrefs', () => {
  it('returns defaults when given empty object', () => {
    const result = mergeSidebarPrefs({})
    expect(result.collapsedGroups).toEqual([])
    expect(result.hiddenItems).toEqual([])
    expect(result.customGroups).toEqual([])
    expect(result.itemOrder).toEqual({})
  })

  it('preserves valid fields and ignores unknown keys', () => {
    const result = mergeSidebarPrefs({
      collapsedGroups: ['Reports'],
      hiddenItems: ['/marketing'],
      unknown: 'ignored',
    })
    expect(result.collapsedGroups).toEqual(['Reports'])
    expect(result.hiddenItems).toEqual(['/marketing'])
    expect((result as unknown as Record<string, unknown>).unknown).toBeUndefined()
  })

  it('coerces non-array collapsedGroups to empty array', () => {
    const result = mergeSidebarPrefs({ collapsedGroups: 'not-an-array' as unknown as string[] })
    expect(result.collapsedGroups).toEqual([])
  })
})
