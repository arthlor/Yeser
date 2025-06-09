import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from '@/providers/ThemeProvider';
import { logger } from '@/utils/debugConfig';
import { supabase } from '@/utils/supabaseClient';

interface NetworkTest {
  name: string;
  status: 'pending' | 'success' | 'failed';
  message: string;
  details?: Record<string, unknown>;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
}

export const NetworkDiagnostics: React.FC = () => {
  const { theme } = useTheme();
  const [tests, setTests] = useState<NetworkTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const isSimulator = Platform.OS === 'ios' && Platform.isPad === false && !Platform.isTV;

  const updateTest = (name: string, status: NetworkTest['status'], message: string, details?: Record<string, unknown>) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      const newTest = { name, status, message, details };
      
      if (existing) {
        return prev.map(t => t.name === name ? newTest : t);
      }
      return [...prev, newTest];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTests([]);
    
    logger.debug('Starting network diagnostics...', { isSimulator });

    updateTest('Environment Config', 'pending', 'Checking environment variables...');
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const parsedUrl = new URL(supabaseUrl);
        updateTest('Environment Config', 'success', 'Environment variables loaded', {
          domain: parsedUrl.hostname,
          protocol: parsedUrl.protocol,
          hasKey: !!supabaseKey,
          isSimulator
        });
        logger.debug('Environment test: SUCCESS', { domain: parsedUrl.hostname });
      } catch (urlError) {
        updateTest('Environment Config', 'failed', 'Invalid Supabase URL format', {
          url: supabaseUrl,
          error: (urlError as Error).message
        });
        logger.error('Environment test: Invalid URL', { error: (urlError as Error).message });
      }
    } else {
      updateTest('Environment Config', 'failed', 'Missing environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      logger.error('Environment test: Missing variables', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
    }

    updateTest('Supabase Client', 'pending', 'Testing Supabase client initialization...');
    try {
      updateTest('Supabase Client', 'success', 'Supabase client initialized', {
        hasClient: !!supabase,
        hasFromMethod: typeof supabase.from === 'function',
        hasAuthMethod: typeof supabase.auth === 'object'
      });
      logger.debug('Supabase client test: SUCCESS');
    } catch (clientError) {
      const errorMessage = (clientError as Error).message;
      updateTest('Supabase Client', 'failed', `Client initialization failed: ${errorMessage}`, {
        error: errorMessage,
        type: 'SUPABASE_CLIENT_INIT_ERROR'
      });
      logger.error('Supabase client test: FAILED', { error: errorMessage });
    }

    if (isSimulator) {
      updateTest('Simulator Mode', 'pending', 'Running simulator-friendly tests...');
      
      try {
        const authMethods = {
          hasSignInWithOtp: typeof supabase.auth.signInWithOtp === 'function',
          hasSignInWithOAuth: typeof supabase.auth.signInWithOAuth === 'function',
          hasSetSession: typeof supabase.auth.setSession === 'function',
          hasGetSession: typeof supabase.auth.getSession === 'function'
        };
        
        updateTest('Simulator Mode', 'success', 'Auth methods available (network tests skipped in simulator)', {
          ...authMethods,
          recommendation: 'Use physical device or Expo Go for network testing'
        });
        
        logger.debug('Simulator mode test: SUCCESS', { authMethods });
      } catch (error) {
        updateTest('Simulator Mode', 'failed', 'Auth method check failed', {
          error: (error as Error).message
        });
      }
      
      updateTest('Recommendations', 'pending', 'Simulator limitations detected');
      updateTest('Recommendations', 'success', 'Use Expo Go app or physical device for full testing', {
        alternatives: [
          'Download Expo Go from App Store',
          'Scan QR code from npx expo start',
          'Test authentication on real device',
          'Fix code signing for physical device deployment'
        ]
      });
      
    } else {
      updateTest('Basic Network', 'pending', 'Testing internet connectivity...');
      try {
        const response = await Promise.race([
          fetch('https://httpbin.org/get', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]) as FetchResponse;
        
        if (response.ok) {
          updateTest('Basic Network', 'success', 'Internet connectivity working', {
            status: response.status,
            url: 'httpbin.org'
          });
          logger.debug('Basic network test: SUCCESS');
        } else {
          updateTest('Basic Network', 'failed', `HTTP ${response.status}`, {
            status: response.status
          });
          logger.error('Basic network test: HTTP error', { status: response.status });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        updateTest('Basic Network', 'failed', `Network error: ${errorMessage}`, {
          error: errorMessage,
          type: 'NETWORK_FAILURE',
          isTimeoutError: errorMessage.includes('timeout')
        });
        logger.error('Basic network test: FAILED', { 
          error: errorMessage,
          errorName: (error as Error).name
        });
      }

      updateTest('Supabase API', 'pending', 'Testing Supabase connectivity...');
      try {
        const healthResponse = await Promise.race([
          fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey || '',
              'Content-Type': 'application/json'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]) as FetchResponse;
        
        if (healthResponse.status < 500) {
          updateTest('Supabase API', 'success', 'Supabase API reachable', {
            status: healthResponse.status,
            domain: supabaseUrl ? new URL(supabaseUrl).hostname : 'unknown'
          });
          logger.debug('Supabase API test: SUCCESS', { status: healthResponse.status });
        } else {
          updateTest('Supabase API', 'failed', `Supabase server error: ${healthResponse.status}`, {
            status: healthResponse.status
          });
          logger.error('Supabase API test: Server error', { status: healthResponse.status });
        }
      } catch (supabaseError) {
        const errorMessage = (supabaseError as Error).message;
        updateTest('Supabase API', 'failed', `Supabase unreachable: ${errorMessage}`, {
          error: errorMessage,
          type: 'SUPABASE_CONNECTIVITY_FAILURE',
          isNetworkError: errorMessage.includes('Network request failed'),
          domain: supabaseUrl ? new URL(supabaseUrl).hostname : 'unknown'
        });
        logger.error('Supabase API test: FAILED', { 
          error: errorMessage,
          errorName: (supabaseError as Error).name,
          isNetworkRequestFailed: errorMessage.includes('Network request failed')
        });
      }

      updateTest('Supabase Auth', 'pending', 'Testing Supabase auth...');
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          updateTest('Supabase Auth', 'failed', `Auth error: ${error.message}`, {
            errorName: error.name,
            errorMessage: error.message
          });
          logger.error('Supabase auth test: Auth error', { 
            errorName: error.name, 
            errorMessage: error.message 
          });
        } else {
          updateTest('Supabase Auth', 'success', 'Supabase auth working', {
            hasSession: !!data.session,
            sessionValid: data.session?.expires_at ? new Date(data.session.expires_at * 1000) > new Date() : false
          });
          logger.debug('Supabase auth test: SUCCESS', { hasSession: !!data.session });
        }
      } catch (clientError) {
        const errorMessage = (clientError as Error).message;
        updateTest('Supabase Auth', 'failed', `Auth exception: ${errorMessage}`, {
          error: errorMessage,
          type: 'SUPABASE_AUTH_EXCEPTION'
        });
        logger.error('Supabase auth test: EXCEPTION', { 
          error: errorMessage,
          errorName: (clientError as Error).name
        });
      }
    }

    setIsRunning(false);
    
    const completedTests = tests.length > 0 ? tests : [];
    logger.debug('Network Diagnostics Complete:', { 
      platform: Platform.OS,
      isSimulator,
      totalTests: completedTests.length,
      passed: completedTests.filter(t => t.status === 'success').length,
      failed: completedTests.filter(t => t.status === 'failed').length,
      tests: completedTests
    });
  };

  const styles = StyleSheet.create({
    container: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    title: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    test: {
      marginVertical: theme.spacing.xs,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
    },
    testName: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: 'bold',
    },
    testMessage: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
    },
    statusSuccess: {
      color: theme.colors.success,
    },
    statusFailed: {
      color: theme.colors.error,
    },
    statusPending: {
      color: theme.colors.primary,
    },
    button: {
      marginTop: theme.spacing.md,
    },
    debugDetails: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
      fontSize: 10,
      opacity: 0.7,
    },
  });

  const getStatusColor = (status: NetworkTest['status']) => {
    switch (status) {
      case 'success': return styles.statusSuccess.color;
      case 'failed': return styles.statusFailed.color;
      case 'pending': return styles.statusPending.color;
      default: return theme.colors.onSurface;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Network Diagnostics</Text>
      
      {tests.map((test, index) => (
        <View key={index} style={styles.test}>
          <Text style={[styles.testName, { color: getStatusColor(test.status) }]}>
            {test.status === 'success' ? '✅' : test.status === 'failed' ? '❌' : '⏳'} {test.name}
          </Text>
          <Text style={styles.testMessage}>{test.message}</Text>
          {test.details && __DEV__ && (
            <Text style={styles.debugDetails}>
              {JSON.stringify(test.details, null, 2)}
            </Text>
          )}
        </View>
      ))}
      
      <Button
        mode="contained"
        onPress={runDiagnostics}
        disabled={isRunning}
        style={styles.button}
      >
        {isRunning ? 'Running Diagnostics...' : 'Run Network Tests'}
      </Button>
    </View>
  );
}; 