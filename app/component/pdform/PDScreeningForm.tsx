// components/PDScreeningForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js'
import AuthRedirect from '@/components/AuthRedirect'
import { supabase } from '@/lib/supabase'

export default function PDScreeningForm() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    // Patient information
    thaiid: '' ,
    firstName: '',
    lastName: '',
    age: '',
    province: '',
    collectionDate: '',
    hnNumber: '',
    
    // Physical measurements
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
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
    
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setSubmitMessage('Authentication error. Please re-login.');
        return;
      }

      const session = sessionData?.session as Session | null;
      if (!session) {
        setSubmitMessage('You must be logged in to save data.');
        return;
      }

      // Convert keys to snake_case for database compatibility
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
        setSubmitMessage('Error saving data. Please check if the database table is properly configured.');
      } else {
        console.log('Insert result:', data);
        setSubmitMessage('Data saved successfully!');
        // Reset form after successful submission
        setFormData({
          thaiid: '' ,
          firstName: '',
          lastName: '',
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
        
        // Navigate back to previous page after successful save
        setTimeout(() => {
          router.back();
        }, 1500); // Wait 1.5 seconds to show success message before navigating
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitMessage('An unexpected error occurred.');
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
            <div className='grid'>
              <div>
                <label className="block mb-1">Thai ID</label>
                <input
                  type="text"
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
                    Please complete 13 digits
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">ชื่อ</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder=""
                />
              </div>
              
              <div>
                <label className="block mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder=""
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">อายุ</label>
                <input 
                  type="text" 
                  name="age" 
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="ปี"
                />
              </div>
              
              <div>
                <label className="block mb-1">จังหวัด</label>
                <input 
                  type="text" 
                  name="province" 
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder=""
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-1">วันที่เก็บข้อมูล</label>
                <input 
                  type="date" 
                  name="collectionDate" 
                  value={formData.collectionDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block mb-1">HN (for KCMH patients)</label>
                <input 
                  type="text" 
                  name="hnNumber" 
                  value={formData.hnNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder=""
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
            <div className={`mt-4 p-3 rounded text-center ${submitMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {submitMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}