export interface OnboardingData {
  topic: string;
  useMaterials: boolean;
  attachments: Attachment[];
  background: {
    degree?: string;
    experience?: string;
    languages?: string;
    interests?: string;
  };
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  intensity: 'short' | 'standard' | 'deep' | null;
}

export interface Attachment {
  id: string;
  type: 'pdf' | 'docx' | 'pptx' | 'url' | 'text';
  title: string;
  content?: string;
  url?: string;
  uploading?: boolean;
  error?: string;
}

export interface Message {
  id: string;
  type: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: Date;
}

export interface QuickReply {
  label: string;
  value: string;
}
