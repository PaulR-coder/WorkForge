import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImageStep from '@/app/(app)/marketing/steps/ImageStep'
import type { SelectedVariation } from '@/app/(app)/marketing/steps/CopyStep'

const mockFetch = jest.fn()
global.fetch = mockFetch

const selected: SelectedVariation = {
  tool: 'google_ad',
  inputs: { businessName: 'Acme HVAC', service: 'AC repair' },
  variation: { headline1: 'Fast AC Repair Tampa', headline2: 'Same-Day Service', headline3: 'Free Estimates' },
}

const defaultProps = {
  selected,
  onBack: jest.fn(),
  onNext: jest.fn(),
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ prompt: '' }) })
  defaultProps.onBack.mockReset()
  defaultProps.onNext.mockReset()
})

describe('ImageStep', () => {
  it('renders style options', () => {
    render(<ImageStep {...defaultProps} />)
    expect(screen.getByText('Photo Realistic')).toBeInTheDocument()
    expect(screen.getByText('Bold Graphic')).toBeInTheDocument()
    expect(screen.getByText('Illustration')).toBeInTheDocument()
    expect(screen.getByText('Upload My Own')).toBeInTheDocument()
  })

  it('auto-fetches image prompt on mount', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ prompt: 'A bright sunny day...' }) })
    render(<ImageStep {...defaultProps} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/marketing/image/prompt', expect.any(Object)))
  })

  it('calls Back when back button clicked', () => {
    render(<ImageStep {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('"Skip" calls onNext with no image', () => {
    render(<ImageStep {...defaultProps} />)
    fireEvent.click(screen.getByText(/Skip/i))
    expect(defaultProps.onNext).toHaveBeenCalledWith(null)
  })
})
