'use client'

// Code in a chat reply as a block, in the script card's dress: the title and the language in the header,
// the code in the body, its line count in the footer. Copy shows on hover over the body's top-right
// corner and stays pinned there while the page scrolls past a long block.

import * as React from 'react'
import { Check, Copy } from 'lucide-react'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/nova/card'
import { Skeleton } from '@/components/nova/skeleton'

export function CodeCard({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () =>
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  const lines = code ? code.split('\n').length : 0
  return (
    // overflow-visible: the card's default overflow-hidden would stop the Copy button from pinning.
    <Card className="group/code my-4 overflow-visible">
      <CardHeader className="border-b [.border-b]:pb-2">
        <div className="flex items-center gap-3">
          <CardTitle>Code</CardTitle>
          {language && <span className="text-xs text-slate-800">{language}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="pointer-events-none sticky top-3 z-10 flex h-0 justify-end">
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Copied' : 'Copy code'}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-pax2-surface/90 text-slate-600 opacity-0 shadow-e1 backdrop-blur transition-opacity hover:text-pax2-blue focus-visible:opacity-100 group-hover/code:opacity-100"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
        {code ? (
          <pre className="overflow-x-auto py-3 pr-10 font-mono text-[13px] leading-relaxed text-[var(--txt)]">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            <Skeleton className="h-3.5 w-9/12" />
            <Skeleton className="h-3.5 w-7/12" />
            <Skeleton className="h-3.5 w-8/12" />
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-transparent py-3 text-xs text-slate-800">
        {lines} {lines === 1 ? 'line' : 'lines'}
      </CardFooter>
    </Card>
  )
}
