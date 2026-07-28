export type Sermon = {
  verses: string[]
  interpretation: string
  story?: string
  prayer?: string
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
  prayer?: string
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



export type PrayerSlot = {
  id: string
  label: string
  hour: number
  minute: number
  /** Pre-filled suggestions start false — never schedule what wasn't asked for. */
  enabled: boolean
}

export type PrayerLogEntry = {
  id: string
  /** null when logged outside any slot ("I prayed just now"). */
  slotId: string | null
  loggedAt: Date
  /** "YYYY-MM-DD" in the user's local time. See lib/localDate.ts. */
  localDate: string
  note?: string
}
