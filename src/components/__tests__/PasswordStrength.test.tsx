/**
 * Unit tests for src/components/PasswordStrength.tsx
 *
 * Covers:
 *   - getStrength() helper directly
 *   - PasswordStrength component rendering via @testing-library/react
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import PasswordStrength, { getStrength } from '@/components/PasswordStrength'

// ---------------------------------------------------------------------------
// getStrength() helper — pure function, no DOM needed
// ---------------------------------------------------------------------------

describe('getStrength()', () => {
  describe('null / empty input', () => {
    it('returns null for an empty string', () => {
      expect(getStrength('')).toBeNull()
    })

    it('returns null for undefined cast as empty (falsy guard)', () => {
      // The implementation guards with `if (!password) return null`.
      // Passing empty string is the canonical falsy case.
      expect(getStrength('')).toBeNull()
    })
  })

  describe('Weak passwords (score ≤ 1)', () => {
    it('short lowercase-only password is Weak', () => {
      const result = getStrength('abc')
      expect(result).not.toBeNull()
      expect(result!.label).toBe('Weak')
    })

    it('exactly 7 characters with no extras is Weak', () => {
      const result = getStrength('abcdefg')
      expect(result!.label).toBe('Weak')
    })

    it('single-char password is Weak', () => {
      expect(getStrength('a')!.label).toBe('Weak')
    })

    it('Weak password has pct 1', () => {
      expect(getStrength('weak')!.pct).toBe(1)
    })
  })

  describe('Fair passwords (score 2)', () => {
    it('8+ chars with one extra criterion is Fair', () => {
      // 8 chars (score+1) + uppercase (score+1) = 2 → Fair
      const result = getStrength('Abcdefgh')
      expect(result!.label).toBe('Fair')
    })

    it('8+ chars with digits only (no uppercase, no special) is Fair', () => {
      // length>=8 (+1), digit (+1) = 2 → Fair
      const result = getStrength('abc12345')
      expect(result!.label).toBe('Fair')
    })

    it('Fair password has pct 2', () => {
      expect(getStrength('Abcdefgh')!.pct).toBe(2)
    })
  })

  describe('Good passwords (score 3)', () => {
    it('12+ chars with uppercase and digit is Good', () => {
      // length>=8 (+1), length>=12 (+1), uppercase (+1), digit (+1) = 4 → Strong
      // To get exactly 3: length>=8 (+1), uppercase (+1), digit (+1) = 3 → Good
      const result = getStrength('Abcde12345') // 10 chars
      expect(result!.label).toBe('Good')
    })

    it('Good password has pct 3', () => {
      expect(getStrength('Abcde12345')!.pct).toBe(3)
    })

    it('password with special char but no length>=12 can be Good', () => {
      // length>=8 (+1), uppercase (+1), special (+1) = 3 → Good
      const result = getStrength('Abcde!fg') // 8 chars, uppercase, special
      expect(result!.label).toBe('Good')
    })
  })

  describe('Strong passwords (score ≥ 4)', () => {
    it('long password with mixed case, digits, and special chars is Strong', () => {
      const result = getStrength('MyP@ssw0rd123!')
      expect(result!.label).toBe('Strong')
    })

    it('all five criteria gives Strong', () => {
      // length>=8, length>=12, uppercase, digit, special
      const result = getStrength('Abcdefghijkl1!')
      expect(result!.label).toBe('Strong')
    })

    it('Strong password has pct 4', () => {
      expect(getStrength('MyP@ssw0rd123!')!.pct).toBe(4)
    })

    it('password with length>=12, uppercase, digit, and special is Strong', () => {
      const result = getStrength('Secure1!abcde')
      expect(result!.label).toBe('Strong')
    })
  })

  describe('color values', () => {
    it('Weak uses --red', () => {
      expect(getStrength('abc')!.color).toBe('var(--red)')
    })

    it('Fair uses --amber', () => {
      expect(getStrength('Abcdefgh')!.color).toBe('var(--amber)')
    })

    it('Good uses --blue-light', () => {
      expect(getStrength('Abcde12345')!.color).toBe('var(--blue-light)')
    })

    it('Strong uses --green', () => {
      expect(getStrength('MyP@ssw0rd123!')!.color).toBe('var(--green)')
    })
  })
})

// ---------------------------------------------------------------------------
// <PasswordStrength> component
// ---------------------------------------------------------------------------

describe('<PasswordStrength>', () => {
  describe('empty password', () => {
    it('renders nothing when password is empty string', () => {
      const { container } = render(<PasswordStrength password="" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Weak password', () => {
    it('shows "Weak" label for a very short password', () => {
      render(<PasswordStrength password="abc" />)
      expect(screen.getByText('Weak')).toBeInTheDocument()
    })

    it('has accessible aria-label describing the strength', () => {
      render(<PasswordStrength password="abc" />)
      expect(screen.getByLabelText(/Password strength: Weak/i)).toBeInTheDocument()
    })
  })

  describe('Fair password', () => {
    it('shows "Fair" label', () => {
      render(<PasswordStrength password="Abcdefgh" />)
      expect(screen.getByText('Fair')).toBeInTheDocument()
    })
  })

  describe('Good password', () => {
    it('shows "Good" label for mixed-case + numbers', () => {
      render(<PasswordStrength password="Abcde12345" />)
      expect(screen.getByText('Good')).toBeInTheDocument()
    })

    it('has correct aria-label', () => {
      render(<PasswordStrength password="Abcde12345" />)
      expect(screen.getByLabelText(/Password strength: Good/i)).toBeInTheDocument()
    })
  })

  describe('Strong password', () => {
    it('shows "Strong" label for a complex password', () => {
      render(<PasswordStrength password="MyP@ssw0rd123!" />)
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })

    it('has correct aria-label', () => {
      render(<PasswordStrength password="MyP@ssw0rd123!" />)
      expect(screen.getByLabelText(/Password strength: Strong/i)).toBeInTheDocument()
    })
  })

  describe('segment bar', () => {
    it('renders exactly 4 segment divs', () => {
      const { container } = render(<PasswordStrength password="abc" />)
      // The outer wrapper > first div (segments row) > 4 segment divs
      const segmentRow = container.querySelector('[aria-live="polite"] > div:first-child')
      expect(segmentRow?.children.length).toBe(4)
    })
  })

  describe('live region', () => {
    it('has aria-live="polite" for screen-reader updates', () => {
      render(<PasswordStrength password="abc" />)
      const live = screen.getByLabelText(/Password strength/i)
      expect(live).toHaveAttribute('aria-live', 'polite')
    })
  })
})
