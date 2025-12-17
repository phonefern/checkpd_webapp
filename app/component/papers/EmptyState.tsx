import Link from "next/link";

const EmptyState = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
      <div className="text-center">
        <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">ยังไม่มีข้อมูลผู้ป่วย</h3>
        <p className="mt-1 text-gray-500">เริ่มต้นด้วยการเพิ่มผู้ป่วยใหม่</p>
        <div className="mt-6">
          <Link
            href="/pages/papers/check-in"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มผู้ป่วยใหม่
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;