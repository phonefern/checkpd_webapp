'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'
import { provinceOptions } from '@/app/types/user';

interface PatientData {
  id: number;
  thaiid: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: string;
  province: string;
  collection_date: string;
  hn_number: string;
  weight: string;
  height: string;
  bmi: string;
  chest: string;
  waist: string;
  neck: string;
  hip: string;
  bp_supine: string;
  pr_supine: string;
  bp_upright: string;
  pr_upright: string;
}

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [formData, setFormData] = useState({
    thaiid: '',
    firstName: '',
    lastName: '',
    gender: '',
    age: '',
    province: '',
    collectionDate: '',
    hnNumber: '',
    weight: '',
    height: '',
    bmi: '',
    chest: '',
    waist: '',
    neck: '',
    hip: '',
    bpSupine: '',
    prSupine: '',
    bpUpright: '',
    prUpright: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState('');

  // Fetch patient data
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const { data, error } = await supabase
          .from('pd_screenings')
          .select('*')
          .eq('id', patientId)
          .single();

        if (error) {
          console.error('Error fetching patient:', error);
          setSubmitMessage('ไม่พบข้อมูลผู้ป่วย');
          return;
        }

        if (data) {
          // Convert snake_case to camelCase for form
          setFormData({
            thaiid: data.thaiid || '',
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            gender: data.gender || '',
            age: data.age || '',
            province: data.province || '',
            collectionDate: data.collection_date || '',
            hnNumber: data.hn_number || '',
            weight: data.weight || '',
            height: data.height || '',
            bmi: data.bmi || '',
            chest: data.chest || '',
            waist: data.waist || '',
            neck: data.neck || '',
            hip: data.hip || '',
            bpSupine: data.bp_supine || '',
            prSupine: data.pr_supine || '',
            bpUpright: data.bp_upright || '',
            prUpright: data.pr_upright || '',
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setSubmitMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setIsLoading(false);
      }
    };

    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toSnakeCase = (input: string) =>
    input
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();

  const convertKeysToSnakeCase = (obj: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[toSnakeCase(key)] = value;
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Convert keys to snake_case for database
      const payload = convertKeysToSnakeCase(formData);

      const { error } = await supabase
        .from('pd_screenings')
        .update(payload)
        .eq('id', patientId);

      if (error) {
        console.error('Error updating data:', error);
        setSubmitMessage('Error updating data.');
      } else {
        setSubmitMessage('อัพเดทข้อมูลเรียบร้อยแล้ว!');
        setTimeout(() => {
          router.push('/pages/papers');
        }, 1500);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitMessage('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
               <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            แก้ไขข้อมูลผู้ป่วย
          </h1>
          <button
            onClick={() => router.back()}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            ย้อนกลับ
          </button>
        </div>  

        <p className="text-center mb-6 text-gray-600">(Check PD: National Screening Project)</p>

        <form onSubmit={handleSubmit} className="space-y-6">


          {/* Patient Information Section */}
          <div className="border p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
            <div className='grid grid-cols-2 gap-4 mb-4'>
              <div>
                <label className="block mb-1" htmlFor="thaiid">เลขบัตรประชาชน</label>
                <input
                  type="text"
                  id="thaiid"
                  name="thaiid"
                  value={formData.thaiid}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 13);
                    setFormData((prev) => ({
                      ...prev,
                      thaiid: value
                    }));
                  }}
                  className={
                    formData.thaiid.length < 13
                      ? "w-full p-2 border rounded border-yellow-500"
                      : "w-full p-2 border rounded"
                  }
                  placeholder=""
                  maxLength={13}
                />
                {formData.thaiid.length < 13 && (
                  <p className="text-sm text-yellow-600">
                    โปรดระบุหมายเลขบัตรประชาชนให้ครบ 13 หลัก
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1" htmlFor="firstName">ชื่อ</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="ชื่อ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1" htmlFor="lastName">นามสกุล</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="นามสกุล"
                />
              </div>

              <div>
                <label className="block mb-1" htmlFor="gender">เพศ</label>
                <input
                  type="text"
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="เพศ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1" htmlFor="age">อายุ</label>
                <input
                  type="text"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="อายุ (ปี)"
                />
              </div>

              <div>
                <label className="block mb-1" htmlFor="province">จังหวัด</label>
                <select
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >

                  {provinceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1" htmlFor="collectionDate">วันที่เก็บข้อมูล</label>
                <input
                  type="date"
                  id="collectionDate"
                  name="collectionDate"
                  value={formData.collectionDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block mb-1" htmlFor="hnNumber">HN (for KCMH patients)</label>
                <input
                  type="text"
                  id="hnNumber"
                  name="hnNumber"
                  value={formData.hnNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="โปรดระบุหมายเลข HN ถ้ามี"
                />
              </div>
            </div>
          </div>

          {/* Physical Measurements Section */}
          <div className="border p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Physical Measurements</h2>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block mb-1">น้ำหนัก</label>
                <input
                  type="text"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder=" กิโลกรัม"
                />
              </div>

              <div>
                <label className="block mb-1">ส่วนสูง</label>
                <input
                  type="text"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="เซนติเมตร"
                />
              </div>

              <div>
                <label className="block mb-1">BMI</label>
                <input
                  type="text"
                  name="bmi"
                  value={formData.bmi}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Kg/m²"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block mb-1">รอบอก</label>
                <input
                  type="text"
                  name="chest"
                  value={formData.chest}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="นิ้ว"
                />
              </div>

              <div>
                <label className="block mb-1">รอบเอว</label>
                <input
                  type="text"
                  name="waist"
                  value={formData.waist}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="นิ้ว"
                />
              </div>

              <div>
                <label className="block mb-1">รอบคอ</label>
                <input
                  type="text"
                  name="neck"
                  value={formData.neck}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="นิ้ว"
                />
              </div>

              <div>
                <label className="block mb-1">รอบสะโพก</label>
                <input
                  type="text"
                  name="hip"
                  value={formData.hip}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="นิ้ว"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">ความดันโลหิตท่านอน BP Supine</label>
                <input
                  type="text"
                  name="bpSupine"
                  value={formData.bpSupine}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="mmHg"
                />
              </div>

              <div>
                <label className="block mb-1">PR</label>
                <input
                  type="text"
                  name="prSupine"
                  value={formData.prSupine}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="/min"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">ความดันโลหิต หลังยืน 3 นาที BP Upright 3 min</label>
                <input
                  type="text"
                  name="bpUpright"
                  value={formData.bpUpright}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="mmHg"
                />
              </div>

              <div>
                <label className="block mb-1">PR</label>
                <input
                  type="text"
                  name="prUpright"
                  value={formData.prUpright}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="/min"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded disabled:bg-blue-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังอัพเดท...' : 'อัพเดทข้อมูล'}
            </button>
          </div>

          {submitMessage && (
            <div className={`mt-4 p-3 rounded text-center ${submitMessage.includes('เรียบร้อย') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {submitMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}