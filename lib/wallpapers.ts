export type WallpaperCategory = 'Nature' | 'Sky' | 'Minimal';

export interface Wallpaper {
  key: string;
  label: string;
  category: WallpaperCategory;
  gradient: [string, string]; // top -> bottom
}

// Curated wallpaper backgrounds in the muted card-palette spirit.
export const WALLPAPERS: Wallpaper[] = [
  { key: 'misty-forest',  label: 'Misty Forest',  category: 'Nature',  gradient: ['#5A6E5A', '#38463A'] },
  { key: 'calm-meadow',   label: 'Calm Meadow',   category: 'Nature',  gradient: ['#7E9B6E', '#566E4C'] },
  { key: 'dawn-sky',      label: 'Dawn Sky',      category: 'Sky',     gradient: ['#8FB4D8', '#5E86B0'] },
  { key: 'night-sky',     label: 'Night Sky',     category: 'Sky',     gradient: ['#3B4A6B', '#232B44'] },
  { key: 'minimal-paper', label: 'Minimal Paper', category: 'Minimal', gradient: ['#F4EFE6', '#E4D9C6'] },
  { key: 'sunset-ridge',  label: 'Sunset Ridge',  category: 'Minimal', gradient: ['#B0623E', '#7E3F27'] },
];

export const WALLPAPER_CATEGORIES: ('All' | WallpaperCategory)[] = ['All', 'Nature', 'Sky', 'Minimal'];

export type WallpaperFont = 'serif' | 'sans';

export interface TextColorOption {
  key: string;
  label: string;
  color: string;
}

export const TEXT_COLORS: TextColorOption[] = [
  { key: 'white', label: 'White', color: '#FFFFFF' },
  { key: 'cream', label: 'Cream', color: '#F2EFE8' },
  { key: 'tan',   label: 'Tan',   color: '#E7C98B' },
  { key: 'dark',  label: 'Dark',  color: '#2B2724' },
];
