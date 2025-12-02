"use client"
import React from "react"
// app/pages/storage/page.tsx
import { useState, useEffect, useMemo } from "react"
import {
    Search,
    Filter,
    Download,
    FileText,
    Image,
    FileJson,
    File,
    ChevronDown,
    ChevronUp,
    User,
    Calendar,
    FolderDown,
    CheckSquare,
    Square
} from "lucide-react"

type StorageUser = {
    user_id: string
    thaiid?: string | null
    firstname?: string | null
    lastname?: string | null
    condition?: string | null
    last_migrate?: string | null
    timestamp?: string | null
    prediction_risk?: boolean | null
}


type RecordItem = {
    record_id: string
    condition?: string | null
    storage_base_path?: string
    [key: string]: any
}

type FileItem = {
    Key: string
    Size?: number
    LastModified?: string
}

export default function StoragePage() {
    // State สำหรับข้อมูล
    const [users, setUsers] = useState<StorageUser[]>([])
    const [selectedUser, setSelectedUser] = useState<string | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [records, setRecords] = useState<RecordItem[]>([])
    const [files, setFiles] = useState<FileItem[]>([])

    // State สำหรับ UI
    const [loading, setLoading] = useState({
        users: true,
        records: false,
        files: false
    })
    const [expandedUser, setExpandedUser] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [conditionFilter, setConditionFilter] = useState<string>("all")
    const [downloading, setDownloading] = useState<string | null>(null)
    const [bulkDownloading, setBulkDownloading] = useState(false)

    // ดึงข้อมูลผู้ป่วย
    useEffect(() => {
        fetch("/api/storage/list-users")
            .then(res => res.json())
            .then((data) => {
                setUsers(Array.isArray(data) ? data : [])
                setLoading(prev => ({ ...prev, users: false }))
            })
            .catch(() => setLoading(prev => ({ ...prev, users: false })))
    }, [])

    // ดึงข้อมูล records เมื่อเลือกผู้ป่วย
    const fetchRecords = async (userId: string) => {
        setSelectedUser(userId)
        setLoading(prev => ({ ...prev, records: true }))

        try {
            const url = `/api/storage/list-records?user_id=${encodeURIComponent(userId)}`
            const res = await fetch(url)
            if (!res.ok) throw new Error("Unable to load records")
            const data = await res.json()
            setRecords(Array.isArray(data) ? data : [])
            setFiles([]) // รีเซ็ตไฟล์เมื่อเปลี่ยนผู้ป่วย
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(prev => ({ ...prev, records: false }))
        }
    }

    // ดึงข้อมูลไฟล์เมื่อคลิกขยาย record
    const fetchFiles = async (userId: string, record: RecordItem) => {
        const basePath = record.storage_base_path || `${userId}/${record.record_id}/`

        if (expandedUser === record.record_id) {
            setExpandedUser(null)
            return
        }

        setExpandedUser(record.record_id)
        setLoading(prev => ({ ...prev, files: true }))

        try {
            const url = `/api/storage/list-files?base_path=${encodeURIComponent(basePath)}`
            const res = await fetch(url)
            if (!res.ok) throw new Error("Unable to load files")
            const data = await res.json()
            setFiles(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(prev => ({ ...prev, files: false }))
        }
    }

    // Filter ผู้ป่วย
    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase()

        return users.filter(user => {
            if (
                conditionFilter !== "all" &&
                user.condition?.toLowerCase() !== conditionFilter
            ) {
                return false
            }

            const fullName = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim()

            return (
                user.user_id?.toLowerCase().includes(term) ||
                (user.thaiid ?? "").toLowerCase().includes(term) ||
                fullName.toLowerCase().includes(term)
            )
        })
    }, [users, searchTerm, conditionFilter])

    // Toggle เลือกผู้ป่วยหลายคน
    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    // เลือก/ไม่เลือกทั้งหมด
    const toggleSelectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([])
        } else {
            setSelectedUsers(filteredUsers.map(user => user.user_id))
        }
    }

    // ดาวน์โหลดไฟล์
    const downloadFile = async (fullKey: string) => {
        try {
            setDownloading(fullKey)
            const url = `/api/storage/download-file?path=${encodeURIComponent(fullKey)}`
            const urlRes = await fetch(url)

            if (!urlRes.ok) throw new Error("Download failed")
            const { signedUrl } = await urlRes.json()

            window.open(signedUrl, "_blank")
        } finally {
            setDownloading(null)
        }
    }

    // ดาวน์โหลด ZIP สำหรับ record เดียว
    const downloadZip = (userId: string, recordId: string) => {
        const params = new URLSearchParams({
            user_id: userId,
            record_id: recordId,
        })
        window.open(`/api/storage/download-zip?${params.toString()}`, "_blank")
    }

    // ดาวน์โหลด ZIP สำหรับผู้ป่วยเดียว (ตาม condition filter)
    const downloadSingleUserZip = () => {
        if (!selectedUser) return

        // ใช้ API bulk เดียวกัน แต่ส่ง user_ids แค่ 1 คน
        const data = {
            user_ids: [selectedUser],
            condition: conditionFilter,
        }

        const params = new URLSearchParams({
            data: JSON.stringify(data),
        })

        window.open(`/api/storage/download-zip-multi?${params.toString()}`, "_blank")
    }

    // ดาวน์โหลด ZIP สำหรับผู้ป่วยหลายคน (ตาม condition filter)
    const downloadMultiUserZip = () => {
        if (selectedUsers.length === 0) {
            alert("กรุณาเลือกผู้ป่วยที่ต้องการดาวน์โหลด")
            return
        }

        const data = {
            user_ids: selectedUsers,
            condition: conditionFilter,
        }

        const params = new URLSearchParams({
            data: JSON.stringify(data),
        })

        setBulkDownloading(true)

        try {
            window.open(`/api/storage/download-zip-multi?${params.toString()}`, "_blank")
        } finally {
            // window.open trigger ได้ทันที จึง reset state ได้เลย
            setBulkDownloading(false)
        }
    }

    const formatToThaiTime = (timestamp: string | null | undefined) => {
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

    // Helper functions
    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith(".json")) return <FileJson className="w-4 h-4 text-amber-600" />
        if (fileName.match(/\.(jpg|jpeg|png)$/i)) return <Image className="w-4 h-4 text-blue-600" />
        if (fileName.match(/\.(txt|md)$/i)) return <FileText className="w-4 h-4 text-gray-600" />
        return <File className="w-4 h-4 text-gray-400" />
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "-"
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
            <div className="min-h-screen bg-gray-50 p-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">File Storage Management</h1>
                    <p className="text-gray-600">จัดการไฟล์และข้อมูลของผู้ป่วย</p>
                </div>

                {/* Search and Filter Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาผู้ป่วยด้วย ID, ชื่อ หรือบัตรประชาชน..."
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" />
                            <select
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={conditionFilter}
                                onChange={e => setConditionFilter(e.target.value)}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="pd">PD</option>
                                <option value="ctrl">Control</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleSelectAll}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title={selectedUsers.length === filteredUsers.length ? "ไม่เลือกทั้งหมด" : "เลือกทั้งหมด"}
                                >
                                    {selectedUsers.length === filteredUsers.length ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                <span className="text-sm text-gray-600">
                                    เลือก {selectedUsers.length} จาก {filteredUsers.length} คน
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {selectedUser && (
                                <button
                                    onClick={downloadSingleUserZip}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    ดาวน์โหลดผู้ป่วยที่เลือก
                                </button>
                            )}

                            <button
                                onClick={downloadMultiUserZip}
                                disabled={selectedUsers.length === 0 || bulkDownloading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FolderDown className="w-4 h-4" />
                                {bulkDownloading ? "กำลังเตรียมไฟล์..." : `ดาวน์โหลด ${selectedUsers.length} คน`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content - Table View */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">รายการผู้ป่วย</h2>
                                <p className="text-sm text-gray-600">
                                    {filteredUsers.length} จากทั้งหมด {users.length} คน
                                    {conditionFilter !== 'all' && ` (Condition: ${conditionFilter})`}
                                </p>
                            </div>
                            <div className="text-sm text-gray-600">
                                Filter: {conditionFilter === 'all' ? 'ทั้งหมด' : conditionFilter}
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                        เลือก
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Recorded
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Thai ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Risk
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Condition
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Migrate
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading.users ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            ไม่พบข้อมูลผู้ป่วย
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <React.Fragment key={user.user_id}>
                                            {/* User Row */}
                                            <tr
                                                className={`hover:bg-gray-50 transition-colors ${selectedUser === user.user_id ? 'bg-blue-50' : ''
                                                    }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.includes(user.user_id)}
                                                        onChange={() => toggleUserSelection(user.user_id)}
                                                        className="h-4 w-4 text-blue-600 rounded"
                                                    />
                                                </td>
                                                <td
                                                    className="px-6 py-4 cursor-pointer"
                                                    onClick={() => fetchRecords(user.user_id)}
                                                >
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <User className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {user.firstname && user.lastname
                                                                    ? `${user.firstname} ${user.lastname}`
                                                                    : 'ไม่ระบุชื่อ'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                ID: {user.user_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatToThaiTime(user.timestamp)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{user.thaiid || '-'}</div>
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
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.condition === 'pd'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {user.condition || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.last_migrate
                                                        ? new Date(user.last_migrate).toLocaleDateString('th-TH')
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => fetchRecords(user.user_id)}
                                                        className={`px-3 py-1 rounded-md ${selectedUser === user.user_id
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {selectedUser === user.user_id ? 'กำลังดู' : 'เลือกดู'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Selected User's Records */}
                                            {selectedUser === user.user_id && (
                                                <tr className="bg-blue-50">
                                                    <td colSpan={6} className="px-6 py-4">
                                                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                                                            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                                                                <div className="flex items-center justify-between">
                                                                    <h3 className="font-semibold text-gray-900">
                                                                        Records ของ {user.firstname} {user.lastname}
                                                                    </h3>
                                                                    {loading.records && (
                                                                        <span className="text-sm text-gray-500">กำลังโหลด...</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {records.length === 0 && !loading.records ? (
                                                                <div className="px-4 py-8 text-center text-gray-500">
                                                                    ไม่มีข้อมูล records
                                                                </div>
                                                            ) : (
                                                                <div className="divide-y divide-gray-200">
                                                                    {records.map((record) => (
                                                                        <div key={record.record_id} className="p-4 hover:bg-white">
                                                                            <div
                                                                                className="flex items-center justify-between cursor-pointer"
                                                                                onClick={() => fetchFiles(user.user_id, record)}
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        {expandedUser === record.record_id ? (
                                                                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                                                                        ) : (
                                                                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                                                                        )}
                                                                                        <span className="font-medium">{record.record_id}</span>
                                                                                    </div>
                                                                                    {record.condition && (
                                                                                        <span className={`px-2 py-1 text-xs rounded-full ${record.condition === 'pd'
                                                                                            ? 'bg-red-100 text-red-800'
                                                                                            : 'bg-green-100 text-green-800'
                                                                                            }`}>
                                                                                            {record.condition}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            downloadZip(user.user_id, record.record_id)
                                                                                        }}
                                                                                        className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                                                                    >
                                                                                        <Download className="w-4 h-4" />
                                                                                        ZIP
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Files under record */}
                                                                            {expandedUser === record.record_id && (
                                                                                <div className="mt-4 ml-8 border border-gray-200 rounded-lg overflow-hidden">
                                                                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-sm font-medium">ไฟล์ทั้งหมด</span>
                                                                                            {loading.files && (
                                                                                                <span className="text-xs text-gray-500">กำลังโหลด...</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {files.length === 0 && !loading.files ? (
                                                                                        <div className="px-4 py-4 text-center text-sm text-gray-500">
                                                                                            ไม่พบไฟล์
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="divide-y divide-gray-100">
                                                                                            {files.map((file) => {
                                                                                                const fileName = file.Key.split("/").pop() || ""
                                                                                                return (
                                                                                                    <div key={file.Key} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                                                                                                        <div className="flex items-center gap-3">
                                                                                                            {getFileIcon(fileName)}
                                                                                                            <span className="text-sm">{fileName}</span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-4">
                                                                                                            <span className="text-xs text-gray-500">
                                                                                                                {formatFileSize(file.Size)}
                                                                                                            </span>
                                                                                                            <button
                                                                                                                onClick={() => downloadFile(file.Key)}
                                                                                                                disabled={downloading === file.Key}
                                                                                                                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                                                                                                            >
                                                                                                                {downloading === file.Key ? (
                                                                                                                    <>กำลังดาวน์โหลด...</>
                                                                                                                ) : (
                                                                                                                    <>
                                                                                                                        <Download className="w-4 h-4" />
                                                                                                                        ดาวน์โหลด
                                                                                                                    </>
                                                                                                                )}
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )
                                                                                            })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

