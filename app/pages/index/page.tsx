"use client";

// pages/index.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';

interface Achievement {
  requirement: number;
  icon: string;
  label: string;
}

export default function Dashboard() {
  const [score, setScore] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [clickEffects, setClickEffects] = useState<Array<{id: number, x: number, y: number, points: number}>>([]);
  const router = useRouter();

  const achievements: Achievement[] = [
    { requirement: 10, icon: '🥉', label: '10 คะแนน' },
    { requirement: 50, icon: '🥈', label: '50 คะแนน' },
    { requirement: 100, icon: '🥇', label: '100 คะแนน' },
    { requirement: 200, icon: '👑', label: '200 คะแนน' },
  ];

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger on navigation cards
    if ((e.target as HTMLElement).closest('.nav-card')) {
      return;
    }
    
    const points = Math.floor(Math.random() * 5) + 1;
    setScore(prev => prev + points);
    setClicks(prev => prev + 1);
    
    // Create click effect
    setClickEffects(prev => [
      ...prev,
      { id: Date.now(), x: e.clientX, y: e.clientY, points }
    ]);
  };

  useEffect(() => {
    // Remove click effects after animation completes
    const timer = setTimeout(() => {
      if (clickEffects.length > 0) {
        setClickEffects(prev => prev.slice(1));
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [clickEffects]);

  const navigateTo = (url: string) => {
    router.push(url);
  };

  return (
    <div 
      className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100"
      onClick={handleClick}
    >
      <Head>
        <title>CheckPD Dashboard</title>
        <meta name="description" content="ระบบตรวจสอบข้อมูลและประเมินความเสี่ยงโรคพาร์กินสัน" />
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Floating Background Elements */}
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>
      
      {/* Click Effects */}
      {clickEffects.map(effect => (
        <div 
          key={effect.id}
          className="click-effect"
          style={{ left: effect.x, top: effect.y }}
        >
          +{effect.points}
        </div>
      ))}
      
      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-indigo-800 mb-4">
            🧠 CheckPD System
          </h1>
          <p className="text-lg md:text-xl text-indigo-600 mb-8">
            ระบบตรวจสอบข้อมูลและประเมินความเสี่ยงโรคพาร์กินสัน
          </p>
        </div>

        

        {/* Navigation Cards */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-800 text-center mb-8">
            เลือกระบบที่ต้องการใช้งาน
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Patient Data Management */}
            <div 
              className="nav-card bg-white rounded-3xl p-6 md:p-8 shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigateTo('/pages/users')}
            >
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-md">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">
                  Patient Data Management
                </h3>
                <p className="text-gray-600 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                  ระบบจัดการข้อมูลผู้ใช้แอป CheckPD<br />

                </p>
                
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <span className="font-medium">เข้าสู่ระบบ</span>
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Papers Management */}
            <div 
              className="nav-card bg-white rounded-3xl p-6 md:p-8 shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigateTo('/pages/papers')}
            >
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-md">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">
                    Data Sheets Management
                </h3>
                <p className="text-gray-600 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                  จัดการ Data Sheet ปัจจัยเสี่ยงพาร์กินสัน<br />

                </p>
                
                <div className="flex items-center justify-center space-x-2 text-emerald-600">
                  <span className="font-medium">เข้าสู่ระบบ</span>
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-teal-600 text-lg">🎯</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              Click Game
            </h2>
          </div>
          
          <p className="text-slate-600 text-sm mb-6">
            คลิกที่ไหนก็ได้เพื่อเก็บคะแนน ก่อนเลือกระบบที่ต้องการ
          </p>
          
          {/* Compact Score Display */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-600">{score}</div>
                <div className="text-xs text-slate-500">คะแนน</div>
              </div>
              <div className="w-px h-8 bg-slate-300"></div>
              <div className="text-center">
                <div className="text-xl font-semibold text-slate-600">{clicks}</div>
                <div className="text-xs text-slate-500">คลิก</div>
              </div>
            </div>
          </div>

          {/* Compact Achievement System */}
          <div className="grid grid-cols-4 gap-2">
            {achievements.map((achievement, index) => (
              <div 
                key={index}
                className={`p-2 rounded-lg border transition-all duration-300 ${
                  score >= achievement.requirement 
                    ? 'bg-teal-50 border-teal-200 shadow-sm' 
                    : 'bg-slate-50 border-slate-200'
                }`}
                title={`เป้าหมาย: ${achievement.requirement} คะแนน`}
              >
                <div className={`text-lg mb-1 ${
                  score >= achievement.requirement ? 'grayscale-0' : 'grayscale opacity-50'
                }`}>
                  {achievement.icon}
                </div>
                <div className="text-xs text-slate-600">{achievement.requirement}</div>
              </div>
            ))}
          </div>

          {/* Simple Instruction */}
          <div className="mt-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
            💡 คลิกได้ 1-3 คะแนนต่อครั้ง
          </div>
        </div>
      </div>
    </div>

        {/* Footer */}
        <div className="text-center mt-12 md:mt-16">
          <p className="text-indigo-600/70 text-sm md:text-base">
            Copyright © 2025 ChulaPD. All Rights Reserved.
          </p>
        </div>
      </div>

      <style jsx global>{`
        body {
          font-family: 'Kanit', sans-serif;
          overflow-x: hidden;
        }
        
        .floating-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.1);
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
        }
        
        .floating-circle:nth-child(1) { width: 60px; height: 60px; top: 10%; left: 10%; animation-delay: 0s; }
        .floating-circle:nth-child(2) { width: 90px; height: 90px; top: 20%; right: 10%; animation-delay: 2s; }
        .floating-circle:nth-child(3) { width: 70px; height: 70px; bottom: 20%; left: 20%; animation-delay: 4s; }
        .floating-circle:nth-child(4) { width: 50px; height: 50px; bottom: 30%; right: 20%; animation-delay: 1s; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        
        .click-effect {
          position: fixed;
          pointer-events: none;
          color: #0d9488;
          font-weight: bold;
          font-size: 1.25rem;
          z-index: 1000;
          animation: clickAnimation 1s ease-out forwards;
        }
        
        @keyframes clickAnimation {
          0% {
            opacity: 1;
            transform: scale(0.5) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(1.5) translateY(-40px);
          }
        }
        
        .nav-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .nav-card:hover {
          transform: translateY(-5px) scale(1.01);
        }
      `}</style>
    </div>
  );
}