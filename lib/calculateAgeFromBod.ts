// app/lib/pdf/calculateAgeFromBod.ts
import { Timestamp } from 'firebase-admin/firestore';

export function calculateAgeFromBod(bod: any): number | null {
  try {
    let birthDate: Date;

    if (bod instanceof Timestamp) {
      birthDate = bod.toDate();
    } else if (typeof bod === 'string') {
      birthDate = new Date(bod.replace('at', ''));
    } else if (bod instanceof Date) {
      birthDate = bod;
    } else {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
}
