export interface Reminder {
  type: 'single' | 'daily' | 'weekly' | 'monthly';
  startDate: number;
  times: string[]; // e.g., ['09:00', '18:30']
  daysOfWeek?: number[]; // 0 for Sunday, 1 for Monday, etc.
  endDate?: number | null;
  nextDueDate?: number | null;
}

export interface JournalEntry {
    id: string;
    createdAt: number;
    content: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  categoryId: string | null;
  reminder: Reminder | null;
  journal: JournalEntry[];
  isPinned: boolean;
  color: string | null;
  deletedAt?: number | null;
}

export interface Category {
  id:string;
  name: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Template {
  id: string;
  title: string;
  content: string;
}