import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// Define the shape of a Question entity based on our DB schema
export interface Question {
  id: string;
  survey_version_id: string;
  question_text: string;
  question_type: 'MCQ' | 'TEXT' | 'RATING' | 'BOOLEAN';
  options: any[];
  is_required: boolean;
  logic: any;
  order_index: number;
  version: number;
}

interface FormState {
  socket: Socket | null;
  surveyId: string | null;
  questions: Record<string, Question>;
  isConnected: boolean;
  syncStatus: 'synced' | 'saving' | 'error';
  
  // Actions
  initializeSocket: (surveyId: string, token: string) => void;
  disconnectSocket: () => void;
  setQuestions: (questions: Question[]) => void;
  updateQuestionField: (questionId: string, field: keyof Question, value: any) => void;
  revertQuestionField: (questionId: string, field: keyof Question, serverVersion: number) => void;
}

// Debounce timer map to handle saving per-field
const debounceTimers: Record<string, NodeJS.Timeout> = {};

export const useFormStore = create<FormState>((set, get) => ({
  socket: null,
  surveyId: null,
  questions: {},
  isConnected: false,
  syncStatus: 'synced',

  initializeSocket: (surveyId: string, token: string) => {
    // Prevent duplicate connections
    if (get().socket) return;

    // Determine backend URL (usually injected via env var in Next.js)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const socket = io(backendUrl, {
      auth: { token },
      reconnectionDelayMax: 10000, // Exponential backoff
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('join-form', { surveyId });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // Receive real-time update from another user
    socket.on('form-updated', (payload) => {
      const { questionId, field, value, newVersion } = payload;
      set((state) => {
        const q = state.questions[questionId];
        if (!q) return state;

        // Apply update from server
        return {
          questions: {
            ...state.questions,
            [questionId]: {
              ...q,
              [field]: value,
              version: newVersion,
            },
          },
        };
      });
    });

    // Handle Optimistic Concurrency Conflicts
    socket.on('conflict', (payload) => {
      const { questionId, field, expectedVersion } = payload;
      get().revertQuestionField(questionId, field, expectedVersion);
      // In a real app, you would also trigger a UI Toast notification here
      console.warn(`[Conflict] Field ${field} on question ${questionId} was updated elsewhere.`);
      set({ syncStatus: 'error' });
    });

    socket.on('error', (err) => {
      console.error('[Socket Error]', err);
      set({ syncStatus: 'error' });
    });

    set({ socket, surveyId });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, surveyId: null });
    }
  },

  setQuestions: (questionsArray) => {
    const questionsMap: Record<string, Question> = {};
    questionsArray.forEach((q) => {
      questionsMap[q.id] = q;
    });
    set({ questions: questionsMap });
  },

  updateQuestionField: (questionId, field, value) => {
    // 1. Optimistic UI Update immediately
    set((state) => {
      const q = state.questions[questionId];
      if (!q) return state;

      return {
        syncStatus: 'saving',
        questions: {
          ...state.questions,
          [questionId]: {
            ...q,
            [field]: value,
          },
        },
      };
    });

    // 2. Debounce and emit to server
    const timerKey = `${questionId}-${field}`;
    if (debounceTimers[timerKey]) {
      clearTimeout(debounceTimers[timerKey]);
    }

    debounceTimers[timerKey] = setTimeout(() => {
      const state = get();
      if (!state.socket || !state.isConnected) {
        set({ syncStatus: 'error' });
        return;
      }

      const q = state.questions[questionId];
      
      // Emit the update payload
      state.socket.emit('field-update', {
        eventId: crypto.randomUUID(), // Generates a unique UUID for idempotency
        surveyId: state.surveyId,
        questionId,
        field,
        value,
        questionVersion: q.version, // Send our current known version
      });

      set({ syncStatus: 'synced' });
    }, 500); // 500ms debounce
  },

  revertQuestionField: (questionId, field, serverVersion) => {
    // If we hit a conflict, we revert to server state. 
    // Usually this requires an API call to re-fetch the raw question, 
    // but for now we'll just log it. (Fully implementing requires triggering a refetch).
  },
}));
