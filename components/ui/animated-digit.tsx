// components/ui/animated-digit.tsx
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface AnimatedDigitProps {
  digit: string
  prevDigit?: string
  isFirst?: boolean
  isPlaceholder?: boolean
}

function AnimatedDigit({ 
  digit, 
  prevDigit = '0', 
  isFirst = false, 
  isPlaceholder = false 
}: AnimatedDigitProps) {
  const target = isPlaceholder ? 0 : Number(digit)
  const prev = isPlaceholder ? 0 : Number(prevDigit)
  
  // absolute index ของ digit นี้
  const indexRef = useRef(prev) // เริ่มจากค่าเก่า
  
  // State สำหรับ tracking animation
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // ถ้าเป็น placeholder ไม่ต้องทำ animation
    if (isPlaceholder) return
    
    // ไม่ต้องทำ animation ถ้าตัวเลขเท่ากัน
    if (target === indexRef.current) return

    setIsAnimating(true)
    
    // คำนวณระยะทางที่สั้นที่สุด
    const currentIdx = indexRef.current
    const diff = target - currentIdx
    
    // ป้องกันการคำนวณผิดพลาดสำหรับเลข 0
    if (target === 0 && currentIdx === 9) {
      // กรณีพิเศษ: จาก 9 ไป 0
      indexRef.current = 0
    } else if (target === 9 && currentIdx === 0) {
      // กรณีพิเศษ: จาก 0 ไป 9 (ลดลง)
      indexRef.current = 9
    } else {
      // กรณีทั่วไป: เลือกทิศทางที่สั้นที่สุด
      indexRef.current = target
    }

    // รีเซ็ต animation state หลังจากเสร็จสิ้น
    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [target, prev, isPlaceholder])

  // ถ้าเป็น placeholder ให้แสดงแค่ตัวเลข 0 โดยไม่ต้อง animation
  if (isPlaceholder) {
    return (
      <span
        className="relative inline-block overflow-hidden leading-none"
        style={{ 
          height: '1em', 
          width: '0.6em',
          lineHeight: '1'
        }}
      >
        <span
          className="absolute left-0 top-0 flex items-center justify-center w-full h-full"
        >
          {digit}
        </span>
      </span>
    )
  }

  // สร้าง stack ของ digits
  const stackSize = 10 // 0-9 เท่านั้น
  const stack = Array.from({ length: stackSize }, (_, i) => i)

  return (
    <span
      className="relative inline-block overflow-hidden leading-none"
      style={{ 
        height: '1em', 
        width: '0.6em',
        lineHeight: '1'
      }}
    >
      <span
        className={cn(
          "absolute left-0 top-0 flex flex-col items-center justify-center",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "will-change-transform"
        )}
        style={{
          transform: `translateY(-${indexRef.current}em)`,
        }}
      >
        {stack.map((num) => (
          <span
            key={num}
            style={{ 
              height: '1em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className={cn(
              "w-full",
              // ซ่อนเลข 0 หน้าแรกถ้าจำเป็นและไม่ใช่เลขโดดเดียว
              // isFirst && num === 0 && "opacity-0"
            )}
          >
            {num}
          </span>
        ))}
      </span>
    </span>
  )
}

export { AnimatedDigit }