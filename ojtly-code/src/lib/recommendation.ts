// src/lib/recommendation.ts

export interface Job {
  id: number;
  title: string;
  company: string;
  salary: number; 
  location: string;
  role: string;
  mode: 'On-Site' | 'Remote' | 'Hybrid'; 
  description: string;
  lat: number;  // Added for Map
  lng: number;  // Added for Map
}

export interface UserPreferences {
  targetSalary: number;
  preferredRole: string;
  preferredMode: 'On-Site' | 'Remote' | 'Hybrid';
}

const roleMap: Record<string, number> = {
  'Developer': 1,
  'Designer': 2,
  'Data Analyst': 3,
};

const modeMap: Record<string, number> = {
  'Remote': 0,
  'Hybrid': 1,
  'On-Site': 2,
};

function calculateDistance(job: Job, preferences: UserPreferences): number {
  const maxSalary = 50000;
  const salaryDiff = (job.salary - preferences.targetSalary) / maxSalary;

  const jobRoleVal = roleMap[job.role] || 0;
  const prefRoleVal = roleMap[preferences.preferredRole] || 0;
  const roleDiff = jobRoleVal - prefRoleVal;

  const jobModeVal = modeMap[job.mode] || 0;
  const prefModeVal = modeMap[preferences.preferredMode] || 0;
  const modeDiff = jobModeVal - prefModeVal;

  const distance = Math.sqrt(
    Math.pow(salaryDiff * 1, 2) + 
    Math.pow(roleDiff * 2, 2) + 
    Math.pow(modeDiff * 0.5, 2)
  );

  return distance;
}

export function getRecommendations(
  jobs: Job[], 
  preferences: UserPreferences, 
  k: number = 3
): Job[] {
  const jobsWithDistance = jobs.map(job => ({
    job: job,
    distance: calculateDistance(job, preferences)
  }));

  jobsWithDistance.sort((a, b) => a.distance - b.distance);

  return jobsWithDistance.slice(0, k).map(item => item.job);
}