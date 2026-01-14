import { useCallback, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { useSubscription } from '@/hooks/useSubscription';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatMessageResult {
  reply?: string;
  remaining: number;
  resetInSeconds?: number;
  error?: string;
}

interface UseGratitudeChatOptions {
  language?: 'tr' | 'en';
  recentEntries?: string[];
}

interface UseGratitudeChatReturn {
  messages: ChatMessage[];
  remaining: number | null;
  resetInSeconds: number | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<string | null>;
  clearChat: () => void;
}

export const useGratitudeChat = (options: UseGratitudeChatOptions = {}): UseGratitudeChatReturn => {
  const { language = 'en', recentEntries = [] } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetInSeconds, setResetInSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isPro } = useSubscription();

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!isPro) {
        setError('PRO subscription required');
        return null;
      }

      if (!message || message.trim().length < 1) {
        setError('Message cannot be empty');
        return null;
      }

      // Add user message to history
      const userMessage: ChatMessage = {
        role: 'user',
        content: message.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Prepare history for API (exclude timestamps)
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { data, error: invokeError } = await supabase.functions.invoke<ChatMessageResult>(
          'chat-message',
          {
            body: {
              message: message.trim(),
              history,
              language,
              recentEntries,
            },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        if (data) {
          if (data.error) {
            // Handle soft 429 error
            // showWarning(t('ai.usage.exhausted', 'Daily limit exhausted. Resets tomorrow!'));
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
            // Remove user message since it failed
            setMessages((prev) => prev.slice(0, -1));
            return null;
          }

          if (data.reply) {
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: data.reply,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
            return data.reply;
          }
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        logger.warn('[useGratitudeChat] Error:', { error: errorMessage });
        setError(errorMessage);
        // Remove the user message on error
        setMessages((prev) => prev.slice(0, -1));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isPro, language, messages, recentEntries]
  );

  return {
    messages,
    remaining,
    resetInSeconds,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
};
