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

  it('filters mixed-type arrays in collapsedGroups', () => {
    const result = mergeSidebarPrefs({ collapsedGroups: [1, 'valid', null, 'also-valid'] })
    expect(result.collapsedGroups).toEqual(['valid', 'also-valid'])
  })

  it('returns defaults for null input', () => {
    const result = mergeSidebarPrefs(null)
    expect(result).toEqual(DEFAULT_SIDEBAR_PREFS)
  })

  it('returns defaults for array input', () => {
    const result = mergeSidebarPrefs([1, 2, 3])
    expect(result.collapsedGroups).toEqual([])
  })

  it('validates itemOrder values as string arrays', () => {
    const result = mergeSidebarPrefs({ itemOrder: { ops: ['/jobs', '/schedule'], bad: 'not-an-array' } })
    expect(result.itemOrder).toEqual({ ops: ['/jobs', '/schedule'] })
  })

  it('validates customGroups items field', () => {
    const result = mergeSidebarPrefs({
      customGroups: [
        { label: 'My Group', items: ['/jobs', '/schedule'] },
        { label: 'Bad Group', items: 'not-an-array' },
        { label: 'Mixed', items: ['/jobs', 42, null] },
      ],
    })
    expect(result.customGroups).toHaveLength(2)
    expect(result.customGroups[0].items).toEqual(['/jobs', '/schedule'])
    expect(result.customGroups[1].items).toEqual(['/jobs'])
  })
})
