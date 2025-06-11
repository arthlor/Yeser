// src/screens/EnhancedHelpScreen.tsx
import React, { useEffect, useState } from 'react';
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

import { ScreenLayout, ScreenSection } from '@/shared/components/layout';
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
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, theme, _index }) => {
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
      AccessibilityInfo.announceForAccessibility(`${question} açıldı. ${answer}`);
    } else {
      AccessibilityInfo.announceForAccessibility(`${question} kapandı.`);
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
        accessibilityHint={isOpen ? 'Soruyu kapatmak için dokunun' : 'Cevabı görmek için dokunun'}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        {/* **SIMPLIFIED CHEVRON ROTATION**: State-based rotation instead of complex animation */}
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <Icon name="chevron-down" size={24} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <Animated.View
          style={{
            opacity: animations.opacityAnim,
          }}
        >
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

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('help_screen');
  }, []);

  const faqs = [
    {
      question: 'Yeşer uygulaması nedir?',
      answer:
        'Yeşer, günlük minnettarlıklarınızı kaydederek pozitif düşünce alışkanlığı geliştirmenize yardımcı olan bir mobil uygulamadır.',
    },
    {
      question: 'Hatırlatıcıları nasıl ayarlarım?',
      answer:
        'Ana ekrandaki "Hatırlatıcı Ayarları" bölümünden veya Ayarlar menüsünden günlük hatırlatıcı saatini ve durumunu ayarlayabilirsiniz.',
    },
    {
      question: 'Verilerim güvende mi?',
      answer:
        'Evet, verileriniz güvenli bir şekilde saklanır. Detaylı bilgi için Gizlilik Politikamızı inceleyebilirsiniz.',
    },
    {
      question: 'Geri bildirimde nasıl bulunabilirim?',
      answer:
        'Uygulama hakkındaki düşüncelerinizi ve önerilerinizi destek@yeser.app adresine e-posta göndererek bizimle paylaşabilirsiniz.',
    },
    {
      question: 'Minnettarlık günlüğü tutmanın faydaları nelerdir?',
      answer:
        'Minnettarlık günlüğü tutmak, ruh halinizi iyileştirebilir, stres seviyenizi düşürebilir, uyku kalitenizi artırabilir ve genel olarak yaşam memnuniyetinizi yükseltebilir. Düzenli olarak minnettarlıklarınızı kaydetmek, olumlu düşünce alışkanlığı geliştirmenize yardımcı olur.',
    },
  ];

  const handleContactSupport = () => {
    hapticFeedback.medium(); // Provide feedback for important action

    // Log analytics event
    analyticsService.logEvent('contact_support_clicked');

    Linking.openURL('mailto:destek@yeser.app?subject=Yeşer Destek Talebi');
  };

  const styles = createStyles(theme);

  return (
    <ScreenLayout
      scrollable={true}
      showsVerticalScrollIndicator={false}
      edges={['top']}
      edgeToEdge={true}
    >
      <ScreenSection title="Yardım & SSS">
        <View />
      </ScreenSection>

      <ScreenSection title="Sıkça Sorulan Sorular">
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            theme={theme}
            _index={index}
          />
        ))}
      </ScreenSection>

      <ScreenSection title="Destek">
        <Text style={styles.paragraph} accessibilityRole="text">
          Aradığınız cevabı bulamadınız mı? Destek ekibimizle iletişime geçmekten çekinmeyin.
        </Text>

        <TouchableOpacity
          onPress={handleContactSupport}
          style={styles.contactButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Destek ekibine e-posta gönder"
          accessibilityHint="E-posta uygulamanızı açar"
        >
          <Icon
            name="email"
            size={20}
            color={theme.colors.onPrimary}
            style={styles.contactButtonIcon}
          />
          <Text style={styles.contactButtonText}>Destekle İletişime Geç</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Yeşer v1.0.0</Text>
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
