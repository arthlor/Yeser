import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { ScreenLayout } from '@/shared/components/layout';
import { NotFoundError } from '@/shared/components/ui/ErrorState';
import { RootStackParamList } from '@/types/navigation';

type Props = StackScreenProps<RootStackParamList, 'NotFound'>;

const NotFoundScreen: React.FC<Props> = ({ navigation }) => {
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to MainApp if we can't go back (e.g., direct deep link)
      navigation.replace('MainApp', { screen: 'MainAppTabs' });
    }
  };

  return (
    <ScreenLayout scrollable={false} density="comfortable">
      <NotFoundError onGoBack={handleGoBack} />
    </ScreenLayout>
  );
};

export default NotFoundScreen;
