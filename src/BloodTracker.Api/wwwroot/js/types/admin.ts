export interface AdminUserDto {
  id: string
  email: string
  displayName?: string
  isAdmin: boolean
  createdAt: string
  lastLoginAt?: string
  analysesCount: number
  coursesCount: number
  drugsCount: number
  workoutsCount: number
}

export interface AdminUserSummaryDto {
  id: string
  email: string
  displayName?: string
  isAdmin: boolean
  createdAt: string
  lastLoginAt?: string
  analyses: AdminAnalysisBrief[]
  activeCourse?: AdminCourseBrief
  drugCount: number
  workoutProgramCount: number
  dbSizeBytes: number
}

export interface AdminAnalysisBrief {
  id: string
  date: string
  label: string
}

export interface AdminCourseBrief {
  title: string
  startDate?: string
  endDate?: string
  isActive: boolean
}

export interface AdminStatsDto {
  totalUsers: number
  totalDbSizeBytes: number
  activeUsersLast7Days: number
  totalAnalyses: number
  totalCourses: number
  totalWorkouts: number
  recentRegistrations: RegistrationDay[]
}

export interface RegistrationDay {
  date: string
  count: number
}
