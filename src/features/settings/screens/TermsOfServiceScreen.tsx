// src/screens/EnhancedTermsOfServiceScreen.tsx
import { Ionicons } from '@expo/vector-icons';

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { AppTheme } from '@/themes/types';

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

const TermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('terms_of_service');
  }, []);

  return (
    <ScreenLayout edges={['top']} edgeToEdge={true}>
      {/* Header Section */}
      <ScreenSection spacing="large">
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
            Son Güncelleme: 12 Haziran 2025
          </Text>
        </View>
      </ScreenSection>

      {/* Content Section */}
      <ScreenSection spacing="large">
        <ThemedCard density="comfortable" elevation="card" style={styles.card}>
          <TermsSection number="1" title="Giriş ve Kabul">
            <Text style={styles.paragraph}>
              Yeşer mobil uygulamasına hoş geldiniz. Bu Kullanım Koşulları, Uygulamaya erişiminizi
              ve Uygulamayı kullanımınızı yönetir. Uygulamayı indirerek, yükleyerek veya kullanarak
              bu Koşullara bağlı kalmayı kabul edersiniz. Bu koşulları kabul etmiyorsanız, lütfen
              uygulamayı kullanmayın.
            </Text>
          </TermsSection>

          <TermsSection number="2" title="Premium Uygulama ve Ödeme Koşulları">
            <Text style={styles.paragraph}>
              Yeşer ücretli bir premium uygulamadır. Uygulama 39,99 TL tek seferlik ödeme ile satın
              alınır ve tüm özelliklerine sınırsız erişim sağlar. Ödeme koşulları:
            </Text>
            <Text style={styles.listItem}>
              • Tek Seferlik Ödeme: Abonelik sistemi yoktur, sadece bir kez ödersiniz
            </Text>
            <Text style={styles.listItem}>
              • App Store/Google Play: Tüm ödemeler ilgili uygulama mağazaları üzerinden işlenir
            </Text>
            <Text style={styles.listItem}>
              • İade Politikası: İade talepleri Apple/Google'ın politikalarına tabidir
            </Text>
            <Text style={styles.listItem}>• KDV Dahil: Belirtilen fiyat KDV dahildir</Text>
          </TermsSection>

          <TermsSection number="3" title="Uygulamanın Kullanımı ve Yaş Sınırı">
            <Text style={styles.paragraph}>
              Uygulamayı yalnızca yasal amaçlarla ve bu Koşullara uygun olarak kullanmayı kabul
              edersiniz. Uygulama 13 yaş ve üzeri kullanıcılar için tasarlanmıştır. 13 yaş altındaki
              kullanıcılar ebeveyn izni olmadan uygulamayı kullanamaz.
            </Text>
            <Text style={styles.paragraph}>Yasak kullanımlar:</Text>
            <Text style={styles.listItem}>• Yasa dışı veya zararlı içerik paylaşmak</Text>
            <Text style={styles.listItem}>• Başkalarının haklarını ihlal etmek</Text>
            <Text style={styles.listItem}>• Uygulamanın güvenliğini tehlikeye atmak</Text>
            <Text style={styles.listItem}>• Ticari amaçlarla izinsiz kullanım</Text>
          </TermsSection>

          <TermsSection number="4" title="Hesap Yönetimi ve Sonlandırma">
            <Text style={styles.paragraph}>Hesabınızı yönetme ve sonlandırma koşulları:</Text>
            <Text style={styles.listItem}>
              • Hesap Sorumluluğu: Hesap güvenliğinden siz sorumlusunuz
            </Text>
            <Text style={styles.listItem}>
              • Hesap Silme: İstediğiniz zaman hesabınızı silebilirsiniz
            </Text>
            <Text style={styles.listItem}>
              • Veri Yedekleme: Hesap silmeden önce verilerinizi yedeklemeniz önerilir
            </Text>
            <Text style={styles.listItem}>
              • Otomatik Silme: 2 yıl boyunca kullanılmayan hesaplar silinebilir
            </Text>
          </TermsSection>

          <TermsSection number="5" title="Fikri Mülkiyet">
            <Text style={styles.paragraph}>
              Uygulama ve içeriği, özellikleri ve işlevselliği (tüm bilgiler, yazılımlar, metinler,
              ekranlar, resimler, video ve ses ile bunların tasarımı, seçimi ve düzenlenmesi dahil
              ancak bunlarla sınırlı olmamak üzere) Yeşer'e aittir ve uluslararası telif hakkı,
              ticari marka, patent, ticari sır ve diğer fikri mülkiyet yasalarıyla korunmaktadır.
            </Text>
          </TermsSection>

          <TermsSection number="6" title="Veri Sorumluluğu ve Yedekleme">
            <Text style={styles.paragraph}>
              Veri güvenliği ve yedekleme konularında sorumluluklar:
            </Text>
            <Text style={styles.listItem}>
              • Düzenli Yedekleme: Uygulamada güvenli veri depolama sağlanır
            </Text>
            <Text style={styles.listItem}>
              • Veri Kaybı: Teknik arızalar durumunda veri kurtarma için çaba harcanır
            </Text>
            <Text style={styles.listItem}>
              • Kullanıcı Sorumluluğu: Önemli verilerinizi düzenli olarak dışa aktarmanız önerilir
            </Text>
            <Text style={styles.listItem}>• Sunucu Bakımı: Planlı bakımlar önceden duyurulur</Text>
          </TermsSection>

          <TermsSection number="7" title="Sorumluluğun Reddi">
            <Text style={styles.paragraph}>
              Uygulama "olduğu gibi" ve "mevcut olduğu gibi" esasına göre sağlanır. Yasaların izin
              verdiği azami ölçüde, satılabilirlik, belirli bir amaca uygunluk ve ihlal etmeme
              garantileri dahil ancak bunlarla sınırlı olmamak üzere, açık veya zımni her türlü
              garantiyi reddederiz.
            </Text>
          </TermsSection>

          <TermsSection number="8" title="Sorumluluğun Sınırlandırılması">
            <Text style={styles.paragraph}>
              Yasaların izin verdiği azami ölçüde, Yeşer Uygulamayı kullanımınızdan veya
              kullanamamanızdan kaynaklanan herhangi bir dolaylı, arızi, özel, sonuç olarak ortaya
              çıkan veya cezai zarardan (kar kaybı, veri kaybı veya itibar kaybı dahil ancak
              bunlarla sınırlı olmamak üzere) sorumlu olmayacaktır.
            </Text>
          </TermsSection>

          <TermsSection number="9" title="Geçerli Hukuk ve Yargı Yetkisi">
            <Text style={styles.paragraph}>
              Bu Koşullar Türkiye Cumhuriyeti yasalarına tabidir ve bu yasalara göre yorumlanır. Bu
              Koşullardan kaynaklanan uyuşmazlıklar yerel mahkemeler ve İcra Müdürlüklerinin
              yetkisindedir.
            </Text>
          </TermsSection>

          <TermsSection number="10" title="Mücbir Sebepler">
            <Text style={styles.paragraph}>
              Doğal afetler, savaş, hükümet eylemleri, pandemi, internet kesintileri veya bizim
              kontrolümüz dışındaki diğer mücbir sebepler nedeniyle hizmet kesintileri yaşanması
              durumunda sorumluluğumuz sınırlıdır.
            </Text>
          </TermsSection>

          <TermsSection number="11" title="Bu Koşullardaki Değişiklikler">
            <Text style={styles.paragraph}>
              Bu Koşulları zaman zaman güncelleyebiliriz. Önemli değişiklikler için uygulama içi
              bildirim göndereceğiz. Revize edilmiş Koşulların yayınlanmasından sonra Uygulamayı
              kullanmaya devam etmeniz, değişiklikleri kabul ettiğiniz anlamına gelir.
            </Text>
          </TermsSection>

          <TermsSection number="12" title="İletişim">
            <Text style={styles.paragraph}>
              Bu Kullanım Koşulları hakkında herhangi bir sorunuz varsa, lütfen bizimle iletişime
              geçin:
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="E-posta ile iletişime geç"
              accessibilityHint="Kullanım koşulları hakkında soru sormak için e-posta gönder"
            >
              <Text style={styles.contactLink}>E-posta: anilkaraca140@gmail.com</Text>
            </TouchableOpacity>
            <Text style={styles.paragraph}>
              Sorularınızı en geç 5 iş günü içinde yanıtlamaya çalışırız.
            </Text>
          </TermsSection>
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
