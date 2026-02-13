import { StyleSheet, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { ScreenHeader, ScreenLayout } from '@/shared/components/layout';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/types/navigation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';

export const CustomerCenterScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList, 'CustomerCenter'>>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <ScreenLayout
      edges={['top']}
      showsVerticalScrollIndicator={false}
      scrollable={false}
      backgroundColor={theme.colors.background}
    >
      <ScreenHeader
        title={t('subscription.customerCenter.title')}
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      <View style={styles.container}>
        <RevenueCatUI.CustomerCenterView />
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
