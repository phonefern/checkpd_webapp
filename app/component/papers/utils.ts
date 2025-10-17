import { PatientData } from './types';

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  } catch {
    return dateString;
  }
};

export const getScoreStatus = (score: number | null) => {
  if (score === null) return 'missing';
  return 'completed';
};

export const getRiskBadgeColor = (risk: boolean | null) => {
  if (risk === null) return 'bg-gray-100 text-gray-600';
  return risk
    ? 'bg-red-100 text-red-700 border border-red-200'
    : 'bg-green-100 text-green-700 border border-green-200';
};

export const filterPatients = (patients: PatientData[], searchTerm: string) => {
  if (!searchTerm) return patients;

  return patients.filter(patient =>
    patient.thaiid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.hn_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const paginatePatients = (patients: PatientData[], currentPage: number, itemsPerPage: number) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return patients.slice(startIndex, endIndex);
};