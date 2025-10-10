// src/screens/EnhancedHelpScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import { ScreenHeader, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import { useTranslation } from 'react-i18next';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { hapticFeedback } from '@/utils/hapticFeedback';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';

interface FAQItemProps {
  question: string;
  answer: string;
  theme: AppTheme;
  _index: number;
  t: (key: string, options?: { question?: string; answer?: string }) => string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, theme, _index, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const styles = createStyles(theme);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for FAQ interactions
  const animations = useCoordinatedAnimations();

  // **COORDINATED ENTRANCE**: Simple entrance animation for FAQ expansion
  useEffect(() => {
    if (isOpen) {
      animations.animateEntrance({ duration: 300 });
    }
  }, [isOpen, animations]);

  const chevronStyle = useMemo(
    () => ({ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }),
    [isOpen]
  );

  const answerAnimatedStyle = useMemo(
    () => ({ opacity: animations.opacityAnim }),
    [animations.opacityAnim]
  );

  const toggleFAQ = () => {
    setIsOpen(!isOpen);
    hapticFeedback.light(); // Provide subtle feedback when toggling

    // Log analytics event
    analyticsService.logEvent('faq_item_toggled', {
      question,
      action: isOpen ? 'collapsed' : 'expanded',
    });

    // Announce to screen readers
    if (!isOpen) {
      AccessibilityInfo.announceForAccessibility(
        t('settings.help.accessibility.expanded', { question, answer })
      );
    } else {
      AccessibilityInfo.announceForAccessibility(
        t('settings.help.accessibility.collapsed', { question })
      );
    }
  };

  return (
    <Animated.View
      style={[
        styles.faqItemContainer,
        {
          opacity: animations.fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        onPress={toggleFAQ}
        style={styles.faqQuestionRow}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityHint={
          isOpen
            ? t('settings.help.accessibility.collapseHint')
            : t('settings.help.accessibility.expandHint')
        }
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        {/* **SIMPLIFIED CHEVRON ROTATION**: State-based rotation instead of complex animation */}
        <View style={chevronStyle}>
          <Icon name="chevron-down" size={24} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <Animated.View style={answerAnimatedStyle}>
          <Text style={styles.faqAnswer} accessibilityRole="text">
            {answer}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const EnhancedHelpScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('help_screen');
  }, []);

  const faqs = t('settings.help.faq', { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  const handleContactSupport = () => {
    hapticFeedback.medium(); // Provide feedback for important action

    // Log analytics event
    analyticsService.logEvent('contact_support_clicked');

    Linking.openURL('mailto:yeserapp@gmail.com?subject=Yeser Destek Talebi');
  };

  const styles = createStyles(theme);

  return (
    <ScreenLayout
      scrollable={true}
      showsVerticalScrollIndicator={false}
      edges={['top']}
      edgeToEdge={true}
    >
      <ScreenHeader
        showBackButton
        title={t('settings.help.title')}
        onBackPress={() => navigation.goBack()}
        variant="default"
      />
      <ScreenSection title={t('settings.help.sectionHelp')}>
        <View />
      </ScreenSection>

      <ScreenSection title={t('settings.help.sectionFAQ')}>
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            theme={theme}
            _index={index}
            t={t}
          />
        ))}
      </ScreenSection>

      <ScreenSection title={t('settings.help.sectionSupport')}>
        <Text style={styles.paragraph} accessibilityRole="text">
          {t('settings.help.supportText')}
        </Text>

        <TouchableOpacity
          onPress={handleContactSupport}
          style={styles.contactButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('settings.help.contactEmailLabel')}
          accessibilityHint={t('settings.help.contactEmailHint')}
        >
          <Icon
            name="email"
            size={20}
            color={theme.colors.onPrimary}
            style={styles.contactButtonIcon}
          />
          <Text style={styles.contactButtonText}>{t('settings.help.contactCTA')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('settings.help.appVersion')}</Text>
      </ScreenSection>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    paragraph: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.medium,
      textAlign: 'justify',
      lineHeight: 24,
    },
    faqItemContainer: {
      marginBottom: theme.spacing.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: theme.spacing.medium,
    },
    faqQuestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.small,
    },
    faqQuestion: {
      ...theme.typography.titleMedium,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.spacing.small,
    },
    faqAnswer: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.small,
      paddingLeft: theme.spacing.small,
      textAlign: 'justify',
      lineHeight: 22,
    },
    contactButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.medium,
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.borderRadius.medium,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.medium,
      // 🌟 Beautiful primary shadow for contact button
      ...getPrimaryShadow.floating(theme),
    },
    contactButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onPrimary,
    },
    contactButtonIcon: {
      marginRight: theme.spacing.small,
    },
    versionText: {
      ...theme.typography.labelSmall,
      color: theme.colors.tertiary,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
  });

export default EnhancedHelpScreen;
