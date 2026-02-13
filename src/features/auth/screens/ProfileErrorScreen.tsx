import React from 'react';

import { ScreenLayout } from '@/shared/components/layout';
import { ErrorState } from '@/shared/components/ui';
import { isNetworkError } from '@/utils/apiHelpers';

interface ProfileErrorScreenProps {
  error?: unknown;
  onRetry?: () => void;
}

const ProfileErrorScreen: React.FC<ProfileErrorScreenProps> = ({ error, onRetry }) => {
  const errorType = isNetworkError(error) ? 'network' : 'generic';

  return (
    <ScreenLayout scrollable={false}>
      <ErrorState error={error} type={errorType} onRetry={onRetry} />
    </ScreenLayout>
  );
};

export default ProfileErrorScreen;
