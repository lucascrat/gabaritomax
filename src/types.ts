export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalLessons: number;
  completedLessons: number;
  level: 'fundamental' | 'medio' | 'superior';
  mapUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  content: string; // Markdown summary
  mapUrl?: string;
  audioUrl?: string;
}

export interface Question {
  id: string;
  subjectId: string;
  lessonId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  level?: 'fundamental' | 'medio' | 'superior';
}

export interface UserStats {
  accuracy: number;
  questionsAnswered: number;
  studyTimeSeconds: number;
}
