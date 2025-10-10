// src/screens/EnhancedTermsOfServiceScreen.tsx
import { Ionicons } from '@expo/vector-icons';

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenHeader, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

interface TermsSectionProps {
  number: string;
  titleKey: string;
  contentKey: string;
  itemsKey?: string;
  prohibitedUsesKey?: string;
  styles: ReturnType<typeof createStyles>;
  t: (
    key: string,
    options?: { returnObjects?: boolean }
  ) => string | string[] | { title: string; items: string[] };
}

const TermsSection: React.FC<TermsSectionProps> = ({
  number,
  titleKey,
  contentKey,
  itemsKey,
  prohibitedUsesKey,
  styles,
  t,
}) => {
  const title = t(titleKey) as string;
  const content = t(contentKey) as string;
  const items = itemsKey ? (t(itemsKey, { returnObjects: true }) as string[]) : [];
  const prohibitedUses = prohibitedUsesKey
    ? (t(prohibitedUsesKey, { returnObjects: true }) as { title: string; items: string[] })
    : null;
  const fullTitle = `${number}. ${title}`;

  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header" accessibilityLabel={fullTitle}>
        {fullTitle}
      </Text>
      <Text style={styles.paragraph}>{content}</Text>

      {prohibitedUses && (
        <>
          <Text style={styles.paragraph}>{prohibitedUses.title}</Text>
          {prohibitedUses.items.map((item: string, index: number) => (
            <Text key={index} style={styles.listItem}>
              • {item}
            </Text>
          ))}
        </>
      )}

      {Array.isArray(items) &&
        items.length > 0 &&
        items.map((item: string, index: number) => (
          <Text key={index} style={styles.listItem}>
            • {item}
          </Text>
        ))}
    </View>
  );
};

const TermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const { t } = useTranslation();

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('terms_of_service');
  }, []);

  return (
    <ScreenLayout edges={['top']} edgeToEdge={true}>
      <ScreenHeader
        showBackButton
        title={t('settings.terms.title') || 'Terms of Service'}
        onBackPress={() => navigation.goBack()}
        variant="default"
      />
      {/* Header Section */}
      <ScreenSection spacing="large">
        <View style={styles.headerContainer}>
          <Ionicons
            name="document-text-outline"
            size={40}
            color={theme.colors.primary}
            accessibilityLabel={t('settings.terms.iconLabel') || 'Terms icon'}
          />
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel={t('settings.terms.title') || 'Terms of Service'}
          >
            {t('settings.terms.title') || 'Terms of Service'}
          </Text>
          <Text
            style={styles.lastUpdated}
            accessibilityLabel={t('settings.terms.lastUpdated') || 'Last updated'}
          >
            {t('termsOfService.lastUpdated')}
          </Text>
        </View>
      </ScreenSection>

      {/* Content Section */}
      <ScreenSection spacing="large">
        <ThemedCard density="comfortable" elevation="card" style={styles.card}>
          <TermsSection
            number="1"
            titleKey="termsOfService.sections.introduction.title"
            contentKey="termsOfService.sections.introduction.content"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="2"
            titleKey="termsOfService.sections.premiumPayment.title"
            contentKey="termsOfService.sections.premiumPayment.content"
            itemsKey="termsOfService.sections.premiumPayment.items"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="3"
            titleKey="termsOfService.sections.usage.title"
            contentKey="termsOfService.sections.usage.content"
            prohibitedUsesKey="termsOfService.sections.usage.prohibitedUses"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="4"
            titleKey="termsOfService.sections.accountManagement.title"
            contentKey="termsOfService.sections.accountManagement.content"
            itemsKey="termsOfService.sections.accountManagement.items"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="5"
            titleKey="termsOfService.sections.intellectualProperty.title"
            contentKey="termsOfService.sections.intellectualProperty.content"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="6"
            titleKey="termsOfService.sections.dataResponsibility.title"
            contentKey="termsOfService.sections.dataResponsibility.content"
            itemsKey="termsOfService.sections.dataResponsibility.items"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="7"
            titleKey="termsOfService.sections.disclaimerOfLiability.title"
            contentKey="termsOfService.sections.disclaimerOfLiability.content"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="8"
            titleKey="termsOfService.sections.limitationOfLiability.title"
            contentKey="termsOfService.sections.limitationOfLiability.content"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="9"
            titleKey="termsOfService.sections.governingLaw.title"
            contentKey="termsOfService.sections.governingLaw.content"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="10"
            titleKey="termsOfService.sections.forceMajeure.title"
            contentKey="termsOfService.sections.forceMajeure.content"
            styles={styles}
            t={t}
          />

          <TermsSection
            number="11"
            titleKey="termsOfService.sections.changesTerms.title"
            contentKey="termsOfService.sections.changesTerms.content"
            styles={styles}
            t={t}
          />

          <View style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              12. {t('termsOfService.sections.contact.title')}
            </Text>
            <Text style={styles.paragraph}>{t('termsOfService.sections.contact.content')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('settings.terms.contactEmailLabel') || 'Contact via email'}
              accessibilityHint={t('settings.terms.contactEmailHint') || 'Send email about terms'}
            >
              <Text style={styles.contactLink}>{t('termsOfService.sections.contact.email')}</Text>
            </TouchableOpacity>
            <Text style={styles.paragraph}>
              {t('termsOfService.sections.contact.responseTime')}
            </Text>
          </View>
        </ThemedCard>
      </ScreenSection>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    headerContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.primary,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      fontWeight: '700',
    },
    lastUpdated: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    card: {
      // Padding handled by density="comfortable"
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    heading: {
      ...theme.typography.headlineSmall,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      fontWeight: '600',
    },
    paragraph: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.md,
      textAlign: 'justify',
      lineHeight: 24,
    },
    listItem: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
      marginLeft: theme.spacing.md,
      lineHeight: 22,
    },
    contactLink: {
      ...theme.typography.bodyLarge,
      color: theme.colors.primary,
      textDecorationLine: 'underline',
      marginBottom: theme.spacing.md,
      textAlign: 'center',
      fontWeight: '600',
    },
  });

export default TermsOfServiceScreen;
