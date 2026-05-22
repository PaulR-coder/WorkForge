import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  const referralCode = await prisma.referralCode.findUnique({ where: { code } })

  if (referralCode) {
    // Record the referral use
    await prisma.referralUse.create({
      data: { referralCodeId: referralCode.id, status: 'pending' },
    })
  }
  // Fail silently if code not found — always redirect to pricing

  const response = NextResponse.redirect(new URL('/pricing', 'https://app.getworkforge.com'))

  response.cookies.set('wf_referral', code, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: false,            // readable by JS
    path: '/',
    sameSite: 'lax',
  })

  return response
}
