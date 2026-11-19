'use client'

import { useReducedMotion } from 'motion/react'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'

/**
 * govblock's trigger, used the way govblock's nav uses it (apps/web/components/main-nav.tsx): the control
 * (a box, a button, a row) is the AnimateIcon's child, so every animated icon inside it plays when the
 * control is under the mouse, not only the icon itself (brief 50, 2026-11-19). With reduced motion asked
 * for, nothing plays; the two-tone fill is CSS and still shows.
 */
export function AnimateOnHover({ children }: { children: React.ReactElement }) {
  const reduce = useReducedMotion()
  return (
    <AnimateIcon asChild animateOnHover={!reduce}>
      {children}
    </AnimateIcon>
  )
}
