import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getGratitudeDailyEntryByDate,
  addStatement as apiAddStatement,
  editStatement as apiEditStatement,
  deleteStatement as apiDeleteStatement
  // GratitudeEntry will be imported from schemas
} from '@/api/gratitudeApi';
import { gratitudeEntrySchema, type GratitudeEntry } from '../schemas/gratitudeEntrySchema';

// If GratitudeDailyEntry or GratitudeStatement are not directly exported or need adjustment,
// we can define them here or import them if they exist elsewhere in a suitable form.
// For now, we assume they are available from gratitudeApi.ts as per previous work.

interface GratitudeStoreState {
  entries: Record<string, GratitudeEntry | null>; // Keyed by date string YYYY-MM-DD
  isLoading: boolean;
  error: string | null;
  fetchEntry: (date: string) => Promise<void>;
  addStatement: (date: string, statementText: string) => Promise<GratitudeEntry | null>;
  updateStatement: (date: string, statementIndex: number, newText: string) => Promise<GratitudeEntry | null>;
  removeStatement: (date: string, statementIndex: number) => Promise<GratitudeEntry | null>;
  setEntries: (entries: Record<string, GratitudeEntry | null>) => void; // For initializing or resetting
}

export const useGratitudeStore = create(
  persist<GratitudeStoreState>(
    (set, get) => ({
      // Type for set and get: 
      // set: (partial: Partial<GratitudeStoreState> | ((state: GratitudeStoreState) => Partial<GratitudeStoreState>), replace?: boolean) => void
      // get: () => GratitudeStoreState
      entries: {},
      isLoading: false,
      error: null,

      fetchEntry: async (date: string) => {
        set({ isLoading: true, error: null });
        try {
          const rawEntry = await getGratitudeDailyEntryByDate(date);
          if (rawEntry) {
            const parsedEntry = gratitudeEntrySchema.parse(rawEntry);
            // Successfully parsed, now use parsedEntry
            set((state: GratitudeStoreState) => ({ 
              entries: { ...state.entries, [date]: parsedEntry },
              isLoading: false 
            }));
          } else {
            // If no entry, ensure it's represented as such or cleared
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: null }, // Store null if no entry exists
              isLoading: false
            }));
          }
        } catch (e: any) {
          console.error('Failed to fetch entry:', e);
          let errorMessage = 'Girişler yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
          if (e instanceof Error) {
            errorMessage = e.message;
          }
          // Check if it's a ZodError for more specific feedback
          if (e.constructor.name === 'ZodError') { // A more robust check might be needed if ZodError is not directly importable here
            errorMessage = 'Alınan veri beklenen formatta değil: ' + e.errors.map((err: any) => `${err.path.join('.')} (${err.message})`).join(', ');
          }
          set({ isLoading: false, error: errorMessage });
        }
      },

      addStatement: async (date: string, statementText: string): Promise<GratitudeEntry | null> => {
        const originalEntry = get().entries[date];
        let optimisticEntry: GratitudeEntry;

        if (originalEntry) {
          optimisticEntry = {
            ...originalEntry,
            statements: [...originalEntry.statements, statementText],
            updated_at: new Date().toISOString(), // Ensure updated_at is always fresh
          };
        } else {
          // Constructing a completely new entry
          optimisticEntry = {
            id: `temp-${Date.now()}`, // Temporary ID
            user_id: 'temp-user-id',   // Placeholder, backend handles actual user_id
            entry_date: date,
            statements: [statementText],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        // Optimistic UI update
        set((state: GratitudeStoreState) => ({
          entries: { ...state.entries, [date]: optimisticEntry },
          isLoading: false, // UI should feel instant
          error: null,
        }));

        try {
          const rawBackendEntry = await apiAddStatement(date, statementText);
          if (rawBackendEntry) {
            const backendEntry = gratitudeEntrySchema.parse(rawBackendEntry);
            // Successfully parsed
            // Sync with backend state (especially for ID of new entry)
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: backendEntry },
              isLoading: false,
              error: null, // Clear any previous error
            }));
            return backendEntry;
          } else {
            // This case implies an issue if backend is expected to return the entry
            // Fallback to refetch or handle as an error
            console.warn('Add statement: Backend did not return an entry. Reverting optimistic update.');
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: originalEntry }, // Rollback
              isLoading: false,
              error: 'İfade eklendi ancak sunucudan onay alınamadı. Lütfen listeyi kontrol edin.',
            }));
            return null;
          }
        } catch (e: any) {
          console.error('Failed to add statement, rolling back:', e);
          let errorMessage = 'Minnet ifadeniz eklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
          if (e instanceof Error) {
            errorMessage = e.message;
          }
          if (e.constructor.name === 'ZodError') {
            errorMessage = 'Sunucudan alınan ifade verisi beklenen formatta değil: ' + e.errors.map((err: any) => `${err.path.join('.')} (${err.message})`).join(', ');
          }
          // Rollback on error
          set((state: GratitudeStoreState) => ({
            entries: { ...state.entries, [date]: originalEntry },
            isLoading: false,
            error: errorMessage,
          }));
          return null;
        }
      },

      updateStatement: async (date: string, statementIndex: number, newText: string): Promise<GratitudeEntry | null> => {
        const originalEntry = get().entries[date];

        if (!originalEntry || statementIndex < 0 || statementIndex >= originalEntry.statements.length) {
          console.error('Update statement: Invalid entry or statement index.');
          set({ isLoading: false, error: 'Geçersiz giriş veya ifade indeksi nedeniyle güncelleme yapılamıyor.' });
          return null;
        }

        const newStatements = [...originalEntry.statements];
        newStatements[statementIndex] = newText;

        const optimisticEntry: GratitudeEntry = {
          ...originalEntry,
          statements: newStatements,
          updated_at: new Date().toISOString(),
        };

        // Optimistic UI update
        set((state: GratitudeStoreState) => ({
          entries: { ...state.entries, [date]: optimisticEntry },
          isLoading: false, // UI should feel instant
          error: null,
        }));

        try {
          await apiEditStatement(date, statementIndex, newText);
          // After successful edit, refetch the entry to get the latest state (already in place)
          const rawBackendEntry = await getGratitudeDailyEntryByDate(date);
          if (rawBackendEntry) {
            const backendEntry = gratitudeEntrySchema.parse(rawBackendEntry);
            // Successfully parsed
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: backendEntry }, // Sync with backend
              isLoading: false,
              error: null, // Clear any previous error
            }));
            return backendEntry;
          } else {
            // If backendEntry is null after an edit, it implies the entry might have been deleted concurrently
            // or an issue occurred. Revert to optimistic or handle as error.
            console.warn('Update statement: Backend did not return an entry post-edit. Reverting to optimistic or original.');
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: originalEntry }, // Rollback to original pre-optimistic state
              isLoading: false,
              error: 'Güncelleme onayı alınamadı: Düzenleme sonrası giriş bulunamadı. Liste yenilenmiş olabilir.',
            }));
            return null;
          }
        } catch (e: any) {
          console.error('Failed to update statement, rolling back:', e);
          let errorMessage = 'Minnet ifadeniz güncellenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
          if (e instanceof Error) {
            errorMessage = e.message;
          }
          if (e.constructor.name === 'ZodError') {
            errorMessage = 'Sunucudan alınan güncellenmiş ifade verisi beklenen formatta değil: ' + e.errors.map((err: any) => `${err.path.join('.')} (${err.message})`).join(', ');
          }
          // Rollback on error
          set((state: GratitudeStoreState) => ({
            entries: { ...state.entries, [date]: originalEntry }, // Rollback to original pre-optimistic state
            isLoading: false,
            error: errorMessage,
          }));
          return null;
        }
      },

      removeStatement: async (date: string, statementIndex: number): Promise<GratitudeEntry | null> => {
        const originalEntry = get().entries[date];

        if (!originalEntry || statementIndex < 0 || statementIndex >= originalEntry.statements.length) {
          console.error('Remove statement: Invalid entry or statement index.');
          set({ isLoading: false, error: 'Geçersiz giriş veya ifade indeksi nedeniyle silme işlemi yapılamıyor.' });
          return null;
        }

        const newStatements = originalEntry.statements.filter((_, index) => index !== statementIndex);
        let optimisticEntryOrNull: GratitudeEntry | null;

        if (newStatements.length === 0) {
          optimisticEntryOrNull = null; // Entire entry will be removed
        } else {
          optimisticEntryOrNull = {
            ...originalEntry,
            statements: newStatements,
            updated_at: new Date().toISOString(),
          };
        }

        // Optimistic UI update
        set((state: GratitudeStoreState) => ({
          entries: { ...state.entries, [date]: optimisticEntryOrNull },
          isLoading: false, // UI should feel instant
          error: null,
        }));

        try {
          await apiDeleteStatement(date, statementIndex);
          // After successful delete, refetch the entry to get the latest state
          const rawBackendEntryAfterDelete = await getGratitudeDailyEntryByDate(date);
          if (rawBackendEntryAfterDelete) {
            const backendEntry = gratitudeEntrySchema.parse(rawBackendEntryAfterDelete);
            // Successfully parsed
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: backendEntry }, // Sync with backend
              isLoading: false,
              error: null, // Clear any previous error
            }));
            return backendEntry;
          } else {
            // If backendEntry is null after delete, it implies the entry was successfully removed
            set((state: GratitudeStoreState) => ({
              entries: { ...state.entries, [date]: null }, // Sync with backend
              isLoading: false,
              error: null, // Clear any previous error
            }));
            return null;
          }
        } catch (e: any) {
          console.error('Failed to remove statement, rolling back:', e);
          let errorMessage = 'Minnet ifadeniz silinemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
          if (e instanceof Error) {
            errorMessage = e.message;
          }
          if (e.constructor.name === 'ZodError') {
            errorMessage = 'Sunucudan alınan silinmiş ifade sonrası veri beklenen formatta değil: ' + e.errors.map((err: any) => `${err.path.join('.')} (${err.message})`).join(', ');
          }
          // Rollback on error
          set((state: GratitudeStoreState) => ({
            entries: { ...state.entries, [date]: originalEntry }, // Rollback to original pre-optimistic state
            isLoading: false,
            error: errorMessage,
          }));
          return null;
        }
      },
      
      setEntries: (entries: Record<string, GratitudeEntry | null>) => {
        set({ entries, isLoading: false, error: null });
      },
    }),
    {
      name: 'gratitude-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);



// Example of how to use (for documentation or testing):
// const { entries, fetchEntry, addStatement } = useGratitudeStore.getState();
// fetchEntry('2023-01-01');
// addStatement('2023-01-01', 'A beautiful sunny day');
