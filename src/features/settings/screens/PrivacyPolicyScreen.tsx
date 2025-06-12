// src/screens/EnhancedPrivacyPolicyScreen.tsx
import { Ionicons } from '@expo/vector-icons';

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { AppTheme } from '@/themes/types';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header" accessibilityLabel={title}>
        {title}
      </Text>
      {children}
    </View>
  );
};

interface ListItemProps {
  text: string;
}

const ListItem: React.FC<ListItemProps> = ({ text }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.listItemContainer} accessibilityRole="text" accessibilityLabel={text}>
      <Ionicons
        name="checkmark-circle-outline"
        size={18}
        color={theme.colors.primary}
        style={styles.listIcon}
      />
      <Text style={styles.listItem}>{text}</Text>
    </View>
  );
};

const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('privacy_policy');
  }, []);

  return (
    <ScreenLayout edges={['top']} edgeToEdge={true}>
      {/* Header Section */}
      <ScreenSection spacing="large">
        <View style={styles.headerContainer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={40}
            color={theme.colors.primary}
            accessibilityLabel="Gizlilik ikonu"
          />
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel="Gizlilik Politikası"
          >
            Gizlilik Politikası
          </Text>
          <Text style={styles.lastUpdated} accessibilityLabel="Son güncelleme tarihi">
            Son Güncelleme: 12 Haziran 2025
          </Text>
        </View>
      </ScreenSection>

      {/* Content Section */}
      <ScreenSection spacing="large">
        <ThemedCard style={styles.card}>
          <Section title="Giriş">
            <Text style={styles.paragraph}>
              Yeşer olarak gizliliğinize değer veriyoruz. Bu Gizlilik Politikası, Yeşer mobil
              uygulamasını kullandığınızda bilgilerinizi nasıl topladığımızı, kullandığımızı,
              açıkladığımızı ve koruduğumuzu açıklamaktadır. Bu politika 6698 sayılı Kişisel
              Verilerin Korunması Kanunu (KVKK) ve ilgili mevzuata uygun olarak hazırlanmıştır.
            </Text>
          </Section>

          <Section title="Toplanan Kişisel Veriler">
            <Text style={styles.paragraph}>
              Uygulamayı kullandığınızda aşağıdaki kişisel verilerinizi işleyebiliriz:
            </Text>
            <ListItem text="Kimlik Bilgileri: E-posta adresiniz, kullanıcı adınız ve tam adınız" />
            <ListItem text="Minnettarlık Kayıtları: Uygulamaya girdiğiniz günlük minnettarlık notlarınız" />
            <ListItem text="Tercih Bilgileri: Bildirim ayarları, günlük hedefler ve tema tercihleri" />
            <ListItem text="Teknik Veriler: Cihaz bilgileri, IP adresi, uygulama kullanım istatistikleri" />
            <ListItem text="Google OAuth Verileri: Google ile giriş yapmanız durumunda Google'dan alınan temel profil bilgileri" />
            <ListItem text="Analytics Verileri: Firebase Analytics aracılığıyla toplanan anonim kullanım verileri" />
          </Section>

          <Section title="Veri İşleme Amaçları">
            <Text style={styles.paragraph}>
              Kişisel verilerinizi KVKK'ya uygun olarak aşağıdaki amaçlarla işliyoruz:
            </Text>
            <ListItem text="Hesabınızı oluşturmak ve yönetmek" />
            <ListItem text="Minnettarlık günlüğü hizmetlerini sunmak" />
            <ListItem text="Kişiselleştirilmiş bildirimler göndermek" />
            <ListItem text="Uygulama performansını iyileştirmek" />
            <ListItem text="Müşteri destek hizmetleri sunmak" />
            <ListItem text="Yasal yükümlülüklerimizi yerine getirmek" />
          </Section>

          <Section title="Veri Paylaşımı ve Aktarımı">
            <Text style={styles.paragraph}>
              Kişisel verilerinizi aşağıdaki durumlar dışında üçüncü taraflarla paylaşmayız:
            </Text>
            <ListItem text="Hizmet Sağlayıcılar: Supabase (veri depolama), Google (OAuth ve Analytics), Firebase (Analytics)" />
            <ListItem text="Yasal Yükümlülükler: Yasal makamların talebi üzerine" />
            <ListItem text="Veri Güvenliği: Verileriniz şifrelenmiş olarak saklanır ve güvenli protokollerle aktarılır" />
            <ListItem text="Uluslararası Aktarım: Verileriniz AB ve ABD'deki sunucularda işlenebilir" />
          </Section>

          <Section title="KVKK Kapsamındaki Haklarınız">
            <Text style={styles.paragraph}>
              KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
            </Text>
            <ListItem text="Bilgi Talep Etme: Verilerinizin işlenip işlenmediğini öğrenme" />
            <ListItem text="Erişim Hakkı: İşlenen verileriniz hakkında bilgi alma" />
            <ListItem text="Düzeltme Hakkı: Yanlış veya eksik verilerin düzeltilmesini isteme" />
            <ListItem text="Silme Hakkı: Belirli şartlarda verilerinizin silinmesini isteme" />
            <ListItem text="İtiraz Hakkı: Veri işleme faaliyetlerine itiraz etme" />
            <ListItem text="Taşınabilirlik: Verilerinizi yapılandırılmış formatta alma" />
          </Section>

          <Section title="Veri Saklama Süreleri">
            <Text style={styles.paragraph}>Kişisel verilerinizi aşağıdaki sürelerle saklarız:</Text>
            <ListItem text="Hesap Bilgileri: Hesabınız aktif olduğu sürece" />
            <ListItem text="Minnettarlık Kayıtları: Hesap silme tarihinden itibaren 30 gün" />
            <ListItem text="Analytics Verileri: Anonim hale getirilerek 26 ay" />
            <ListItem text="Log Kayıtları: Güvenlik amaçlı 12 ay" />
          </Section>

          <Section title="Veri Güvenliği">
            <Text style={styles.paragraph}>
              Verilerinizi korumak için aşağıdaki güvenlik önlemlerini alıyoruz:
            </Text>
            <ListItem text="SSL/TLS şifreleme ile güvenli veri aktarımı" />
            <ListItem text="Veri izolasyonu" />
            <ListItem text="Düzenli güvenlik güncellemeleri ve penetrasyon testleri" />
            <ListItem text="Minimum veri toplama prensibi" />
            <ListItem text="Şifrelenmiş veri depolama" />
          </Section>

          <Section title="Çocukların Gizliliği">
            <Text style={styles.paragraph}>
              Uygulamamız 13 yaş altındaki çocuklar için tasarlanmamıştır. 13 yaş altındaki
              çocuklardan bilerek kişisel veri toplamıyoruz. Ebeveyn veya vasi iseniz ve çocuğunuzun
              bize kişisel bilgi verdiğini fark ederseniz, lütfen bizimle iletişime geçin.
            </Text>
          </Section>

          <Section title="Bu Politikadaki Değişiklikler">
            <Text style={styles.paragraph}>
              Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler için size
              uygulama içi bildirim göndereceğiz. Bu politikayı düzenli olarak gözden geçirmenizi
              öneririz.
            </Text>
          </Section>

          <Section title="İletişim ve Başvuru">
            <Text style={styles.paragraph}>
              KVKK haklarınızı kullanmak veya gizlilik konularında sorularınız için bizimle
              iletişime geçebilirsiniz:
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="E-posta ile iletişime geç"
              accessibilityHint="Gizlilik politikası hakkında soru sormak için e-posta gönder"
            >
              <Text style={styles.contactLink}>E-posta: anilkaraca140@gmail.com</Text>
            </TouchableOpacity>
            <Text style={styles.paragraph}>
              Başvurularınızı KVKK'nın 13. maddesi uyarınca değerlendirip, en geç 30 gün içinde
              sonuçlandıracağız.
            </Text>
          </Section>
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
      padding: theme.spacing.lg,
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
    listItemContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
      paddingLeft: theme.spacing.sm,
    },
    listIcon: {
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },
    listItem: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
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

export default PrivacyPolicyScreen;
