import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'

export type ExportUser = {
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

export interface WavFile {
  field: string
  downloadUrl: string
  metadata: unknown
}

interface ExportRecord {
  userId: string
  recordId: string
  firstName: string
  lastName: string
  lastUpdate: string
  data: Record<string, unknown> & {
    wavFiles?: WavFile[]
    data?: Record<string, unknown>
    tests?: string[]
    collection?: string
  }
  wavFiles: WavFile[]
}

interface CsvResult {
  userId: string
  recordId: string
  firstName: string
  lastName: string
  lastUpdate: string
  csvData: string | null
  success: boolean
}

export type ExportZipResult =
  | { ok: true; successfulCount: number; folderName: string; warning?: string }
  | { ok: false; error: string }

export const getRecordKey = (record: Pick<ExportUser, 'id' | 'record_id'>) =>
  `${record.id}||${record.record_id || ''}`

export const formatToThaiTime = (timestamp: string | undefined) => {
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

export async function exportRecordsToZip(exportRecords: ExportUser[]): Promise<ExportZipResult> {
  if (exportRecords.length === 0) {
    return { ok: false, error: 'Please select at least one record to export' }
  }

  try {
    console.log('📦 Records to export:', exportRecords.length)

    const exportPromises = exportRecords.map(async (record): Promise<ExportRecord> => {
      try {
        const url = `/api/export/${record.id}${record.record_id ? `?record_id=${encodeURIComponent(record.record_id)}` : ''}`
        console.log(`🔄 Exporting: ${record.id} - ${record.record_id}`)

        const res = await fetch(url)

        if (!res.ok) {
          const { error } = await res.json()
          throw new Error(
            `Failed to export ${record.id} (record: ${record.record_id}): ${error?.message || 'Export failed'}`
          )
        }

        const data = await res.json()

        console.log(`🎵 WAV files data for ${record.id}:`, {
          hasWavFiles: !!data.wavFiles,
          count: data.wavFiles?.length || 0,
          wavFiles: data.wavFiles || []
        })

        return {
          userId: record.id,
          recordId: record.record_id || '',
          firstName: record.firstname,
          lastName: record.lastname,
          lastUpdate: record.last_update || record.timestamp || '',
          data,
          wavFiles: data.wavFiles || []
        }
      } catch (error) {
        console.error(`Export failed for record ${record.record_id}:`, error)
        throw error
      }
    })

    const results = await Promise.allSettled(exportPromises)
    const failedExports = results.filter(result => result.status === 'rejected')
    const successfulExports = results.filter(result => result.status === 'fulfilled') as PromiseFulfilledResult<ExportRecord>[]
    let warning: string | undefined

    if (failedExports.length > 0) {
      console.error('❌ Failed exports:', failedExports)
      warning = `Failed to export ${failedExports.length} records. Check console for details.`
    }

    if (successfulExports.length === 0) {
      return { ok: false, error: 'No records were successfully exported' }
    }

    console.log('✅ Successful exports:', successfulExports.length)

    const zip = new JSZip()
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
    const folderName = `patient_records_export_${timestamp}`

    console.log('🎵 Starting WAV files download...')

    const allWavDownloadPromises: Promise<{success: boolean, fileName: string, error?: string}>[] = []

    successfulExports.forEach(({ value }) => {
      const { userId, recordId, firstName, lastName, lastUpdate, wavFiles } = value

      if (!wavFiles || wavFiles.length === 0) {
        console.log(`📭 No WAV files for ${userId}_${recordId}`)
        return
      }

      const safeLastUpdate = lastUpdate
        ? new Date(lastUpdate).toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
        : 'no-timestamp'

      const patientFolderName = `${userId}_${safeLastUpdate}_${firstName}_${lastName}`.replace(/\s+/g, '_')

      console.log(`🎵 Processing ${wavFiles.length} WAV files for ${patientFolderName}`)

      wavFiles.forEach((wavFile: WavFile) => {
        const downloadPromise = async () => {
          try {
            console.log(`⬇️ Downloading WAV: ${wavFile.field} from: ${wavFile.downloadUrl}`)

            if (!wavFile.downloadUrl) {
              console.error(`❌ No downloadUrl for ${wavFile.field}`)
              return { success: false, fileName: `${recordId}_${wavFile.field}.wav`, error: 'No download URL' }
            }

            const apiUrl = `/api/export/${userId}?record_id=${recordId}&download=${wavFile.field}`
            const response = await fetch(apiUrl)

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const blob = await response.blob()

            if (blob.type && !blob.type.includes('audio') && !blob.type.includes('wav')) {
              console.warn(`⚠️ Downloaded file may not be WAV: ${blob.type}`)
            }

            const fileName = `${recordId}_${wavFile.field}.wav`

            const patientFolder = zip.folder(`${folderName}/${patientFolderName}`)
            patientFolder?.file(fileName, blob)

            console.log(`✅ Successfully added WAV: ${fileName} (${blob.size} bytes)`)
            return { success: true, fileName }
          } catch (error) {
            console.error(`❌ Failed to download WAV ${wavFile.field}:`, error)
            return {
              success: false,
              fileName: `${recordId}_${wavFile.field}.wav`,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        }

        allWavDownloadPromises.push(downloadPromise())
      })
    })

    if (allWavDownloadPromises.length > 0) {
      console.log(`⏳ Waiting for ${allWavDownloadPromises.length} WAV files to download...`)
      const wavResults = await Promise.allSettled(allWavDownloadPromises)

      const successfulWavDownloads = wavResults.filter(
        (result): result is PromiseFulfilledResult<{success: boolean, fileName: string}> =>
          result.status === 'fulfilled' && result.value.success
      )

      const failedWavDownloads = wavResults.filter(
        (result): result is PromiseFulfilledResult<{success: boolean, fileName: string, error?: string}> =>
          result.status === 'fulfilled' && !result.value.success
      )

      console.log(`✅ Successfully downloaded ${successfulWavDownloads.length} WAV files`)
      if (failedWavDownloads.length > 0) {
        console.warn(`⚠️ Failed to download ${failedWavDownloads.length} WAV files:`,
          failedWavDownloads.map(f => ({ fileName: f.value.fileName, error: f.value.error }))
        )
      }
    } else {
      console.log('📭 No WAV files to download')
    }

    successfulExports.forEach(({ value }) => {
      const { userId, recordId, firstName, lastName, lastUpdate, data, wavFiles } = value

      const safeLastUpdate = lastUpdate
        ? new Date(lastUpdate).toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
        : 'no-timestamp'

      const patientFolderName = `${userId}_${safeLastUpdate}_${firstName}_${lastName}`.replace(/\s+/g, '_')

      console.log(`📁 Creating folder: ${patientFolderName}`)

      const patientFolder = zip.folder(`${folderName}/${patientFolderName}`)

      if (data.data && data.tests) {
        data.tests.forEach((testType: string) => {
          if (data.data?.[testType]) {
            patientFolder?.file(
              `${recordId}_${testType}.json`,
              JSON.stringify(data.data[testType], null, 2)
            )
          }
        })
      }

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
          }

          patientFolder?.file(
            `${recordId}_${wavFile.field}_metadata.json`,
            JSON.stringify(wavMetadata, null, 2)
          )
        })
      }

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
      )
    })

    console.log('📊 Processing CSV files...')
    const csvPromises = successfulExports.map(async ({ value }): Promise<CsvResult> => {
      const { userId, recordId, firstName, lastName, lastUpdate } = value

      try {
        let query = supabase
          .from('user_record_summary_with_users')
          .select('*')
          .eq('id', userId)

        if (recordId) {
          query = query.eq('record_id', recordId)
        }

        const { data: demographicData, error } = await query.single()

        if (error) throw error

        if (demographicData) {
          const headers = Object.keys(demographicData)
          const values = Object.values(demographicData)
          const csvContent = [
            headers.join(','),
            values.map(value => {
              if (value === null || value === undefined) return ''
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return String(value)
            }).join(',')
          ].join('\n')

          return {
            userId,
            recordId,
            firstName,
            lastName,
            lastUpdate,
            csvData: csvContent,
            success: true
          }
        }

        return {
          userId,
          recordId,
          firstName,
          lastName,
          lastUpdate,
          csvData: null,
          success: false
        }
      } catch (error) {
        console.error(`Error fetching CSV data for ${userId}-${recordId}:`, error)
        return {
          userId,
          recordId,
          firstName,
          lastName,
          lastUpdate,
          csvData: null,
          success: false
        }
      }
    })

    const csvResults = await Promise.allSettled(csvPromises)

    csvResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.csvData) {
        const { userId, recordId, firstName, lastName, lastUpdate, csvData } = result.value

        const safeLastUpdate = lastUpdate
          ? new Date(lastUpdate).toISOString().slice(0, 19).replace(/[:\\/]/g, '-')
          : 'no-timestamp'

        const patientFolderName = `${userId}_${safeLastUpdate}_${firstName}_${lastName}`.replace(/\s+/g, '_')

        console.log(`📄 Adding CSV to folder: ${patientFolderName}`)

        const patientFolder = zip.folder(`${folderName}/${patientFolderName}`)
        patientFolder?.file(`${recordId}_demographic_data.csv`, csvData)
      }
    })

    console.log('🗜️ Generating ZIP file...')
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `${folderName}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { ok: true, successfulCount: successfulExports.length, folderName, warning }
  } catch (err) {
    console.error('💥 Export error:', err)
    return {
      ok: false,
      error: err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Export failed'
    }
  }
}
