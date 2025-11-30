export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PlanType = 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type CourseIntensity = 'short' | 'standard' | 'deep';
export type CourseStatus = 'draft_outline' | 'generating_lessons' | 'ready' | 'published';
export type FileSourceType = 'pdf' | 'docx' | 'pptx' | 'url' | 'text';
export type AudioStatus = 'none' | 'generating' | 'ready' | 'failed';
export type AudioJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VoiceType = 'male' | 'female';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan_type: PlanType;
          audio_addon: boolean;
          polar_customer_id: string | null;
          polar_subscription_id: string | null;
          subscription_status: string | null;
          subscription_ends_at: string | null;
          audio_addon_enabled: boolean;
          audio_addon_trial_used: boolean;
          audio_addon_expires_at: string | null;
          audio_addon_subscription_id: string | null;
          billing_cycle: string | null;
          theme_preference: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan_type?: PlanType;
          audio_addon?: boolean;
          polar_customer_id?: string | null;
          polar_subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_ends_at?: string | null;
          audio_addon_enabled?: boolean;
          audio_addon_trial_used?: boolean;
          audio_addon_expires_at?: string | null;
          audio_addon_subscription_id?: string | null;
          theme_preference?: string;
          billing_cycle?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan_type?: PlanType;
          audio_addon?: boolean;
          polar_customer_id?: string | null;
          polar_subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_ends_at?: string | null;
          audio_addon_enabled?: boolean;
          audio_addon_trial_used?: boolean;
          audio_addon_expires_at?: string | null;
          audio_addon_subscription_id?: string | null;
          billing_cycle?: string | null;
          theme_preference?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_type: PlanType;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          has_audio_addon: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_type: PlanType;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          has_audio_addon?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_type?: PlanType;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          has_audio_addon?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      usage_counters: {
        Row: {
          id: string;
          user_id: string;
          month: number;
          year: number;
          courses_created: number;
          audio_minutes_generated: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: number;
          year: number;
          courses_created?: number;
          audio_minutes_generated?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: number;
          year?: number;
          courses_created?: number;
          audio_minutes_generated?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          topic: string;
          level: CourseLevel;
          intensity: CourseIntensity;
          estimated_duration_hours: number | null;
          status: CourseStatus;
          outline_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          topic: string;
          level?: CourseLevel;
          intensity?: CourseIntensity;
          estimated_duration_hours?: number | null;
          status?: CourseStatus;
          outline_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          topic?: string;
          level?: CourseLevel;
          intensity?: CourseIntensity;
          estimated_duration_hours?: number | null;
          status?: CourseStatus;
          outline_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      file_sources: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          type: FileSourceType;
          title: string;
          raw_text: string | null;
          summary: string | null;
          storage_url: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          type: FileSourceType;
          title: string;
          raw_text?: string | null;
          summary?: string | null;
          storage_url?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string | null;
          type?: FileSourceType;
          title?: string;
          raw_text?: string | null;
          summary?: string | null;
          storage_url?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          module_index: number;
          lesson_index: number;
          title: string;
          objectives: string[] | null;
          markdown_content: string | null;
          lesson_status: string;
          is_manually_edited: boolean;
          audio_url: string | null;
          audio_duration_seconds: number | null;
          audio_status: AudioStatus;
          audio_voice_type: VoiceType | null;
          audio_generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          module_index: number;
          lesson_index: number;
          title: string;
          objectives?: string[] | null;
          markdown_content?: string | null;
          lesson_status?: string;
          is_manually_edited?: boolean;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          audio_status?: AudioStatus;
          audio_voice_type?: VoiceType | null;
          audio_generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          module_index?: number;
          lesson_index?: number;
          title?: string;
          objectives?: string[] | null;
          markdown_content?: string | null;
          lesson_status?: string;
          is_manually_edited?: boolean;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          audio_status?: AudioStatus;
          audio_voice_type?: VoiceType | null;
          audio_generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          completed: boolean;
          last_viewed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          completed?: boolean;
          last_viewed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          course_id?: string;
          completed?: boolean;
          last_viewed_at?: string;
          created_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          lesson_id: string;
          snippet_markdown: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          lesson_id: string;
          snippet_markdown: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          lesson_id?: string;
          snippet_markdown?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          polar_subscription_id: string | null;
          polar_event_id: string;
          payload: Json;
          processed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          polar_subscription_id?: string | null;
          polar_event_id: string;
          payload: Json;
          processed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          polar_subscription_id?: string | null;
          polar_event_id?: string;
          payload?: Json;
          processed_at?: string;
          created_at?: string;
        };
      };
      audio_generation_jobs: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          voice_type: VoiceType;
          status: AudioJobStatus;
          total_lessons: number;
          completed_lessons: number;
          failed_lessons: number;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          voice_type: VoiceType;
          status?: AudioJobStatus;
          total_lessons: number;
          completed_lessons?: number;
          failed_lessons?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          user_id?: string;
          voice_type?: VoiceType;
          status?: AudioJobStatus;
          total_lessons?: number;
          completed_lessons?: number;
          failed_lessons?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

// Convenience type for AudioGenerationJob
export type AudioGenerationJob = Database['public']['Tables']['audio_generation_jobs']['Row'];
