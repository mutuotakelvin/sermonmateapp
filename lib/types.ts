export type Sermon = {
  verses: string[]
  interpretation: string
  story: string
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
  story: string
  date: string
  color: string
  is_public?: boolean // Optional for future web use
}


