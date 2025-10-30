import { PatientData } from './types';
import { formatDate } from './utils';
// app/component/papers/PatientHistory.tsx
interface PatientHistoryProps {
  patient: PatientData;
  onClose: () => void;
}

const PatientHistory = ({ patient, onClose }: PatientHistoryProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            ประวัติผู้ป่วย: {patient.first_name} {patient.last_name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-5 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">ข้อมูลพื้นฐาน</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">ชื่อ-สกุล:</span> {patient.first_name} {patient.last_name}</p>
                <p><span className="font-medium">อายุ:</span> {patient.age} ปี</p>
                <p><span className="font-medium">เพศ:</span> {patient.gender}</p>
                <p><span className="font-medium">จังหวัด:</span> {patient.province}</p>
                <p><span className="font-medium">HN:</span> {patient.hn_number || '-'}</p>
                <p><span className="font-medium">วันที่เก็บข้อมูล:</span> {formatDate(patient.collection_date)}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">การวินิจฉัย</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Condition:</span> {patient.condition || '-'}</p>
                <p><span className="font-medium">Other:</span> {patient.other || '-'}</p>
                <p><span className="font-medium">ความเสี่ยง:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    patient.prediction_risk === true 
                      ? 'bg-red-100 text-red-700' 
                      : patient.prediction_risk === false 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {patient.prediction_risk === true ? 'เสี่ยง' : patient.prediction_risk === false ? 'ไม่เสี่ยง' : 'ยังไม่ประเมิน'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Physical Measurements */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">การวัดร่างกาย</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">น้ำหนัก</p>
                <p className="text-lg">{patient.weight || '-'} kg</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">ส่วนสูง</p>
                <p className="text-lg">{patient.height || '-'} cm</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">BMI</p>
                <p className="text-lg">{patient.bmi || '-'}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">รอบเอว</p>
                <p className="text-lg">{patient.waist || '-'} นิ้ว</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">รอบอก</p>
                <p className="text-lg">{patient.chest || '-'} นิ้ว</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">รอบคอ</p>
                <p className="text-lg">{patient.neck || '-'} นิ้ว</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">รอบสะโพก</p>
                <p className="text-lg">{patient.hip || '-'} นิ้ว</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">ความดันโลหิต</p>
                <p className="text-lg">{patient.bp_supine || '-'} mmHg</p>
              </div>
            </div>
          </div>

          {/* Assessment Scores */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">คะแนนแบบประเมิน</h4>
            <div className="grid grid-cols-4 gap-3">
              {patient.risk_factors && Object.entries(patient.risk_factors).map(([key, value]) => (
                <div key={key} className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-sm capitalize">{key.replace('_score', '').replace('_', ' ')}</p>
                  <p className="text-lg font-semibold">{value !== null ? value : '-'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;