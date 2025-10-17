import { useState, useMemo } from "react";
import Link from "next/link";
import { PatientData } from './types';
import { filterPatients, paginatePatients, formatDate, getRiskBadgeColor } from './utils';
import { assessmentLabels } from './constants';
import ScoreIndicator from '@/app/component/papers/ScoreIndicator';
import Pagination from '@/app/component/papers/Pagination';

interface PapersTableProps {
    patients: PatientData[];
    searchTerm: string;
    onSearchChange: (term: string) => void;
    currentPage: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onEditPatient: (patient: PatientData) => void;
    onDeletePatient: (patientId: number, patientName: string) => void;
    onViewHistory: (patient: PatientData) => void;
}

const PapersTable = ({
    patients,
    searchTerm,
    onSearchChange,
    currentPage,
    onPageChange,
    itemsPerPage,
    onEditPatient,
    onDeletePatient,
    onViewHistory
}: PapersTableProps) => {
    const filteredPatients = useMemo(() =>
        filterPatients(patients, searchTerm),
        [patients, searchTerm]
    );

    const paginatedPatients = useMemo(() =>
        paginatePatients(filteredPatients, currentPage, itemsPerPage),
        [filteredPatients, currentPage, itemsPerPage]
    );

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Search and Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">รายชื่อผู้ป่วย</h2>
                        <p className="text-sm text-gray-600">ทั้งหมด {filteredPatients.length} คน</p>
                    </div>
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="ค้นหา ID, ชื่อ, นามสกุล, HN..."
                            value={searchTerm}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                onPageChange(1);
                            }}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ข้อมูลผู้ป่วย
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                คะแนนแบบประเมิน
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ความเสี่ยง
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                อาการ
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                อื่นๆ
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                การดำเนินการ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedPatients.map((patient) => (
                            <TableRow
                                key={patient.id}
                                patient={patient}
                                onEdit={onEditPatient}
                                onDelete={onDeletePatient}
                                onViewHistory={onViewHistory}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredPatients.length}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
            />
        </div>
    );
};

// Sub-component for table row
interface TableRowProps {
    patient: PatientData;
    onEdit: (patient: PatientData) => void;
    onDelete: (patientId: number, patientName: string) => void;
    onViewHistory: (patient: PatientData) => void;
}

const TableRow = ({ patient, onEdit, onDelete, onViewHistory }: TableRowProps) => {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4">
                <PatientInfo patient={patient} />
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-wrap">
                    {Object.entries(assessmentLabels).map(([key, label]) => (
                        <ScoreIndicator
                            key={key}
                            score={patient.risk_factors?.[key as keyof typeof assessmentLabels] ?? null}
                            assessmentKey={key as keyof typeof assessmentLabels}
                        />
                    ))}
                </div>
            </td>
            <td className="px-6 py-4">
                <RiskBadge risk={patient.prediction_risk} />
            </td>
            <td className="text-sm px-6 py-4">
                {patient.condition || '-'}
            </td>
            <td className="text-sm px-6 py-4">
                {patient.other || '-'}
            </td>
            <td className="px-6 py-4">
                <ActionButtons
                    patient={patient}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewHistory={onViewHistory}
                />
            </td>
        </tr>
    );
};

// Sub-component for patient information
const PatientInfo = ({ patient }: { patient: PatientData }) => (
    <div className="flex items-center">
        <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        </div>
        <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
                {patient.first_name} {patient.last_name}
            </div>
            <div className="text-sm text-gray-500">
                {patient.thaiid ? `ID: ${patient.thaiid}` : 'ไม่มีเลขบัตรประชาชน'}
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div>อายุ: {patient.age} ปี • จังหวัด: {patient.province} • เพศ: {patient.gender}</div>
                <div>HN: {patient.hn_number || '-'} • วันที่: {formatDate(patient.collection_date)}</div>
            </div>
        </div>
    </div>
);

// Sub-component for risk badge
const RiskBadge = ({ risk }: { risk: boolean | null | undefined }) => {
    if (risk === null || risk === undefined) {
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                ยังไม่ประเมิน
            </span>
        );
    }

    const badgeClass = getRiskBadgeColor(risk);
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
            {risk ? 'เสี่ยง' : 'ไม่เสี่ยง'}
        </span>
    );
};

// Sub-component for action buttons
const ActionButtons = ({
    patient,
    onEdit,
    onDelete,
    onViewHistory
}: {
    patient: PatientData;
    onEdit: (patient: PatientData) => void;
    onDelete: (patientId: number, patientName: string) => void;
    onViewHistory: (patient: PatientData) => void;
}) => (
    <div className="flex flex-col gap-2">
        <button
            onClick={() => onViewHistory(patient)}
            className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors text-center"
        >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            ดูประวัติ
        </button>
        <Link
            href={`/pages/papers/edit/${patient.id}`}
            className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors text-center"
        >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            แก้ไขข้อมูลส่วนตัว
        </Link>
        <button
            onClick={() => onEdit(patient)}
            className="inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            เพิ่ม/แก้ไข
        </button>
        <Link
            href={`/pages/papers/assessment?patient_thaiid=${patient.thaiid}`}
            className="inline-flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors text-center"
        >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            เริ่มทำแบบทดสอบ
        </Link>
        <button
            onClick={() => onDelete(patient.id, `${patient.first_name} ${patient.last_name}`)}
            className="inline-flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
        >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            ลบข้อมูล
        </button>
        <button
            onClick={() => window.open(`/api/generate-pdf?thaiid=${patient.thaiid}`, "_blank")}
            className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors"
        >
            พิมพ์เอกสาร
        </button>
    </div>
);

export default PapersTable;