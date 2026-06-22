export const PEDIATRIC_VITAL_RANGES = [
  { maxAgeMonths: 3, rr2: [10, 80], rr1: [20, 70], rrNormal: [30, 60], hr2: [40, 230], hr1: [65, 205], hrNormal: [90, 180] },
  { maxAgeMonths: 6, rr2: [10, 80], rr1: [20, 70], rrNormal: [30, 60], hr2: [40, 210], hr1: [63, 180], hrNormal: [80, 160] },
  { maxAgeMonths: 12, rr2: [10, 60], rr1: [17, 55], rrNormal: [25, 45], hr2: [40, 180], hr1: [60, 160], hrNormal: [80, 140] },
  { maxAgeMonths: 36, rr2: [10, 40], rr1: [15, 35], rrNormal: [20, 30], hr2: [40, 165], hr1: [58, 145], hrNormal: [75, 130] },
  { maxAgeMonths: 72, rr2: [8, 32], rr1: [12, 28], rrNormal: [16, 24], hr2: [40, 140], hr1: [55, 125], hrNormal: [70, 110] },
  { maxAgeMonths: 120, rr2: [8, 26], rr1: [10, 24], rrNormal: [14, 20], hr2: [30, 120], hr1: [45, 105], hrNormal: [60, 90] },
];

export function getPediatricVitalRange(ageYears: number) {
  const ageMonths = Math.max(0, ageYears * 12);
  return PEDIATRIC_VITAL_RANGES.find((range) => ageMonths <= range.maxAgeMonths) || PEDIATRIC_VITAL_RANGES[PEDIATRIC_VITAL_RANGES.length - 1];
}
