'use client'

// Ported from solar (src/components/MarkdownContent.tsx); pax2 colors arrive through the --txt/--muted/--border/--inp-bg variables the chat root sets.

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { childText } from '@/components/chat/child-text'
import { CodeCard } from '@/components/chat/code-card'
import { decorateTerms } from '@/components/chat/term-tip'

interface Props {
  content: string
  isStreaming?: boolean // kept for API compatibility, no visual indicator used
}

// Memoized (2026-10-29): its element components are built per render, so an unmemoized re-render of the
// chat (a keystroke in the composer, a search hit) remounted every paragraph and link of every answer.
export const MarkdownContent = memo(function MarkdownContent({ content, isStreaming }: Props) {
  // One reply, one underline per term: the first mention gets the hover definition, the rest read plain.
  const seen = new Set<string>()
  const mdComponents: Parameters<typeof ReactMarkdown>[0]['components'] = {
    p: ({ children }) => (
      <p className="mb-3 last:mb-0 text-[17px] text-[var(--txt)] leading-relaxed">{decorateTerms(children, seen)}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-[var(--txt)]">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-[var(--muted)]">{children}</em>
    ),
    h1: ({ children }) => (
      <h1 className="text-[22px] font-bold text-[var(--txt)] mt-5 mb-2 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-[19px] font-bold text-[var(--txt)] mt-4 mb-2 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <div className="flex items-center gap-2 mt-6 mb-2">
        <span className="text-xs text-[var(--muted)] shrink-0">{childText(children).replace(/^\d+\.\s*/, '')}</span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </div>
    ),
    h4: ({ children }) => (
      <div className="flex items-center gap-2 mt-5 mb-1">
        <span className="text-xs text-[var(--muted)] shrink-0">{childText(children).replace(/^\d+\.\s*/, '')}</span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </div>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-5 mb-3 space-y-1 text-[var(--txt)]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-3 space-y-1 text-[var(--txt)]">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-[17px] text-[var(--txt)] leading-relaxed">{decorateTerms(children, seen)}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-pax2-light-blue pl-3 my-3 text-[var(--muted)] italic">{children}</blockquote>
    ),
    hr: () => (
      <div className="my-4 border-t border-[var(--border)]" />
    ),
    // Inline code only: a code block arrives through `pre`, which renders the code card instead.
    code: ({ children }) => (
      <code className="bg-[var(--inp-bg)] text-pax2-light-blue rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>
    ),
    pre: ({ children }) => {
      const el = (Array.isArray(children) ? children[0] : children) as { props?: { className?: string; children?: React.ReactNode } } | undefined
      const language = /language-([\w-]+)/.exec(el?.props?.className ?? '')?.[1]
      return <CodeCard code={childText(el?.props?.children ?? children).replace(/\n$/, '')} language={language} />
    },
    table: ({ children }) => (
      <div className="overflow-x-auto mb-3 rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm text-left">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-[var(--inp-bg)] border-b border-[var(--border)]">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 border-b border-[var(--border)] text-[var(--txt)]">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-[var(--border)] last:border-0">{children}</tr>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('/')) {
        // A cited video is a chip: on /graph the canvas answers the open-entity event by centering
        // the video and cancels the navigation; anywhere else the link opens the video page.
        const yt = href.match(/^\/v\/yt-([\w-]+)$/)?.[1]
        const onClick = yt ? (e: React.MouseEvent) => {
          if (!window.dispatchEvent(new CustomEvent('open-entity', { detail: { type: 'video', id: yt }, cancelable: true }))) e.preventDefault()
        } : undefined
        return <Link href={href} onClick={onClick} className="text-pax2-light-blue hover:underline">{children}</Link>
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-pax2-light-blue hover:underline">{children}</a>
    },
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {content}
    </ReactMarkdown>
  )
})
