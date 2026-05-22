import posthog from 'posthog-js'

/**
 * Capture a custom event in PostHog.
 * No-ops gracefully if PostHog is not initialised (e.g. missing env var).
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.capture(event, properties)
}

/**
 * Identify the current user in PostHog.
 * No-ops gracefully if PostHog is not initialised.
 */
export function identifyUser(
  id: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.identify(id, properties)
}
