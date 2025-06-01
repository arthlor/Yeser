// src/screens/EnhancedHelpScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';
import { hapticFeedback } from '../utils/hapticFeedback';

interface FAQItemProps {
  question: string;
  answer: string;
  theme: AppTheme;
  _index: number;
}

const FAQItem: React.FC<FAQItemProps> = ({
  question,
  answer,
  theme,
  _index,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const styles = createStyles(theme);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate chevron rotation when expanding/collapsing
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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
        `${question} açıldı. ${answer}`
      );
    } else {
      AccessibilityInfo.announceForAccessibility(`${question} kapandı.`);
    }
  };

  return (
    <View style={styles.faqItemContainer}>
      <TouchableOpacity
        onPress={toggleFAQ}
        style={styles.faqQuestionRow}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityHint={
          isOpen ? 'Soruyu kapatmak için dokunun' : 'Cevabı görmek için dokunun'
        }
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons
            name="chevron-down-outline"
            size={24}
            color={theme.colors.primary}
          />
        </Animated.View>
      </TouchableOpacity>

      {isOpen && (
        <Text style={styles.faqAnswer} accessibilityRole="text">
          {answer}
        </Text>
      )}
    </View>
  );
};

const EnhancedHelpScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityLabel="Yardım ve SSS ekranı"
    >
      <Text style={styles.title} accessibilityRole="header">
        Yardım & SSS
      </Text>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Sıkça Sorulan Sorular
      </Text>

      {faqs.map((faq, index) => (
        <FAQItem
          key={index}
          question={faq.question}
          answer={faq.answer}
          theme={theme}
          _index={index}
        />
      ))}

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Destek
      </Text>
      <Text style={styles.paragraph} accessibilityRole="text">
        Aradığınız cevabı bulamadınız mı? Destek ekibimizle iletişime geçmekten
        çekinmeyin.
      </Text>

      <TouchableOpacity
        onPress={handleContactSupport}
        style={styles.contactButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Destek ekibine e-posta gönder"
        accessibilityHint="E-posta uygulamanızı açar"
      >
        <Ionicons
          name="mail-outline"
          size={20}
          color={theme.colors.onPrimary}
          style={styles.contactButtonIcon}
        />
        <Text style={styles.contactButtonText}>Destekle İletişime Geç</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Yeşer v1.0.0</Text>
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 2,
    },
    title: {
      ...theme.typography.displaySmall,
      color: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    sectionTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.text,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    paragraph: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      textAlign: 'justify',
      lineHeight: 24,
    },
    faqItemContainer: {
      marginBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: theme.spacing.md,
    },
    faqQuestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    faqQuestion: {
      ...theme.typography.titleMedium,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    faqAnswer: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      paddingLeft: theme.spacing.sm,
      textAlign: 'justify',
      lineHeight: 22,
    },
    contactButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    contactButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onPrimary,
    },
    contactButtonIcon: {
      marginRight: theme.spacing.sm,
    },
    versionText: {
      ...theme.typography.labelSmall,
      color: theme.colors.tertiary,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
  });

export default EnhancedHelpScreen;
