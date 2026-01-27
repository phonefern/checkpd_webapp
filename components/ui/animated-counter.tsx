// 'use client'

// import { useEffect, useRef, useState, useMemo } from 'react'
// import { cn } from '@/lib/utils'

// interface AnimatedCounterProps {
//   value: number
//   duration?: number
//   className?: string
// }

// function AnimatedDigit({ digit, duration }: { digit: string; duration: number }) {
//   const [prevDigit, setPrevDigit] = useState(digit)
//   const [isAnimating, setIsAnimating] = useState(false)

//   useEffect(() => {
//     if (digit !== prevDigit && !duration) {
//       setIsAnimating(true)
//       const timeout = setTimeout(() => {
//         setPrevDigit(digit)
//         setIsAnimating(false)
//       }, 300)
//       return () => clearTimeout(timeout)
//     }
//   }, [digit, prevDigit, duration])

//   if (duration) {
//     return <span className="inline-block">{digit}</span>
//   }

//   return (
//     <span className="relative inline-block h-[1em] w-[0.6em] overflow-hidden">
//       <span
//         className={cn(
//           'absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 ease-out',
//           isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
//         )}
//       >
//         {prevDigit}
//       </span>
//       <span
//         className={cn(
//           'absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 ease-out',
//           isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
//         )}
//       >
//         {digit}
//       </span>
//     </span>
//   )
// }

// export function AnimatedCounter({
//   value,
//   duration = 500,
//   className = '',
// }: AnimatedCounterProps) {
//   const [displayValue, setDisplayValue] = useState(0)
//   const prevValue = useRef(0)
//   const animationRef = useRef<number | null>(null)

//   useEffect(() => {
//     const startValue = prevValue.current
//     const endValue = value
//     const startTime = performance.now()

//     const animate = (currentTime: number) => {
//       const elapsed = currentTime - startTime
//       const progress = Math.min(elapsed / duration, 1)

//       const easeOutExpo = (t: number) =>
//         t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
//       const easedProgress = easeOutExpo(progress)

//       const currentValue = Math.round(
//         startValue + (endValue - startValue) * easedProgress
//       )
//       setDisplayValue(currentValue)

//       if (progress < 1) {
//         animationRef.current = requestAnimationFrame(animate)
//       } else {
//         prevValue.current = endValue
//       }
//     }

//     animationRef.current = requestAnimationFrame(animate)

//     return () => {
//       if (animationRef.current) {
//         cancelAnimationFrame(animationRef.current)
//       }
//     }
//   }, [value, duration])

//   const formattedValue = displayValue.toLocaleString()
//   const digits = useMemo(() => formattedValue.split(''), [formattedValue])

//   return (
//     <span className={className}>
//       {digits.map((char, index) => (
//         <AnimatedDigit key={`${index}-${digits.length}`} digit={char} duration={duration} />
//       ))}
//       <style jsx global>{`
//         @keyframes scroll-up {
//           0% {
//             transform: translateY(0);
//           }
//           100% {
//             transform: translateY(-100%);
//             opacity: 0;
//           }
//         }
//         @keyframes scroll-up-new {
//           0% {
//             transform: translateY(0);
//             opacity: 0;
//           }
//           100% {
//             transform: translateY(-100%);
//             opacity: 1;
//           }
//         }
//         .animate-scroll-up {
//           animation: scroll-up ease-out forwards;
//         }
//         .animate-scroll-up-new {
//           animation: scroll-up-new ease-out forwards;
//         }
//       `}</style>
//     </span>
//   )
// }





'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  className?: string
}

function Digit({ digit, prevDigit }: { digit: string; prevDigit: string }) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (digit !== prevDigit && digit !== ',' && prevDigit !== ',') {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [digit, prevDigit])

  if (digit === ',') {
    return <span className="inline-block">,</span>
  }

  return (
    <span className="relative inline-block h-[1em] w-[0.6em] overflow-hidden">
      <span
        className={cn(
          'absolute inset-0 flex flex-col items-center transition-transform duration-500 ease-out',
          isAnimating && 'animate-roll-up'
        )}
      >
        <span className="flex h-[1em] items-center justify-center">{digit}</span>
      </span>
      {isAnimating && (
        <span className="absolute inset-0 flex flex-col items-center animate-roll-in">
          <span className="flex h-[1em] items-center justify-center">{prevDigit}</span>
        </span>
      )}
    </span>
  )
}

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [prevDisplayValue, setPrevDisplayValue] = useState(value)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      setDisplayValue(value)
      setPrevDisplayValue(value)
      return
    }

    setPrevDisplayValue(displayValue)
    setDisplayValue(value)
  }, [value])

  const formattedValue = displayValue.toLocaleString()
  const prevFormattedValue = prevDisplayValue.toLocaleString()

  // Pad the shorter string to match lengths
  const maxLen = Math.max(formattedValue.length, prevFormattedValue.length)
  const paddedCurrent = formattedValue.padStart(maxLen, ' ')
  const paddedPrev = prevFormattedValue.padStart(maxLen, ' ')

  return (
    <span className={cn('tabular-nums inline-flex', className)}>
      {paddedCurrent.split('').map((char, index) => (
        <Digit key={index} digit={char} prevDigit={paddedPrev[index] || ' '} />
      ))}
    </span>
  )
}
