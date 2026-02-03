/**
 * API Client for LearnAI Backend
 * Replaces Supabase client with fetch-based REST API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Token storage keys
const TOKEN_KEY = 'learnai_token';

/**
 * Get stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store auth token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Base fetch wrapper with auth header
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// AUTH API
// ============================================

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  grade: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  grade: number;
  created_at: string;
}

export const authApi = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(response.access_token);
    return response;
  },

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(response.access_token);
    return response;
  },

  /**
   * Logout user
   */
  logout(): void {
    removeToken();
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<UserProfile> {
    return apiFetch<UserProfile>('/auth/me');
  },

  /**
   * Update user profile
   */
  async updateMe(data: { name?: string; grade?: number }): Promise<UserProfile> {
    const params = new URLSearchParams();
    if (data.name) params.append('name', data.name);
    if (data.grade) params.append('grade', data.grade.toString());
    
    return apiFetch<UserProfile>(`/auth/me?${params.toString()}`, {
      method: 'PUT',
    });
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/auth/forgot-password?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/auth/reset-password?token=${encodeURIComponent(token)}&new_password=${encodeURIComponent(newPassword)}`, {
      method: 'POST',
    });
  },

  /**
   * Update password for authenticated user
   */
  async updatePassword(newPassword: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/auth/update-password?new_password=${encodeURIComponent(newPassword)}`, {
      method: 'PUT',
    });
  },

  /**
   * Get Google OAuth login URL
   * Redirects user to Google's consent page
   */
  getGoogleLoginUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  },

  /**
   * Authenticate with Google ID token (popup flow)
   */
  async googleAuth(idToken: string): Promise<AuthResponse> {
    const response = await apiFetch<AuthResponse>('/auth/google/token', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
    setToken(response.access_token);
    return response;
  },

  /**
   * Handle token from OAuth callback URL
   */
  handleOAuthCallback(token: string): void {
    setToken(token);
  },
};

// ============================================
// TUTOR API
// ============================================

export interface TutorRequest {
  subject: string;
  question: string;
  mistakes?: number;
  time_spent?: number;
  frustration?: number;
  recent_accuracy?: number;
}

export interface TutorResponse {
  strategy: string;
  answer: string;
}

