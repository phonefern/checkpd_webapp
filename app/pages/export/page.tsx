'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import AuthRedirect from '@/components/AuthRedirect'
import JSZip from 'jszip'

const conditionOptions = [
  { value: '', label: 'All Conditions' },
  { value: 'cdt7', label: 'CDT7' },
  { value: 'ctrl', label: 'Control' },
  { value: 'pd', label: 'PD' },
  { value: 'pdm', label: 'PDM' },
  { value: 'pksm', label: 'PKSM' },
  { value: 'other', label: 'Other' },
  { value: 'nodiag', label: 'No Diagnosis' },
  { value: 'normal_check', label: 'Normal Check' },
  { value: 'Not specified', label: 'Not specified' },
  { value: 'not_eval', label: 'Not Evaluated' }
]



export type User = {
  id: string
  record_id?: string
  thaiid: string
  firstname: string
  lastname: string
  age: number
  prediction_risk: boolean | null
  recorder: string
  province?: string
  region?: string
  gender?: string
  source?: string
  timestamp?: string
  last_update?: string
  condition?: string
}

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Logout error:', error)
  } else {
    window.location.href = '/login'
  }
}
const formatToThaiTime = (timestamp: string | undefined) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  date.setHours(date.getHours() + 7)
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function ExportPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [users, setUsers] = useState<User[]>([]) // สำหรับแสดงในตาราง (มี pagination)
  const [allSelectedRecords, setAllSelectedRecords] = useState<User[]>([]) // ✅ records ทั้งหมดเวลาทำ select all
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [searchId, setSearchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchCondition, setSearchCondition] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const itemsPerPage = 50

  const fetchUsers = async () => {
    setLoading(true)
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1
    const likePattern = `%${searchId.trim()}%`
    let query = supabase
      .from('users_history_with_users')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to)

    if (searchId.trim()) {
      query = query.or(
        `id.ilike.${likePattern},firstname.ilike.${likePattern},lastname.ilike.${likePattern},recorder.ilike.${likePattern},thaiid.ilike.${likePattern},condition.ilike.${likePattern}`
      )
    }

    if (startDate) query = query.gte('timestamp', startDate)
    if (endDate) {
      const nextDay = new Date(endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      query = query.lt('timestamp', nextDay.toISOString())
    }

    if (searchCondition.trim()) {
      query = query.eq('condition', searchCondition)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Error loading users:', error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchUsers()
    }
  }, [currentPage, searchId, startDate, endDate, searchCondition, session])

  
  useEffect(() => {
    const fetchAllRecords = async () => {
      try {
        let query = supabase
          .from('users_history_with_users')
          .select('*') 
          .order('timestamp', { ascending: false });

        if (searchId.trim()) {
          const likePattern = `%${searchId.trim()}%`;
          query = query.or(
            `id.ilike.${likePattern},firstname.ilike.${likePattern},lastname.ilike.${likePattern},recorder.ilike.${likePattern},thaiid.ilike.${likePattern},condition.ilike.${likePattern}`
          );
        }
        if (startDate) query = query.gte('timestamp', startDate);
        if (endDate) {
          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          query = query.lt('timestamp', nextDay.toISOString());
        }
        if (searchCondition.trim()) {
          query = query.eq('condition', searchCondition);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching all records:', error);
          setError('Failed to fetch all records');
          setSelectAll(false);
        } else if (data) {
          setSelectedUsers(new Set(data.map((u: User) => u.id)));
          setAllSelectedRecords(data); 
        }
      } catch (error) {
        console.error('Error in select all:', error);
        setError('Failed to select all records');
        setSelectAll(false);
      }
    };

    if (selectAll) {
      fetchAllRecords();
    } else {
      setSelectedUsers(new Set());
      setAllSelectedRecords([]);
    }
  }, [selectAll, searchId, startDate, endDate, searchCondition]);

  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }
interface WavFile {
  field: string;
  downloadUrl: string;
  metadata: any;
}

interface ExportRecord {
  userId: string;
  recordId: string;
  firstName: string;
  lastName: string;
  lastUpdate: string;
  data: any;
  wavFiles: WavFile[];
}

interface CsvResult {
  userId: string;
  recordId: string;
  firstName: string;
  lastName: string;
  lastUpdate: string;
  csvData: string | null;
  success: boolean;
}

