'use client'
import dynamic from 'next/dynamic'

const TeamMap = dynamic(() => import('./TeamMap'), { ssr: false })

export default function TeamMapWrapper() {
  return <TeamMap />
}
