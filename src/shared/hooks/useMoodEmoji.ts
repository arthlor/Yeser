import { useCallback, useEffect, useState } from 'react';
import { moodStorageService } from '@/services/moodStorageService';
import type { MoodEmoji } from '@/types/mood.types';

interface UseMoodEmojiOptions {
  entryDate: string | undefined;
  index: number | undefined;
}

export const useMoodEmoji = ({ entryDate, index }: UseMoodEmojiOptions) => {
  const [moodEmoji, setMoodEmoji] = useState<MoodEmoji | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!entryDate || typeof index !== 'number') {
        return;
      }
      setLoading(true);
      const mood = await moodStorageService.getMood(entryDate, index);
      if (isMounted) {
        setMoodEmoji(mood);
      }
      setLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [entryDate, index]);

  const updateMood = useCallback(
    async (mood: MoodEmoji | null) => {
      if (!entryDate || typeof index !== 'number') {
        return;
      }
      if (mood) {
        await moodStorageService.setMood(entryDate, index, mood);
        setMoodEmoji(mood);
      } else {
        await moodStorageService.clearMood(entryDate, index);
        setMoodEmoji(null);
      }
    },
    [entryDate, index]
  );

  return { moodEmoji, setMoodEmoji: updateMood, loading };
};
