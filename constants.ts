import type { WeightCriteria } from './types';

export const initialWeights: WeightCriteria = {
  jdFit: {
    key: 'jdFit',
    name: 'Phù hợp JD (Job Fit)',
    icon: 'fa-solid fa-bullseye',
    color: 'text-sky-400',
    children: [
      { key: 'overallFit', name: 'Mức độ phù hợp', weight: 20 },
    ],
  },
  workExperience: {
    key: 'workExperience',
    name: 'Kinh nghiệm',
    icon: 'fa-solid fa-briefcase',
    color: 'text-green-400',
    children: [
      { key: 'totalYears', name: 'Số năm tổng', weight: 8 },
      { key: 'relevantExperience', name: 'Kinh nghiệm chuyên ngành', weight: 12 },
    ],
  },
  technicalSkills: {
    key: 'technicalSkills',
    name: 'Kỹ năng',
    icon: 'fa-solid fa-gears',
    color: 'text-purple-400',
    children: [
      { key: 'hardSkills', name: 'Kỹ năng cứng/Technical', weight: 10 },
      { key: 'softSkills', name: 'Kỹ năng mềm/Soft', weight: 5 },
    ],
  },
  achievements: {
    key: 'achievements',
    name: 'Thành tựu/KPI',
    icon: 'fa-solid fa-trophy',
    color: 'text-yellow-400',
    children: [
      { key: 'quantifiableKPI', name: 'KPI định lượng', weight: 7 },
      { key: 'awardsAndCertificates', name: 'Giải thưởng/chứng nhận', weight: 3 },
    ],
  },
  education: {
    key: 'education',
    name: 'Học vấn',
    icon: 'fa-solid fa-graduation-cap',
    color: 'text-indigo-400',
    children: [
      { key: 'degree', name: 'Học vị', weight: 5 },
      { key: 'grade', name: 'Loại bằng', weight: 1 },
      { key: 'certificates', name: 'Chứng chỉ khác', weight: 4 },
    ],
  },
  language: {
    key: 'language',
    name: 'Ngôn ngữ',
    icon: 'fa-solid fa-language',
    color: 'text-orange-400',
    children: [
      { key: 'proficiency', name: 'Mức độ thành thạo', weight: 8 },
    ],
  },
  professionalism: {
    key: 'professionalism',
    name: 'Chuyên nghiệp',
    icon: 'fa-solid fa-file-invoice',
    color: 'text-cyan-400',
    children: [
      { key: 'format', name: 'Bố cục CV', weight: 2 },
      { key: 'clarity', name: 'Rõ ràng', weight: 2 },
      { key: 'grammar', name: 'Ngữ pháp', weight: 1 },
    ],
  },
  jobTenure: {
    key: 'jobTenure',
    name: 'Gắn bó & Lịch sử CV',
    icon: 'fa-solid fa-hourglass-half',
    color: 'text-lime-400',
    children: [
      { key: 'averageTenure', name: 'Tenure trung bình', weight: 3 },
      { key: 'jobHoppingRate', name: 'Tỷ lệ nhảy việc', weight: 2 },
    ],
  },
  cultureFit: {
    key: 'cultureFit',
    name: 'Phù hợp văn hoá',
    icon: 'fa-solid fa-users-gear',
    color: 'text-pink-400',
    children: [
      { key: 'valueAlignment', name: 'Giá trị cá nhân', weight: 7 },
    ],
  },
};

export const MODEL_NAME = 'gemini-2.5-flash';