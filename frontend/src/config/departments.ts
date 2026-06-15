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
    id: 'ai-automation-engineer',
    name: 'AI Automation Engineer',
    sheetName: 'AI Automation Engineer',
    roles: ['AI Automation Engineer']
  },
  {
    id: 'web-developer',
    name: 'Web Developer',
    sheetName: 'Web Developer',
    roles: ['Web Developer']
  }
];
