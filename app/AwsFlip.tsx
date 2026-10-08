'use client'

import { useEffect, useRef, useState } from 'react'

const WORD = 'AWS'
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** One frame of the flip, and how many each letter runs before it lands: two to three rounds, left to right. */
const FRAME = 55
const LANDS = [10, 14, 18]

/**
 * The masthead's AWS, flipped in like a departures board: each letter runs
 * through random letters, then lands on its own, the first soonest. `play`
 * restarts it; at rest the word shows plainly.
 */
export function AwsFlip({ play }: { play: number }) {
  const [shown, setShown] = useState(WORD)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!play) return
    let frame = 0
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      frame++
      setShown(WORD.split('').map((ch, i) => (frame >= LANDS[i] ? ch : ABC[Math.floor(Math.random() * ABC.length)])).join(''))
      if (frame >= LANDS[LANDS.length - 1] && timer.current) clearInterval(timer.current)
    }, FRAME)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [play])

  return (
    <>
      {shown.split('').map((ch, i) => (
        // A fixed width per letter, so the word does not jitter as letters change.
        <span key={i} className="inline-block w-[0.72em] text-center">{ch}</span>
      ))}
    </>
  )
}
