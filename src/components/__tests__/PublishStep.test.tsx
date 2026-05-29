import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PublishStep from '@/app/(app)/marketing/steps/PublishStep'
import type { SelectedVariation } from '@/app/(app)/marketing/steps/CopyStep'

const mockFetch = jest.fn()
global.fetch = mockFetch

const selected: SelectedVariation = {
  tool: 'social_post',
  inputs: { businessName: 'Acme HVAC', platform: 'Facebook', topic: 'AC tips', tone: 'Educational' },
  variation: { caption: 'Great AC tips for summer!', hashtags: ['HVAC', 'ACtips'] },
}

const defaultProps = {
  selected,
  imageUrl: undefined,
  imageBase64: undefined,
  onBack: jest.fn(),
  onStartOver: jest.fn(),
}

beforeEach(() => { mockFetch.mockReset(); defaultProps.onBack.mockReset(); defaultProps.onStartOver.mockReset() })

describe('PublishStep', () => {
  it('fetches connections on mount', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ connections: [] }) })
    render(<PublishStep {...defaultProps} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/social/connections'))
  })

  it('shows Connect button for disconnected platforms', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ connections: [] }) })
    render(<PublishStep {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getAllByText(/Connect/i).length).toBeGreaterThan(0)
    })
  })

  it('shows connected accounts with checkboxes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connections: [
          { id: 'conn1', platform: 'facebook', accountName: 'Acme HVAC Page', accountId: 'page-123', createdAt: '2026-01-01' },
        ],
      }),
    })
    render(<PublishStep {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Acme HVAC Page')).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: /Acme HVAC Page/i })).toBeChecked()
  })

  it('shows non-publishable message for google_ad tool', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ connections: [] }) })
    render(<PublishStep {...defaultProps} selected={{ ...selected, tool: 'google_ad' }} />)
    await waitFor(() => expect(screen.getByText(/download only/i)).toBeInTheDocument())
  })
})
