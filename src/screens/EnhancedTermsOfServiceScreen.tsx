// src/screens/EnhancedTermsOfServiceScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';

interface TermsSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

const TermsSection: React.FC<TermsSectionProps> = ({ number, title, children }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const fullTitle = `${number}. ${title}`;

  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header" accessibilityLabel={fullTitle}>
        {fullTitle}
      </Text>
      {children}
    </View>
  );
};

const EnhancedTermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('terms_of_service');

    // Check if screen reader is enabled and adjust content if needed
    AccessibilityInfo.isScreenReaderEnabled().then((screenReaderEnabled) => {
      if (screenReaderEnabled) {
        // Could adjust content for better screen reader experience if needed
        console.log('Screen reader is enabled, optimizing accessibility');
      }
    });
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityRole="scrollbar"
      accessibilityLabel="Kullanım Koşulları Sayfası"
    >
      <View style={styles.headerContainer}>
        <Ionicons
          name="document-text-outline"
          size={40}
          color={theme.colors.primary}
          accessibilityLabel="Kullanım koşulları ikonu"
        />
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel="Kullanım Koşulları"
        >
          Kullanım Koşulları
        </Text>
        <Text style={styles.lastUpdated} accessibilityLabel="Son güncelleme tarihi">
          Son Güncelleme: 01.06.2025
        </Text>
      </View>

      <ThemedCard style={styles.card}>
        <TermsSection number="1" title="Giriş">
          <Text style={styles.paragraph}>
            Yeşer mobil uygulamasına ("Uygulama") hoş geldiniz. Bu Kullanım Koşulları ("Koşullar"),
            Uygulamaya erişiminizi ve Uygulamayı kullanımınızı yönetir. Uygulamaya erişerek veya
            Uygulamayı kullanarak, bu Koşullara bağlı kalmayı kabul edersiniz.
          </Text>
        </TermsSection>

        <TermsSection number="2" title="Uygulamanın Kullanımı">
          <Text style={styles.paragraph}>
            Uygulamayı yalnızca yasal amaçlarla ve bu Koşullara uygun olarak kullanmayı kabul
            edersiniz. Uygulamayı, başkalarının haklarını ihlal edecek veya kısıtlayacak ya da
            engelleyecek şekilde kullanmamayı kabul edersiniz.
          </Text>
        </TermsSection>

        <TermsSection number="3" title="Fikri Mülkiyet">
          <Text style={styles.paragraph}>
            Uygulama ve içeriği, özellikleri ve işlevselliği (tüm bilgiler, yazılımlar, metinler,
            ekranlar, resimler, video ve ses ile bunların tasarımı, seçimi ve düzenlenmesi dahil
            ancak bunlarla sınırlı olmamak üzere) Yeşer'e, lisans verenlerine veya bu tür
            materyallerin diğer sağlayıcılarına aittir ve uluslararası telif hakkı, ticari marka,
            patent, ticari sır ve diğer fikri mülkiyet veya mülkiyet hakları yasalarıyla
            korunmaktadır.
          </Text>
        </TermsSection>

        <TermsSection number="4" title="Sorumluluğun Reddi">
          <Text style={styles.paragraph}>
            Uygulama "olduğu gibi" ve "mevcut olduğu gibi" esasına göre sağlanır. Yasaların izin
            verdiği azami ölçüde, Yeşer, satılabilirlik, belirli bir amaca uygunluk ve ihlal etmeme
            garantileri dahil ancak bunlarla sınırlı olmamak üzere, açık veya zımni her türlü
            garantiyi reddeder.
          </Text>
        </TermsSection>

        <TermsSection number="5" title="Sorumluluğun Sınırlandırılması">
          <Text style={styles.paragraph}>
            Yeşer, Uygulamayı kullanımınızdan veya kullanamamanızdan kaynaklanan herhangi bir
            dolaylı, arızi, özel, sonuç olarak ortaya çıkan veya cezai zarardan (kar kaybı, veri
            kaybı veya itibar kaybı dahil ancak bunlarla sınırlı olmamak üzere) sorumlu
            olmayacaktır.
          </Text>
        </TermsSection>

        <TermsSection number="6" title="Bu Koşullardaki Değişiklikler">
          <Text style={styles.paragraph}>
            Bu Koşulları zaman zaman kendi takdirimize bağlı olarak revize edebilir ve
            güncelleyebiliriz. Tüm değişiklikler yayınlandıkları anda yürürlüğe girer. Revize
            edilmiş Koşulların yayınlanmasından sonra Uygulamayı kullanmaya devam etmeniz,
            değişiklikleri kabul ettiğiniz ve onayladığınız anlamına gelir.
          </Text>
        </TermsSection>

        <TermsSection number="7" title="Bize Ulaşın">
          <Text style={styles.paragraph}>
            Bu Kullanım Koşulları hakkında herhangi bir sorunuz varsa, lütfen bizimle iletişime
            geçin:
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="E-posta ile iletişime geç"
            accessibilityHint="Kullanım koşulları hakkında soru sormak için e-posta gönder"
          >
            <Text style={styles.contactLink}>iletisim@yeserapp.com</Text>
          </TouchableOpacity>
        </TermsSection>
      </ThemedCard>
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
      padding: theme.spacing.medium,
      paddingBottom: theme.spacing.large,
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.medium,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.primary,
      marginTop: theme.spacing.small,
      marginBottom: theme.spacing.small,
      textAlign: 'center',
    },
    lastUpdated: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.medium,
    },
    card: {
      padding: theme.spacing.medium,
      marginBottom: theme.spacing.medium,
    },
    section: {
      marginBottom: theme.spacing.large,
    },
    heading: {
      ...theme.typography.h2,
      color: theme.colors.primary,
      marginBottom: theme.spacing.small,
    },
    paragraph: {
      ...theme.typography.body1,
      color: theme.colors.text,
      marginBottom: theme.spacing.medium,
      textAlign: 'justify',
      lineHeight: theme.typography.body1.lineHeight ? theme.typography.body1.lineHeight * 1.4 : 24,
    },
    contactLink: {
      ...theme.typography.body1,
      color: theme.colors.primary,
      textDecorationLine: 'underline',
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
    },
  });

export default EnhancedTermsOfServiceScreen;
