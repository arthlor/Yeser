import { create } from 'zustand';

import { getRandomActivePrompt, type DailyPrompt } from '../api/promptApi';

interface PromptState {
  currentPrompt: DailyPrompt | null;
  defaultPromptText: string; // The static default prompt
  loading: boolean;
  error: string | null;
  fetchNewPrompt: () => Promise<void>;
  clearPromptError: () => void;
  resetToDefaultPrompt: () => void; // Action to explicitly set currentPrompt to null
}

// Default static prompt text (Turkish) - Centralized here
export const STATIC_DEFAULT_PROMPT = 'Bugün neler için minnettarsın?';

export const usePromptStore = create<PromptState>((set) => ({
  currentPrompt: null,
  defaultPromptText: STATIC_DEFAULT_PROMPT,
  loading: false,
  error: null,

  fetchNewPrompt: async () => {
    set({ loading: true, error: null });
    try {
      const prompt = await getRandomActivePrompt();
      set({ currentPrompt: prompt, loading: false });
      if (!prompt) {
        console.log('[promptStore] No varied prompt received, will use default.');
      }
    } catch (err: any) {
      console.error('[promptStore] Error fetching new prompt:', err.message);
      const errorMessage = err.message || 'Yeni bir yönlendirme alınırken sorun oluştu.';
      // Keep currentPrompt as is or set to null? Setting to null indicates failure to fetch varied.
      set({ currentPrompt: null, error: errorMessage, loading: false });
    }
  },

  clearPromptError: () => {
    set({ error: null });
  },

  resetToDefaultPrompt: () => {
    set({ currentPrompt: null, error: null, loading: false });
  },
}));

export default usePromptStore;
