'use client'

import dynamic from 'next/dynamic'

// The scene is three.js — browser only, and loaded with the page rather than in the shared bundle.
const KnowledgeScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1" />,
})

export function KnowledgeView() {
  return <KnowledgeScene />
}
