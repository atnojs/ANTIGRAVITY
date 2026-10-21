/**
 * Type definitions for Agenda Digital
 */

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type EntityType = 'appointment' | 'task' | 'note';

export interface AudioRecord {
  id: string;
  file_path: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number;
  transcription?: string;
  created_at: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day: number | boolean;
  audio_id?: string | null;
  audio_file?: string | null;
  audio_duration?: number | null;
  audio_transcription?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgendaTask {
  id: string;
  title: string;
  notes?: string;
  due_date?: string | null;
  due_time?: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  completed_at?: string | null;
  audio_id?: string | null;
  audio_file?: string | null;
  audio_duration?: number | null;
  audio_transcription?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgendaNote {
  id: string;
  content: string;
  category: string;
  tags?: string | string[];
  is_pinned: number | boolean;
  is_archived?: number | boolean;
  audio_id?: string | null;
  audio_file?: string | null;
  audio_duration?: number | null;
  audio_transcription?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SystemStats {
  eventsCount: number;
  pendingTasksCount: number;
  completedTasksCount: number;
  notesCount: number;
  audiosCount: number;
  totalAudioDiskBytes: number;
}

export interface AudioClassificationResult {
  transcription: string;
  entity_type: EntityType;
  confidence: number;
  title: string;
  summary?: string;
  appointment_details?: {
    start_time?: string;
    end_time?: string;
    location?: string;
    is_all_day?: boolean;
  };
  task_details?: {
    due_date?: string;
    due_time?: string;
    priority?: PriorityLevel;
  };
  note_details?: {
    category?: string;
    tags?: string[];
  };
}

export interface AudioProcessResponse {
  success: boolean;
  audio_id: string | null;
  audio_url: string | null;
  duration_seconds: number;
  file_size_bytes: number;
  classification: AudioClassificationResult;
}
