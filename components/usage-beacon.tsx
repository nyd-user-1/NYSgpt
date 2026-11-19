"use client"

// NYSgpt stand-in for pax-trinity's src/components/usage-beacon.tsx (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity logs each use (a chip tapped, a video opened) to DynamoDB. NYSgpt logs nothing.

import * as React from "react"

export function useUsage() {
  return React.useCallback((kind: string, subject: string, meta?: Record<string, unknown>) => {
    void kind
    void subject
    void meta
  }, [])
}
