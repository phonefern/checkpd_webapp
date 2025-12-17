// components/PDScreeningForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js'
import AuthRedirect from '@/components/AuthRedirect'
import { supabase } from '@/lib/supabase'
import { provinceOptions } from '@/app/types/user';

export default function PDScreeningForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    thaiid: "",
    firstName: "",
    lastName: "",
    gender: "",
    age: "",
    province: "",
    collectionDate: "",
    hnNumber: "",
    weight: "",
    height: "",
    bmi: "",
    chest: "",
    waist: "",
    neck: "",
    hip: "",
    bpSupine: "",
    prSupine: "",
    bpUpright: "",
    prUpright: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');



  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    let errorMessage = "";

    switch (name) {
      case "thaiid":
        newValue = value.replace(/\D/g, "").slice(0, 13);
        if (newValue.length < 13) errorMessage = "โปรดระบุหมายเลขบัตรประชาชนให้ครบ 13 หลัก";
        break;

      case "firstName":
      case "lastName":
        newValue = value.replace(/[^ก-๙a-zA-Z\s]/g, "");
        if (!/^[ก-๙a-zA-Z\s]*$/.test(value))
          errorMessage = "กรอกเฉพาะตัวอักษรไทยหรืออังกฤษเท่านั้น";
        break;

      case "age":
      case "weight":
      case "height":
      case "bmi":
      case "chest":
      case "waist":
      case "neck":
      case "hip":
      case "bpSupine":
      case "prSupine":
      case "bpUpright":
      case "prUpright":
        newValue = value.replace(/[^0-9.]/g, "");
        const dotCount = (newValue.match(/\./g) || []).length;
        if (dotCount > 1) newValue = newValue.slice(0, newValue.lastIndexOf("."));
        if (value && !/^[0-9.]+$/.test(value))
          errorMessage = "กรอกเฉพาะตัวเลขเท่านั้น";
        break;

      default:
        break;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
  };



  const toSnakeCase = (input: string) =>
    input
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/-/g, '_')
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


    const errors: string[] = [];

    if (!formData.thaiid || formData.thaiid.length !== 13) {
      errors.push("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    }
    if (!formData.firstName.trim()) {
      errors.push("กรุณากรอกชื่อ");
    }
    if (!formData.lastName.trim()) {
      errors.push("กรุณากรอกนามสกุล");
    }
    if (!formData.gender) {
      errors.push("กรุณาเลือกเพศ");
    }
    if (!formData.age || isNaN(Number(formData.age))) {
      errors.push("กรุณากรอกอายุเป็นตัวเลข");
    }
    if (!formData.province) {
      errors.push("กรุณาเลือกจังหวัด");
    }
    if (!formData.collectionDate) {
      errors.push("กรุณาระบุวันที่เก็บข้อมูล");
    }

    // ตัวอย่างตรวจค่าตัวเลขบางส่วน (กันผิดพลาด)
    const numericFields = ["weight", "height", "bmi"];
    numericFields.forEach((field) => {
      const val = (formData as any)[field];
      if (val && isNaN(Number(val))) {
        errors.push(`ฟิลด์ "${field}" ต้องเป็นตัวเลขเท่านั้น`);
      }
    });

    if (errors.length > 0) {
      setSubmitMessage(errors.join(" / "));
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setSubmitMessage('เกิดข้อผิดพลาดในการตรวจสอบ session กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      const session = sessionData?.session as Session | null;
      if (!session) {
        setSubmitMessage('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');
        return;
      }


      const payload = {
        ...convertKeysToSnakeCase(formData),
        user_id: session.user.id
      };

      const { data, error } = await supabase
        .from('pd_screenings')
        .insert([payload])
        .select();

      if (error) {
        console.error('Error inserting data:', error);
        setSubmitMessage('เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล กรุณาตรวจสอบตารางฐานข้อมูล');
      } else {
        console.log('Insert result:', data);
        setSubmitMessage('success: บันทึกข้อมูลเรียบร้อยแล้ว! ✅');

        setFormData({
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

        setTimeout(() => router.back(), 1500);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitMessage('เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Data sheet for high risk or suspected Prodromal PD and PD
        </h1>
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
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded ${errors.thaiid ? "border-yellow-500" : ""}`}
                  placeholder=""
                  maxLength={13}
                />
                {errors.thaiid && (
                  <p className="text-sm text-yellow-600 mt-1">{errors.thaiid}</p>
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
                  className={`w-full p-2 border rounded ${errors.firstName ? "border-yellow-500" : ""}`}
                  placeholder="ชื่อ"
                />
                {errors.firstName && (
                  <p className="text-sm text-yellow-600 mt-1">{errors.firstName}</p>
                )}
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
                  className={`w-full p-2 border rounded ${errors.lastName ? "border-yellow-500" : ""}`}
                  placeholder="นามสกุล"
                />
                {errors.lastName && (
                  <p className="text-sm text-yellow-600 mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block mb-1" htmlFor="gender">เพศ</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="" >เลือกเพศ</option>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                </select>
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
                  className={`w-full p-2 border rounded ${errors.age ? "border-yellow-500" : ""}`}
                  placeholder="อายุ (ปี)"
                />
                {errors.age && (
                  <p className="text-sm text-yellow-600 mt-1">{errors.age}</p>
                )}
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

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded disabled:bg-blue-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Data'}
            </button>
          </div>

          {submitMessage && (
            <div
              className={`mt-4 p-3 rounded text-center ${submitMessage.startsWith('success')
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
                }`}
            >
              {submitMessage.replace('success:', '').trim()}
            </div>
          )}

        </form>
      </div>
    </div>
  );
}