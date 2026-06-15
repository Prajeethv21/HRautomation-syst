export interface DepartmentConfig {
  id: string;
  name: string;
  sheetName: string;
  roles: string[];
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    id: 'sustainability',
    name: 'Sustainability',
    sheetName: 'Sustainability',
    roles: ['Sustainability']
  },
  {
    id: 'ai-data-engineer',
    name: 'AI/Data Engineer',
    sheetName: 'AI Automation Engineer',
    roles: ['AI Automation Engineer', 'AI/Data Engineer']
  },
  {
    id: 'web-developer',
    name: 'Web Developer',
    sheetName: 'Web Devloper',
    roles: ['Web Developer']
  },
  {
    id: 'marketing',
    name: 'Marketing',
    sheetName: 'Marketing',
    roles: ['Marketing']
  },
  {
    id: 'creative',
    name: 'Creative',
    sheetName: 'Creative',
    roles: ['Creative']
  },
  {
    id: 'others',
    name: 'Others',
    sheetName: 'Others',
    roles: ['Others', 'Other']
  }
];
