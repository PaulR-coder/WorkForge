import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CopyStep from '@/app/(app)/marketing/steps/CopyStep'

const mockFetch = jest.fn()
global.fetch = mockFetch

const defaultProps = {
  activeTool: 'google_ad' as const,
  onToolChange: jest.fn(),
  company: 'Acme HVAC',
  onNext: jest.fn(),
}

beforeEach(() => {
  mockFetch.mockReset()
  defaultProps.onNext.mockReset()
  defaultProps.onToolChange.mockReset()
})

describe('CopyStep', () => {
  it('renders tool selector sidebar', () => {
    render(<CopyStep {...defaultProps} />)
    expect(screen.getByText('Google Ads')).toBeInTheDocument()
    expect(screen.getByText('Social Media')).toBeInTheDocument()
  })

  it('renders form fields for active tool', () => {
    render(<CopyStep {...defaultProps} />)
    expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Service')).toBeInTheDocument()
  })

  it('generate button is disabled when fields are empty', () => {
    render(<CopyStep {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Generate 3 Variations/i })).toBeDisabled()
  })

  it('calls API and shows 3 variation cards on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        variations: [
          { headline1: 'H1A', headline2: 'H2A', headline3: 'H3A', description1: 'D1A', description2: 'D2A' },
          { headline1: 'H1B', headline2: 'H2B', headline3: 'H3B', description1: 'D1B', description2: 'D2B' },
          { headline1: 'H1C', headline2: 'H2C', headline3: 'H3C', description1: 'D1C', description2: 'D2C' },
        ],
      }),
    })

    render(<CopyStep {...defaultProps} />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Business Name/i), { target: { value: 'Acme HVAC' } })
    fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'AC repair' } })
    fireEvent.change(screen.getByLabelText(/Service Area/i), { target: { value: 'Tampa FL' } })
    fireEvent.change(screen.getByLabelText(/Call to Action/i), { target: { value: 'Call Today' } })

    fireEvent.click(screen.getByRole('button', { name: /Generate 3 Variations/i }))

    await waitFor(() => {
      expect(screen.getByText('Variation 1')).toBeInTheDocument()
      expect(screen.getByText('Variation 2')).toBeInTheDocument()
      expect(screen.getByText('Variation 3')).toBeInTheDocument()
    })
  })

  it('"Next" button is disabled until a variation is selected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        variations: [
          { headline1: 'H1A', headline2: 'H2A', headline3: 'H3A', description1: 'D1A', description2: 'D2A' },
          { headline1: 'H1B', headline2: 'H2B', headline3: 'H3B', description1: 'D1B', description2: 'D2B' },
          { headline1: 'H1C', headline2: 'H2C', headline3: 'H3C', description1: 'D1C', description2: 'D2C' },
        ],
      }),
    })

    render(<CopyStep {...defaultProps} />)
    fireEvent.change(screen.getByLabelText(/Business Name/i), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'HVAC' } })
    fireEvent.change(screen.getByLabelText(/Service Area/i), { target: { value: 'Tampa' } })
    fireEvent.change(screen.getByLabelText(/Call to Action/i), { target: { value: 'Call' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate 3 Variations/i }))

    await waitFor(() => screen.getByText('Variation 1'))
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()

    fireEvent.click(screen.getAllByText('Use this', { selector: 'button' })[0])
    expect(screen.getByRole('button', { name: /Next/i })).not.toBeDisabled()
  })
})
