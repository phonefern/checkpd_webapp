import Link from "next/link";
import { supabase } from '@/lib/supabase';

const PapersHeader = () => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error)
    } else {
      window.location.href = '/pages/login'
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Data Sheets Management</h1>
            <p className="text-gray-600">จัดการแบบสอบถามและข้อมูลผู้ป่วยทั้งหมดในระบบ</p>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>ระบบพร้อมใช้งาน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PapersHeader;