const handleExport = async () => {
  if (selectedUsers.size === 0) {
    setError('Please select at least one record to export');
    return;
  }

  setExportLoading(true);
  setError('');
  setSuccess('');

  try {
    const selectedUserIds = Array.from(selectedUsers);
    const sourceRecords = selectAll && allSelectedRecords.length > 0 
      ? allSelectedRecords 
      : users;

    const exportRecords = selectedUserIds.flatMap(userId => 
      sourceRecords.filter(record => record.id === userId)
    );

    console.log('📦 Records to export:', exportRecords.length);

    const exportPromises = exportRecords.map(async (record): Promise<ExportRecord> => {
      try {
        const url = `/api/export/${record.id}${record.record_id ? `?record_id=${encodeURIComponent(record.record_id)}` : ''}`;
        console.log(`🔄 Exporting: ${record.id} - ${record.record_id}`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(
            `Failed to export ${record.id} (record: ${record.record_id}): ${error?.message || 'Export failed'}`
          );
        }

        const data = await res.json();
        
        // ✅ Debug WAV files data
        console.log(`🎵 WAV files data for ${record.id}:`, {
          hasWavFiles: !!data.wavFiles,
          count: data.wavFiles?.length || 0,
          wavFiles: data.wavFiles || []
        });
        
        return {
          userId: record.id,
          recordId: record.record_id || '',
          firstName: record.firstname,
          lastName: record.lastname,
          lastUpdate: record.last_update || record.timestamp || '',
          data: data,
          wavFiles: data.wavFiles || []
        };
      } catch (error) {
        console.error(`Export failed for record ${record.record_id}:`, error);
        throw error;
      }
    });

    const results = await Promise.allSettled(exportPromises);
    const failedExports = results.filter(result => result.status === 'rejected');
    const successfulExports = results.filter(result => result.status === 'fulfilled') as PromiseFulfilledResult<ExportRecord>[];

    if (failedExports.length > 0) {
      console.error('❌ Failed exports:', failedExports);
      setError(`Failed to export ${failedExports.length} records. Check console for details.`);
    }

    if (successfulExports.length === 0) {
      setError('No records were successfully exported');
      setExportLoading(false);
      return;
    }

    console.log('✅ Successful exports:', successfulExports.length);

    // ✅ สร้าง ZIP file
    const zip = new JSZip();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\\/]/g, '-');
    const folderName = `patient_records_export_${timestamp}`;

    // ✅ Download WAV files และเพิ่มลงใน ZIP
    console.log('🎵 Starting WAV files download...');
    
    // ✅ สร้าง array สำหรับเก็บ WAV download promises
    const allWavDownloadPromises: Promise<{success: boolean, fileName: string, error?: string}>[] = [];

    successfulExports.forEach(({ value }) => {
      const { userId, recordId, firstName, lastName, lastUpdate, wavFiles } = value;
      
      if (!wavFiles || wavFiles.length === 0) {
        console.log(`📭 No WAV files for ${userId}_${recordId}`);
        return;
      }

      const safeLastUpdate = lastUpdate 
        ? new Date(lastUpdate).toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
        : 'no-timestamp';
      
      const patientFolderName = `${userId}_${safeLastUpdate}_${firstName}_${lastName}`.replace(/\s+/g, '_');
      
      console.log(`🎵 Processing ${wavFiles.length} WAV files for ${patientFolderName}`);

      wavFiles.forEach((wavFile: WavFile) => {
        const downloadPromise = async () => {
          try {
            console.log(`⬇️ Downloading WAV: ${wavFile.field} from: ${wavFile.downloadUrl}`);
            
            // ✅ ตรวจสอบว่า downloadUrl มีค่า
            if (!wavFile.downloadUrl) {
              console.error(`❌ No downloadUrl for ${wavFile.field}`);
              return { success: false, fileName: `${recordId}_${wavFile.field}.wav`, error: 'No download URL' };
            }

            const apiUrl = `/api/export/${userId}?record_id=${recordId}&download=${wavFile.field}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // ✅ ตรวจสอบว่าเป็น WAV file จริงๆ
            if (blob.type && !blob.type.includes('audio') && !blob.type.includes('wav')) {
              console.warn(`⚠️ Downloaded file may not be WAV: ${blob.type}`);
            }
            
            const fileName = `${recordId}_${wavFile.field}.wav`;
            
            // ✅ เพิ่ม WAV file ลงใน ZIP
            const patientFolder = zip.folder(`${folderName}/${patientFolderName}`);
            patientFolder?.file(fileName, blob);
            
            console.log(`✅ Successfully added WAV: ${fileName} (${blob.size} bytes)`);
            return { success: true, fileName };
            
          } catch (error) {
            console.error(`❌ Failed to download WAV ${wavFile.field}:`, error);
            return { 
              success: false, 
              fileName: `${recordId}_${wavFile.field}.wav`, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        };
        
        allWavDownloadPromises.push(downloadPromise());
      });
    });

    // ✅ รอให้ WAV files download เสร็จทั้งหมด
    if (allWavDownloadPromises.length > 0) {
      console.log(`⏳ Waiting for ${allWavDownloadPromises.length} WAV files to download...`);
      const wavResults = await Promise.allSettled(allWavDownloadPromises);
      
      const successfulWavDownloads = wavResults.filter(
        (result): result is PromiseFulfilledResult<{success: boolean, fileName: string}> => 
          result.status === 'fulfilled' && result.value.success
      );
      
      const failedWavDownloads = wavResults.filter(
        (result): result is PromiseFulfilledResult<{success: boolean, fileName: string, error?: string}> => 
          result.status === 'fulfilled' && !result.value.success
      );
      
      console.log(`✅ Successfully downloaded ${successfulWavDownloads.length} WAV files`);
      if (failedWavDownloads.length > 0) {
        console.warn(`⚠️ Failed to download ${failedWavDownloads.length} WAV files:`, 
          failedWavDownloads.map(f => ({ fileName: f.value.fileName, error: f.value.error }))
        );
      }
    } else {
      console.log('📭 No WAV files to download');
    }

    // ✅ เพิ่ม JSON files และ metadata (ส่วนนี้เหมือนเดิม)
    successfulExports.forEach(({ value }) => {
      const { userId, recordId, firstName, lastName, lastUpdate, data, wavFiles } = value;
      
      const safeLastUpdate = lastUpdate 
        ? new Date(lastUpdate).toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
        : 'no-timestamp';
      
      const patientFolderName = `${userId}_${safeLastUpdate}_${firstName}_${lastName}`.replace(/\s+/g, '_');
      
      console.log(`📁 Creating folder: ${patientFolderName}`);
      
      const patientFolder = zip.folder(`${folderName}/${patientFolderName}`);
      
      // ✅ เพิ่ม test data JSON files
      if (data.data && data.tests) {
        data.tests.forEach((testType: string) => {
          if (data.data[testType]) {
            patientFolder?.file(
              `${recordId}_${testType}.json`,
              JSON.stringify(data.data[testType], null, 2)
            );
          }
        });
      }

      // ✅ เพิ่ม WAV metadata files (แม้จะ download ไม่สำเร็จ)
      if (wavFiles && wavFiles.length > 0) {
        wavFiles.forEach((wavFile: WavFile) => {
          const wavMetadata = {
            field: wavFile.field,
            recordId: recordId,
            userId: userId,
            downloadUrl: wavFile.downloadUrl,
            metadata: wavFile.metadata,
            exportTimestamp: new Date().toISOString(),
            exportStatus: wavFile.downloadUrl ? 'available' : 'no_download_url'
          };
          
          patientFolder?.file(
            `${recordId}_${wavFile.field}_metadata.json`,
            JSON.stringify(wavMetadata, null, 2)
          );
        });
      }

      // ✅ เพิ่ม metadata file หลัก
      patientFolder?.file(
        `${recordId}_metadata.json`,
        JSON.stringify({
          userId,
          recordId,
          firstName,
          lastName,
          lastUpdate,
          exportTimestamp: new Date().toISOString(),
          collection: data.collection,
          tests: data.tests || [],
          wavFiles: wavFiles ? wavFiles.map((w: WavFile) => ({
            field: w.field,
            hasDownloadUrl: !!w.downloadUrl,
            exportStatus: w.downloadUrl ? 'exported' : 'no_url'
          })) : [],
          dataStructure: data.data ? Object.keys(data.data) : []
        }, null, 2)
      );
    });

    // ✅ CSV Processing - ต้องอยู่ใน folder เดียวกันกับ JSON
    console.log('📊 Processing CSV files...');
    const csvPromises = successfulExports.map(async ({ value }): Promise<CsvResult> => {
      const { userId, recordId, firstName, lastName, lastUpdate } = value;
      
      try {
        // ✅ ใช้ record_id เพื่อดึงข้อมูลที่ถูกต้อง
        let query = supabase
          .from('user_record_summary_with_users')
          .select('*')
          .eq('id', userId);

        // ✅ ถ้ามี record_id ให้ใช้ filter เพิ่ม
        if (recordId) {
          query = query.eq('record_id', recordId);
        }

        const { data: demographicData, error } = await query.single();

        if (error) throw error;

        if (demographicData) {
          const headers = Object.keys(demographicData);
          const values = Object.values(demographicData);
          const csvContent = [
            headers.join(','),
            values.map(value => {
              if (value === null || value === undefined) return '';
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            }).join(',')
          ].join('\n');
          
          return { 
            userId, 
            recordId,
            firstName,
            lastName,
            lastUpdate,
            csvData: csvContent, 
            success: true 
          };
        }
        
        return { 
          userId, 
          recordId,
          firstName,
          lastName,
          lastUpdate,
          csvData: null, 
          success: false 
        };
      } catch (error) {
        console.error(`Error fetching CSV data for ${userId}-${recordId}:`, error);
        return { 
          userId, 
          recordId,
          firstName,
          lastName,
          lastUpdate,
          csvData: null, 
          success: false 
        };
      }
    });

    const csvResults = await Promise.allSettled(csvPromises);

    // ✅ Add CSV files to ZIP - อยู่ใน folder เดียวกับ JSON
    csvResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.csvData) {
        const { userId, recordId, firstName, lastName, lastUpdate, csvData } = result.value;
        
        // ✅ ใช้ชื่อ folder เดียวกันกับ JSON files
        const safeLastUpdate = lastUpdate 
          ? new Date(lastUpdate).toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
          : 'no-timestamp';
        
        const patientFolderName = `${userId}_${safeLastUpdate}_${firstName}_${lastName}`.replace(/\s+/g, '_');
        
        console.log(`📄 Adding CSV to folder: ${patientFolderName}`);
        
        const patientFolder = zip.folder(`${folderName}/${patientFolderName}`);
        patientFolder?.file(`${recordId}_demographic_data.csv`, csvData);
      }
    });

    // ✅ Generate and download ZIP
    console.log('🗜️ Generating ZIP file...');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess(`✅ Successfully exported ${successfulExports.length} patient records in ${folderName}.zip`);
    setSelectedUsers(new Set());
    setSelectAll(false);

  } catch (err) {
    console.error('💥 Export error:', err);
    setError(
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Export failed'
    );
  } finally {
    setExportLoading(false);
  }
};

  if (!session) {
    return <AuthRedirect />
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="max-w-9xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Export Patient Records</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={selectedUsers.size === 0 || exportLoading}
            className="px-5 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? 'Exporting...' : `Export Selected (${selectedUsers.size})`}
          </button>
          <button
            onClick={handleLogout}
            className="px-5 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition duration-300"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

             {/* Search and Filter Section */}
       <div className="mb-6 p-4 bg-gray-50 rounded-lg">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Search Patient</label>
             <input
               type="text"
               placeholder="ID, Name, or Thai ID"
               value={searchId}
               onChange={(e) => {
                 setSearchId(e.target.value)
                 setCurrentPage(1)
               }}
               className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
             <select
               value={searchCondition}
               onChange={(e) => {
                 setSearchCondition(e.target.value)
                 setCurrentPage(1)
               }}
               className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             >
               {conditionOptions.map(({ value, label }) => (
                 <option key={value} value={value}>{label}</option>
               ))}
             </select>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
             <input
               type="date"
               value={startDate}
               onChange={(e) => {
                 setStartDate(e.target.value)
                 setCurrentPage(1)
               }}
               className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
             <input
               type="date"
               value={endDate}
               onChange={(e) => {
                 setEndDate(e.target.value)
                 setCurrentPage(1)
               }}
               className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
         </div>
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
          </p>
          <div className='flex gap-2'>
            <a href="/pages/records">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
                Back to Records
              </button>
            </a>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Data Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => setSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Age/Gender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Recorded</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Update</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Condition</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id + (user.last_update || '')} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.id}</div>
                      <div className="text-sm text-gray-500">{user.thaiid}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstname} {user.lastname}
                      </div>
                      <div className="text-sm text-gray-500">{user.recorder}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.source || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.age} years</div>
                      <div className="text-sm text-gray-500">{user.gender || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.province || '-'}</div>
                      <div className="text-sm text-gray-500">{user.region || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatToThaiTime(user.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatToThaiTime(user.last_update)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.prediction_risk === true && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          High Risk
                        </span>
                      )}
                      {user.prediction_risk === false && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Low Risk
                        </span>
                      )}
                      {user.prediction_risk === null && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No Data
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${                           !user.condition || user.condition === 'Not specified' ? 'bg-gray-100 text-gray-800' :                           user.condition === 'pd' || user.condition === 'pdm' ? 'bg-purple-100 text-purple-800' :                           user.condition === 'cdt7' ? 'bg-blue-100 text-blue-800' :                           user.condition === 'ctrl' ? 'bg-green-100 text-green-800' :                           'bg-yellow-100 text-yellow-800'                         }`}>
                          {user.condition || 'Not specified'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 rounded-b-lg">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">First</span>
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    ‹
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Last</span>
                    »
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
