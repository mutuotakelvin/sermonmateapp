export type Sermon = {
  verses: string[]
  interpretation: string
  story?: string
}

export type SermonRequest = {
  topic: string
}

export type ApiError = {
  error: string
}

export type SavedSermon = {
  id: string
  title: string
  verses: string[]
  interpretation: string
  story?: string
  date: string
  color: string
  is_public?: boolean // Optional for future web use
}

export type MoodType = 
  | 'Happy' 
  | 'Grateful' 
  | 'Hopeful' 
  | 'Peaceful' 
  | 'Anxious' 
  | 'Sad' 
  | 'Overwhelmed' 
  | 'Angry'

export type MoodEntry = {
  id: string
  mood: MoodType
  reason: string[]
  customReason?: string
  date: string // ISO date string
  sermon?: Sermon
  aiAdvice?: string
}

export type MoodHistory = {
  entries: MoodEntry[]
}

export type WeeklyMoodSummary = {
  weekStart: string // ISO date
  weekEnd: string // ISO date
  entries: MoodEntry[]
  averageMood?: MoodType
  mostCommonMood?: MoodType
}


