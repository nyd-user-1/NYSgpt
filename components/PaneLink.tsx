"use client"

import Link from "next/link"
import * as React from "react"

import { useShellPanel } from "@/components/shell"

/** A link whose plain click opens its page in the second panel (2026-11-04: the /viz boxes). A click with a
 *  modifier stays the browser's — a new tab, a new window. */
export function PaneLink({ href, ...props }: React.ComponentProps<typeof Link> & { href: string }) {
  const { openPane } = useShellPanel()
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        props.onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        openPane(href)
      }}
    />
  )
}
