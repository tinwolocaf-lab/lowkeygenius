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
export type AudioJobStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
export type LessonGenerationJobStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
export type VoiceType = 'male' | 'female';
export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected';
export type InputMethod = 'text' | 'voice' | 'conversation';
export type QuestionType = 'multiple_choice' | 'true_false';

// Flashcard and Quiz related types
export interface FlashcardResponse {
  flashcardId: string;
  response: 'got_it' | 'need_review';
  timeSpentMs: number;
}

export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface ExtractedContext {
  education: string;
  experience: string;
  interests: string;
  expertise: string[];
  learningStyle?: string;
  preferences?: string[];
}

export interface AnonymizationMetadata {
  emails: number;
  phones: number;
  names: number;
  addresses: number;
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          plan_type: PlanType
          audio_addon: boolean
          polar_customer_id: string | null
          polar_subscription_id: string | null
          subscription_status: string | null
          subscription_ends_at: string | null
          subscription_period_start: string | null
          audio_addon_enabled: boolean
          audio_addon_trial_used: boolean
          audio_addon_expires_at: string | null
          audio_addon_subscription_id: string | null
          billing_cycle: string | null
          theme_preference: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          plan_type?: PlanType
          audio_addon?: boolean
          polar_customer_id?: string | null
          polar_subscription_id?: string | null
          subscription_status?: string | null
          subscription_ends_at?: string | null
          subscription_period_start?: string | null
          audio_addon_enabled?: boolean
          audio_addon_trial_used?: boolean
          audio_addon_expires_at?: string | null
          audio_addon_subscription_id?: string | null
          billing_cycle?: string | null
          theme_preference?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          plan_type?: PlanType
          audio_addon?: boolean
          polar_customer_id?: string | null
          polar_subscription_id?: string | null
          subscription_status?: string | null
          subscription_ends_at?: string | null
          subscription_period_start?: string | null
          audio_addon_enabled?: boolean
          audio_addon_trial_used?: boolean
          audio_addon_expires_at?: string | null
          audio_addon_subscription_id?: string | null
          billing_cycle?: string | null
          theme_preference?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_type: PlanType
          status: SubscriptionStatus
          current_period_start: string | null
          current_period_end: string | null
          has_audio_addon: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_type: PlanType
          status?: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          has_audio_addon?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_type?: PlanType
          status?: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          has_audio_addon?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          courses_created: number
          courses_enrolled: number
          audio_minutes_generated: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          courses_created?: number
          courses_enrolled?: number
          audio_minutes_generated?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          courses_created?: number
          courses_enrolled?: number
          audio_minutes_generated?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          topic: string
          level: CourseLevel
          intensity: CourseIntensity
          estimated_duration_hours: number | null
          status: CourseStatus
          outline_json: Json | null
          materials_json: Json | null
          is_public: boolean
          published_at: string | null
          creator_display_name: string | null
          thumbnail_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          topic: string
          level?: CourseLevel
          intensity?: CourseIntensity
          estimated_duration_hours?: number | null
          status?: CourseStatus
          outline_json?: Json | null
          materials_json?: Json | null
          is_public?: boolean
          published_at?: string | null
          creator_display_name?: string | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          topic?: string
          level?: CourseLevel
          intensity?: CourseIntensity
          estimated_duration_hours?: number | null
          status?: CourseStatus
          outline_json?: Json | null
          materials_json?: Json | null
          is_public?: boolean
          published_at?: string | null
          creator_display_name?: string | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_sources: {
        Row: {
          id: string
          user_id: string
          course_id: string | null
          type: FileSourceType
          title: string
          raw_text: string | null
          summary: string | null
          storage_url: string | null
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id?: string | null
          type: FileSourceType
          title: string
          raw_text?: string | null
          summary?: string | null
          storage_url?: string | null
          file_size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string | null
          type?: FileSourceType
          title?: string
          raw_text?: string | null
          summary?: string | null
          storage_url?: string | null
          file_size?: number | null
          created_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          module_index: number
          lesson_index: number
          title: string
          objectives: string[] | null
          markdown_content: string | null
          lesson_status: string
          is_manually_edited: boolean
          audio_url: string | null
          audio_duration_seconds: number | null
          audio_status: AudioStatus
          audio_voice_type: VoiceType | null
          audio_generated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          module_index: number
          lesson_index: number
          title: string
          objectives?: string[] | null
          markdown_content?: string | null
          lesson_status?: string
          is_manually_edited?: boolean
          audio_url?: string | null
          audio_duration_seconds?: number | null
          audio_status?: AudioStatus
          audio_voice_type?: VoiceType | null
          audio_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          module_index?: number
          lesson_index?: number
          title?: string
          objectives?: string[] | null
          markdown_content?: string | null
          lesson_status?: string
          is_manually_edited?: boolean
          audio_url?: string | null
          audio_duration_seconds?: number | null
          audio_status?: AudioStatus
          audio_voice_type?: VoiceType | null
          audio_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          course_id: string
          completed: boolean
          last_viewed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          course_id: string
          completed?: boolean
          last_viewed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          course_id?: string
          completed?: boolean
          last_viewed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          course_id: string
          lesson_id: string
          snippet_markdown: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          lesson_id: string
          snippet_markdown: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          lesson_id?: string
          snippet_markdown?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          polar_subscription_id: string | null
          polar_event_id: string
          payload: Json
          processed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          polar_subscription_id?: string | null
          polar_event_id: string
          payload: Json
          processed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          polar_subscription_id?: string | null
          polar_event_id?: string
          payload?: Json
          processed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      audio_generation_jobs: {
        Row: {
          id: string
          course_id: string
          user_id: string
          voice_type: VoiceType
          status: AudioJobStatus
          total_lessons: number
          completed_lessons: number
          failed_lessons: number
          current_lesson_index: number
          error_message: string | null
          started_at: string | null
          paused_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          voice_type: VoiceType
          status?: AudioJobStatus
          total_lessons: number
          completed_lessons?: number
          failed_lessons?: number
          current_lesson_index?: number
          error_message?: string | null
          started_at?: string | null
          paused_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          voice_type?: VoiceType
          status?: AudioJobStatus
          total_lessons?: number
          completed_lessons?: number
          failed_lessons?: number
          current_lesson_index?: number
          error_message?: string | null
          started_at?: string | null
          paused_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      inline_wiki_entries: {
        Row: {
          id: string
          lesson_id: string
          user_id: string
          term: string
          definition: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          user_id: string
          term: string
          definition: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          user_id?: string
          term?: string
          definition?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          enrolled_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          enrolled_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          enrolled_at?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          id: string
          course_id: string
          requester_id: string
          message: string | null
          status: DeletionRequestStatus
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          requester_id: string
          message?: string | null
          status?: DeletionRequestStatus
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          requester_id?: string
          message?: string | null
          status?: DeletionRequestStatus
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          input_method: InputMethod
          anonymized_content: string
          extracted_context: ExtractedContext
          anonymization_metadata: AnonymizationMetadata | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          input_method: InputMethod
          anonymized_content: string
          extracted_context: ExtractedContext
          anonymization_metadata?: AnonymizationMetadata | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          input_method?: InputMethod
          anonymized_content?: string
          extracted_context?: ExtractedContext
          anonymization_metadata?: AnonymizationMetadata | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          id: string
          lesson_id: string
          front_text: string
          back_text: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          front_text: string
          back_text: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          front_text?: string
          back_text?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcard_sessions: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          total_cards: number
          mastered_cards: number
          review_cards: number
          responses_json: FlashcardResponse[]
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          total_cards: number
          mastered_cards: number
          review_cards: number
          responses_json?: FlashcardResponse[]
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          total_cards?: number
          mastered_cards?: number
          review_cards?: number
          responses_json?: FlashcardResponse[]
          completed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          id: string
          lesson_id: string
          title: string
          question_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          title: string
          question_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          title?: string
          question_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          question_text: string
          question_type: QuestionType
          options: string[]
          correct_index: number
          explanation: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question_text: string
          question_type: QuestionType
          options: string[]
          correct_index: number
          explanation: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          question_text?: string
          question_type?: QuestionType
          options?: string[]
          correct_index?: number
          explanation?: string
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          user_id: string
          score: number
          total_questions: number
          percentage: number
          answers_json: QuizAnswer[]
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          user_id: string
          score: number
          total_questions: number
          percentage: number
          answers_json: QuizAnswer[]
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          user_id?: string
          score?: number
          total_questions?: number
          percentage?: number
          answers_json?: QuizAnswer[]
          completed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      lesson_generation_jobs: {
        Row: {
          id: string
          course_id: string
          user_id: string
          status: LessonGenerationJobStatus
          total_lessons: number
          completed_lessons: number
          current_lesson_index: number
          error_message: string | null
          started_at: string | null
          paused_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          status?: LessonGenerationJobStatus
          total_lessons: number
          completed_lessons?: number
          current_lesson_index?: number
          error_message?: string | null
          started_at?: string | null
          paused_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          status?: LessonGenerationJobStatus
          total_lessons?: number
          completed_lessons?: number
          current_lesson_index?: number
          error_message?: string | null
          started_at?: string | null
          paused_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_courses_preview: {
        Row: {
          id: string
          title: string
          description: string | null
          topic: string
          level: CourseLevel
          thumbnail_url: string | null
          published_at: string | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type UserProgress = Database['public']['Tables']['user_progress']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type AudioGenerationJob = Database['public']['Tables']['audio_generation_jobs']['Row']
export type InlineWikiEntry = Database['public']['Tables']['inline_wiki_entries']['Row']
export type CourseEnrollment = Database['public']['Tables']['course_enrollments']['Row']
export type DeletionRequest = Database['public']['Tables']['deletion_requests']['Row']
export type UsageCounter = Database['public']['Tables']['usage_counters']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Flashcard = Database['public']['Tables']['flashcards']['Row']
export type FlashcardSession = Database['public']['Tables']['flashcard_sessions']['Row']
export type Quiz = Database['public']['Tables']['quizzes']['Row']
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row']
export type QuizAttempt = Database['public']['Tables']['quiz_attempts']['Row']
export type LessonGenerationJob = Database['public']['Tables']['lesson_generation_jobs']['Row']

// View types
export type PublicCoursePreview = Database['public']['Views']['public_courses_preview']['Row']