export const tutorApi = {
  /**
   * Get tutoring response
   */
  async getTutorResponse(data: TutorRequest): Promise<TutorResponse> {
    return apiFetch<TutorResponse>('/tutor', {
      method: 'POST',
      body: JSON.stringify({
        subject: data.subject,
        question: data.question,
        mistakes: data.mistakes || 0,
        time_spent: data.time_spent || 0,
        frustration: data.frustration || 0,
        recent_accuracy: data.recent_accuracy || 0,
      }),
    });
  },

  /**
   * Get chat-style tutoring response
   */
  async chat(data: TutorRequest): Promise<{ message: { role: string; content: string }; strategy: string }> {
    return apiFetch('/tutor/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// PROGRESS API
// ============================================

export interface SubjectStats {
  subject: string;
  accuracy: number;
  total_interactions: number;
}

export interface ProgressStats {
  recent_accuracy: number;
  avg_time_spent: number;
  total_interactions: number;
  weak_subjects: SubjectStats[];
}

export const progressApi = {
  /**
   * Get progress stats
   */
  async getProgress(): Promise<ProgressStats> {
    return apiFetch<ProgressStats>('/progress');
  },

  /**
   * Get subject breakdown
   */
  async getSubjectBreakdown(): Promise<SubjectStats[]> {
    return apiFetch<SubjectStats[]>('/progress/subjects');
  },

  /**
   * Get interaction history
   */
  async getHistory(limit = 20, offset = 0): Promise<any[]> {
    return apiFetch<any[]>(`/progress/history?limit=${limit}&offset=${offset}`);
  },
};

// ============================================
// GOALS API
// ============================================

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
}

export interface GoalCreate {
  title: string;
  description?: string;
  target_date?: string;
}

export const goalsApi = {
  /**
   * Get all goals
   */
  async getGoals(): Promise<Goal[]> {
    return apiFetch<Goal[]>('/goals');
  },

  /**
   * Create a goal
   */
  async createGoal(data: GoalCreate): Promise<Goal> {
    return apiFetch<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a goal
   */
  async updateGoal(id: string, data: Partial<GoalCreate & { is_completed: boolean }>): Promise<Goal> {
    return apiFetch<Goal>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Toggle goal completion
   */
  async toggleGoal(id: string): Promise<Goal> {
    return apiFetch<Goal>(`/goals/${id}/toggle`, {
      method: 'POST',
    });
  },

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<void> {
    return apiFetch<void>(`/goals/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// CHAT API
// ============================================

export interface ChatMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  topic?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export const chatApi = {
  /**
   * Get all chat sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    return apiFetch<ChatSession[]>('/chat/sessions');
  },

  /**
   * Create a chat session
   */
  async createSession(topic?: string): Promise<ChatSession> {
    return apiFetch<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  },

  /**
   * Get a specific session
   */
  async getSession(id: string): Promise<ChatSession> {
    return apiFetch<ChatSession>(`/chat/sessions/${id}`);
  },

  /**
   * Add message to session
   */
  async addMessage(sessionId: string, role: string, content: string): Promise<ChatSession> {
    return apiFetch<ChatSession>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    });
  },

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    return apiFetch<void>(`/chat/sessions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// QUIZ API
// ============================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

export interface QuizSession {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  answers: number[];
  score?: number;
  completed: boolean;
  created_at: string;
}

export const quizApi = {
  /**
   * Get all quiz sessions
   */
  async getSessions(): Promise<QuizSession[]> {
    return apiFetch<QuizSession[]>('/quizzes');
  },

  /**
   * Generate a new quiz
   */
  async generate(topic: string, numQuestions = 5): Promise<QuizSession> {
    return apiFetch<QuizSession>('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, num_questions: numQuestions }),
    });
  },

  /**
   * Get a specific quiz
   */
  async getQuiz(id: string): Promise<QuizSession> {
    return apiFetch<QuizSession>(`/quizzes/${id}`);
  },

  /**
   * Submit quiz answers
   */
  async submit(id: string, answers: number[]): Promise<QuizSession> {
    return apiFetch<QuizSession>(`/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  /**
   * Delete a quiz
   */
  async deleteQuiz(id: string): Promise<void> {
    return apiFetch<void>(`/quizzes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// FLASHCARD API
// ============================================

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardSession {
  id: string;
  topic: string;
  cards: Flashcard[];
  current_index: number;
  created_at: string;
}

export const flashcardApi = {
  /**
   * Get all flashcard sessions
   */
  async getSessions(): Promise<FlashcardSession[]> {
    return apiFetch<FlashcardSession[]>('/flashcards');
  },

  /**
   * Generate new flashcards
   */
  async generate(topic: string, numCards = 10): Promise<FlashcardSession> {
    return apiFetch<FlashcardSession>('/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, num_cards: numCards }),
    });
  },

  /**
   * Get a specific flashcard session
   */
  async getSession(id: string): Promise<FlashcardSession> {
    return apiFetch<FlashcardSession>(`/flashcards/${id}`);
  },

  /**
   * Update current card index
   */
  async updateIndex(id: string, index: number): Promise<{ current_index: number }> {
    return apiFetch<{ current_index: number }>(`/flashcards/${id}/index?index=${index}`, {
      method: 'PUT',
    });
  },

  /**
   * Delete a flashcard session
   */
  async deleteSession(id: string): Promise<void> {
    return apiFetch<void>(`/flashcards/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// HEALTH CHECK
// ============================================

export const healthApi = {
  /**
   * Check API health
   */
  async check(): Promise<{ status: string; service: string }> {
    return apiFetch<{ status: string; service: string }>('/health');
  },
};

// ============================================
// ESSAY API
// ============================================

export interface EssayFeedback {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    feedback: string;
  }[];
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

export interface EssaySubmission {
  id: string;
  title: string;
  content: string;
  topic?: string;
  feedback: EssayFeedback;
  created_at: string;
}

export const essayApi = {
  /**
   * Get all essay submissions
   */
  async getSubmissions(): Promise<EssaySubmission[]> {
    return apiFetch<EssaySubmission[]>('/essays');
  },

  /**
   * Grade an essay
   */
  async grade(title: string, content: string, topic?: string, gradeLevel?: number): Promise<EssaySubmission> {
    return apiFetch<EssaySubmission>('/essays/grade', {
      method: 'POST',
      body: JSON.stringify({ 
        title, 
        content, 
        topic,
        grade_level: gradeLevel 
      }),
    });
  },

  /**
   * Get a specific essay
   */
  async getEssay(id: string): Promise<EssaySubmission> {
    return apiFetch<EssaySubmission>(`/essays/${id}`);
  },

  /**
   * Delete an essay
   */
  async deleteEssay(id: string): Promise<void> {
    return apiFetch<void>(`/essays/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// SUMMARY API
// ============================================

export interface Summary {
  id: string;
  title: string;
  summary: string;
  source_text?: string;
  created_at: string;
}

export const summaryApi = {
  /**
   * Get all summaries
   */
  async getSummaries(): Promise<Summary[]> {
    return apiFetch<Summary[]>('/summaries');
  },

  /**
   * Generate a summary
   */
  async generate(content: string, isBase64 = false): Promise<Summary> {
    return apiFetch<Summary>('/summaries/generate', {
      method: 'POST',
      body: JSON.stringify({ content, is_base64: isBase64 }),
    });
  },

  /**
   * Get a specific summary
   */
  async getSummary(id: string): Promise<Summary> {
    return apiFetch<Summary>(`/summaries/${id}`);
  },

  /**
   * Delete a summary
   */
  async deleteSummary(id: string): Promise<void> {
    return apiFetch<void>(`/summaries/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// DIAGRAM API
// ============================================

export interface Diagram {
  id: string;
  title: string;
  mermaid_code: string;
  diagram_type: 'flowchart' | 'mindmap';
  source_text?: string;
  created_at: string;
}

export const diagramApi = {
  /**
   * Get all diagrams
   */
  async getDiagrams(): Promise<Diagram[]> {
    return apiFetch<Diagram[]>('/diagrams');
  },

  /**
   * Generate a diagram
   */
  async generate(content: string, diagramType: 'flowchart' | 'mindmap', isBase64 = false): Promise<Diagram> {
    return apiFetch<Diagram>('/diagrams/generate', {
      method: 'POST',
      body: JSON.stringify({ 
        content, 
        diagram_type: diagramType,
        is_base64: isBase64 
      }),
    });
  },

  /**
   * Get a specific diagram
   */
  async getDiagram(id: string): Promise<Diagram> {
    return apiFetch<Diagram>(`/diagrams/${id}`);
  },

  /**
   * Delete a diagram
   */
  async deleteDiagram(id: string): Promise<void> {
    return apiFetch<void>(`/diagrams/${id}`, {
      method: 'DELETE',
    });
  },
};

// Default export for convenience
export default {
  auth: authApi,
  tutor: tutorApi,
  progress: progressApi,
  goals: goalsApi,
  chat: chatApi,
  quiz: quizApi,
  flashcard: flashcardApi,
  health: healthApi,
  essay: essayApi,
  summary: summaryApi,
  diagram: diagramApi,
};
