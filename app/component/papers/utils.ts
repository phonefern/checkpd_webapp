import { PatientData } from './types';

export interface PatientFilters {
  condition?: string;
  other?: string;
  fromDate?: string;
  toDate?: string;
}

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

const toComparableDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const filterPatients = (
  patients: PatientData[],
  searchTerm: string,
  filters: PatientFilters = {}
) => {
  const { condition, other, fromDate, toDate } = filters;
  const normalizedSearchTerm = searchTerm?.trim().toLowerCase();
  const normalizedCondition = condition?.trim().toLowerCase();
  const normalizedOther = other?.trim().toLowerCase();
  const from = toComparableDate(fromDate);
  const to = toComparableDate(toDate);
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return patients.filter((patient) => {
    if (normalizedSearchTerm) {
      const matchesSearch =
        patient.thaiid?.toLowerCase().includes(normalizedSearchTerm) ||
        patient.first_name?.toLowerCase().includes(normalizedSearchTerm) ||
        patient.last_name?.toLowerCase().includes(normalizedSearchTerm) ||
        patient.hn_number?.toLowerCase().includes(normalizedSearchTerm);

      if (!matchesSearch) {
        return false;
      }
    }

    if (normalizedCondition) {
      const matchesCondition = patient.condition
        ?.toLowerCase()
        .includes(normalizedCondition);
      if (!matchesCondition) {
        return false;
      }
    }

    if (normalizedOther) {
      const matchesOther = patient.other
        ?.toLowerCase()
        .includes(normalizedOther);
      if (!matchesOther) {
        return false;
      }
    }

    if (from || to) {
      const patientDate = toComparableDate(patient.collection_date);
      if (!patientDate) {
        return false;
      }

      if (from && patientDate < from) {
        return false;
      }

      if (to && patientDate > to) {
        return false;
      }
    }

    return true;
  });
};

export const paginatePatients = (
  patients: PatientData[],
  currentPage: number,
  itemsPerPage: number
) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return patients.slice(startIndex, endIndex);
};