'use client'

import { useEffect } from 'react'
import { useSwitchboard, type AwsView } from '@/components/SwitchboardPanel'

/** Opens the switchboard panel on an AWS Marketplace view when the page loads. */
export function OpenAwsPanel({ view }: { view: AwsView }) {
  const { openAws } = useSwitchboard()
  useEffect(() => openAws(view), [openAws, view])
  return null
}
