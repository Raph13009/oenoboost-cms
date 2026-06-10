const RECOGNITION_YEAR_MIN = 1800;
const RECOGNITION_YEAR_MAX = 2100;

export function validateRecognitionYear(year: number | null | undefined): string | null {
  if (year == null) return null;
  if (!Number.isInteger(year) || year < RECOGNITION_YEAR_MIN || year > RECOGNITION_YEAR_MAX) {
    return `La date AOP doit être une année entre ${RECOGNITION_YEAR_MIN} et ${RECOGNITION_YEAR_MAX}.`;
  }
  return null;
}
