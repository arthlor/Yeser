// src/screens/EnhancedPrivacyPolicyScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../../providers/ThemeProvider';
import { ScreenHeader, ScreenLayout } from '../../../shared/components/layout';
import { getPrimaryShadow } from '@/themes/utils';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '../../../themes/types';

interface PolicySectionProps {
  number: number;
  titleKey: string;
  contentKey: string;
  itemsKey?: string;
  styles: ReturnType<typeof createStyles>;
  t: (key: string, options?: { returnObjects?: boolean }) => string | string[];
}

const PolicySection: React.FC<PolicySectionProps> = ({
  number,
  titleKey,
  contentKey,
  itemsKey,
  styles,
  t,
}) => {
  const items = itemsKey ? (t(itemsKey, { returnObjects: true }) as string[]) : [];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {number}. {t(titleKey) as string}
      </Text>
      <Text style={styles.sectionText}>
        {t(contentKey) as string}
        {Array.isArray(items) && items.length > 0 && (
          <>
            {'\n\n'}
            {items.map((item: string, _index: number) => `• ${item}`).join('\n')}
          </>
        )}
      </Text>
    </View>
  );
};

const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();

  return (
    <ScreenLayout edges={['bottom']} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        showBackButton
        title={t('settings.privacyPolicy.title')}
        onBackPress={() => navigation.goBack()}
        variant="default"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.privacyPolicy.title')}</Text>
          <Text style={styles.subtitle}>
            {t('settings.privacyPolicy.lastUpdated', {
              defaultValue: 'Last updated: {{date}}',
              date: new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'tr-TR'),
            })}
          </Text>
        </View>

        <PolicySection
          number={1}
          titleKey="privacyPolicy.sections.dataController.title"
          contentKey="privacyPolicy.sections.dataController.content"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={2}
          titleKey="privacyPolicy.sections.collectedData.title"
          contentKey="privacyPolicy.sections.collectedData.content"
          itemsKey="privacyPolicy.sections.collectedData.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={3}
          titleKey="privacyPolicy.sections.dataProcessingPurposes.title"
          contentKey="privacyPolicy.sections.dataProcessingPurposes.content"
          itemsKey="privacyPolicy.sections.dataProcessingPurposes.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={4}
          titleKey="privacyPolicy.sections.dataSecurity.title"
          contentKey="privacyPolicy.sections.dataSecurity.content"
          itemsKey="privacyPolicy.sections.dataSecurity.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={5}
          titleKey="privacyPolicy.sections.kvkkRights.title"
          contentKey="privacyPolicy.sections.kvkkRights.content"
          itemsKey="privacyPolicy.sections.kvkkRights.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={6}
          titleKey="privacyPolicy.sections.dataRetention.title"
          contentKey="privacyPolicy.sections.dataRetention.content"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={7}
          titleKey="privacyPolicy.sections.cookiesAnalytics.title"
          contentKey="privacyPolicy.sections.cookiesAnalytics.content"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={8}
          titleKey="privacyPolicy.sections.thirdPartyServices.title"
          contentKey="privacyPolicy.sections.thirdPartyServices.content"
          itemsKey="privacyPolicy.sections.thirdPartyServices.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={9}
          titleKey="privacyPolicy.sections.accountDeletion.title"
          contentKey="privacyPolicy.sections.accountDeletion.content"
          itemsKey="privacyPolicy.sections.accountDeletion.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={10}
          titleKey="privacyPolicy.sections.otherRights.title"
          contentKey="privacyPolicy.sections.otherRights.content"
          itemsKey="privacyPolicy.sections.otherRights.items"
          styles={styles}
          t={t}
        />

        <PolicySection
          number={11}
          titleKey="privacyPolicy.sections.contact.title"
          contentKey="privacyPolicy.sections.contact.content"
          styles={styles}
          t={t}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('privacyPolicy.sections.footer.content')}</Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.md,
    },
    header: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.medium(theme),
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.primary,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    section: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      ...getPrimaryShadow.medium(theme),
    },
    sectionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    sectionText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      lineHeight: 24,
    },
    footer: {
      backgroundColor: theme.colors.primaryContainer,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    footerText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onPrimaryContainer,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

export default PrivacyPolicyScreen;
