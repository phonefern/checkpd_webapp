// components/ui/animated-counter.tsx
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { AnimatedDigit } from '@/components/ui/animated-digit'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  placeholder?: string
}

export function AnimatedCounter({
  value,
  duration = 600,
  className,
  placeholder = '0',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // อัพเดทค่าทันทีถ้าค่าเท่าเดิมหรือน้อยกว่า
    if (value <= prevValue.current) {
      setDisplayValue(value)
      prevValue.current = value
      return
    }

    const start = prevValue.current
    const end = value
    const startTime = performance.now()

    const easeOutQuint = (t: number) =>
      1 - Math.pow(1 - t, 3)

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1)
      const eased = easeOutQuint(progress)

      const current = Math.floor(start + (end - start) * eased)
      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = end
        setDisplayValue(end)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  // เตรียม digits สำหรับแสดงผล
  const digits = useMemo(() => {
    // ถ้า value เป็น undefined หรือ null ให้แสดง placeholder
    const currentValue = value !== undefined && value !== null ? value : 0
    const currentStr = displayValue.toString()
    const prevStr = prevValue.current.toString()
    
    // หาความยาวสูงสุดและเติม 0 ด้านหน้าให้เท่ากัน
    const maxLen = Math.max(currentStr.length, prevStr.length, 1) // อย่างน้อย 1 หลัก
    
    // ถ้า value ไม่มีข้อมูล ให้แสดง placeholder
    if (value === undefined || value === null) {
      return [{
        digit: placeholder,
        prevDigit: placeholder,
        isPlaceholder: true
      }]
    }
    
    const cur = currentStr.padStart(maxLen, '0')
    const prev = prevStr.padStart(maxLen, '0')
    
    return cur.split('').map((d, i) => ({
      digit: d,
      prevDigit: prev[i],
      isPlaceholder: false
    }))
  }, [displayValue, value, placeholder])

  // ตรวจสอบว่ามีข้อมูลหรือไม่
  const hasValue = value !== undefined && value !== null

  return (
    <span className={cn('inline-flex tabular-nums', className)}>
      {digits.map(({ digit, prevDigit, isPlaceholder }, i) => (
        <AnimatedDigit 
          key={i} 
          digit={isPlaceholder ? placeholder : digit}
          prevDigit={isPlaceholder ? placeholder : prevDigit}
          isFirst={i === 0}
          isPlaceholder={isPlaceholder}
        />
      ))}
    </span>
  )
}