// src/screens/EnhancedPrivacyPolicyScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../providers/ThemeProvider';
import { ScreenLayout } from '../../../shared/components/layout';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../../themes/types';

const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  return (
    <ScreenLayout edges={['bottom']} showsVerticalScrollIndicator={false} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Gizlilik Politikası ve KVKK</Text>
          <Text style={styles.subtitle}>
            Son güncellenme: {new Date().toLocaleDateString('tr-TR')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Veri Sorumlusu</Text>
          <Text style={styles.sectionText}>
            Yeşer uygulaması olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)
            kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi işlemekteyiz.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Toplanan Veriler</Text>
          <Text style={styles.sectionText}>
            Uygulamamızda şu kişisel veriler toplanmaktadır:{'\n\n'}• E-posta adresiniz (giriş için)
            {'\n'}• Kullanıcı adınız (isteğe bağlı){'\n'}• Minnet günlüğü girişleriniz{'\n'}•
            Bildirim tercihleri{'\n'}• Uygulama kullanım istatistikleri (anonim)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Veri İşleme Amaçları</Text>
          <Text style={styles.sectionText}>
            Kişisel verileriniz şu amaçlarla işlenmektedir:{'\n\n'}• Hizmet sunumu ve kullanıcı
            deneyimi{'\n'}• Kimlik doğrulama ve hesap güvenliği{'\n'}• Bildirim gönderimi (izniniz
            dahilinde){'\n'}• Uygulama performansını iyileştirme{'\n'}• Yasal yükümlülüklerin yerine
            getirilmesi
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Veri Güvenliği</Text>
          <Text style={styles.sectionText}>
            Verilerinizin güvenliği için endüstri standardında güvenlik önlemleri almaktayız:
            {'\n\n'}• Şifreli veri iletimi (SSL/TLS){'\n'}• Güvenli veri depolama (Supabase){'\n'}•
            Erişim kontrolü ve yetkilendirme{'\n'}• Düzenli güvenlik güncellemeleri
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. KVKK Haklarınız</Text>
          <Text style={styles.sectionText}>
            KVKK kapsamında sahip olduğunuz haklar:{'\n\n'}• Kişisel verilerinizin işlenip
            işlenmediğini öğrenme{'\n'}• İşlenen verileriniz hakkında bilgi talep etme{'\n'}• İşleme
            amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme{'\n'}• Yurt içinde
            veya yurt dışında üçüncü kişileri öğrenme{'\n'}• Eksik veya yanlış işlenmiş verilerin
            düzeltilmesini isteme{'\n'}• Silme veya yok edilmesini isteme{'\n'}• Düzeltme, silme ve
            yok etme işlemlerinin üçüncü kişilere bildirilmesini isteme{'\n'}• İşlenen verilerin
            münhasıran otomatik sistemler ile analiz edilmesi suretiyle kişinin aleyhine bir sonucun
            ortaya çıkmasına itiraz etme{'\n'}• Kanunen uygun olan hallerde, verilerin aktarıldığı
            üçüncü kişilerden de silinmesini isteme
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Veri Saklama Süresi</Text>
          <Text style={styles.sectionText}>
            Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve yasal
            yükümlülüklerimizi yerine getirmek için gerekli olan süre boyunca saklanır. Hesabınızı
            sildiğinizde, tüm kişisel verileriniz kalıcı olarak silinir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Çerezler ve Analitik</Text>
          <Text style={styles.sectionText}>
            Uygulamamızda kullanıcı deneyimini iyileştirmek için anonim analitik veriler
            toplamaktayız. Bu veriler kişisel kimliğinizi ortaya çıkarmayacak şekilde işlenmektedir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Üçüncü Taraf Hizmetler</Text>
          <Text style={styles.sectionText}>
            Uygulamamız şu üçüncü taraf hizmetleri kullanmaktadır:{'\n\n'}• Supabase (veri depolama
            ve kimlik doğrulama){'\n'}• Google OAuth (isteğe bağlı giriş)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Hesap Silme ve Veri İmhası</Text>
          <Text style={styles.sectionText}>
            KVKK kapsamında "unutulma hakkınız" bulunmaktadır. Hesabınızı silme konusunda:{'\n\n'}•
            Hesap Silme Süreci: Ayarlar {'>'} Hesap {'>'} Hesabımı Sil menüsünden
            gerçekleştirebilirsiniz{'\n'}• Kalıcı Silme: Bu işlem GERİ ALINAMAZ ve tüm verileriniz
            kalıcı olarak silinir{'\n'}• Silinen Veriler: Minnet günlüğü girişleriniz, hesap
            bilgileri, istatistikleriniz, bildirim ayarlarınız{'\n'}• Silme Süresi: Hesap silme
            işlemi ANINDA gerçekleşir{'\n'}• Yedekleme Önerisi: Silmeden önce verilerinizi dışa
            aktarmanızı önemle tavsiye ederiz{'\n'}• Tekrar Kayıt: Aynı e-posta ile tekrar kayıt
            olabilirsiniz, ancak geçmiş verileriniz geri gelmez
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Diğer Haklarınızı Kullanma</Text>
          <Text style={styles.sectionText}>
            KVKK kapsamındaki diğer haklarınızı kullanmak için:{'\n\n'}• Veri Dışa Aktarma: Ayarlar{' '}
            {'>'} Veri Dışa Aktarma menüsünden JSON formatında{'\n'}• Bildirim Ayarları: Uygulama
            içinden dilediğiniz zaman değiştirebilirsiniz{'\n'}• Veri Düzeltme: Profil bilgilerinizi
            ve Minnet girişlerinizi düzenleyebilirsiniz{'\n'}• Destek Talebi: Uygulama içindeki
            destek kanalları üzerinden bizimle iletişime geçebilirsiniz{'\n'}• Şikayet Hakkı: Veri
            İşleme Değerlendirme Kurulu'na başvuru hakkınız bulunmaktadır
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. İletişim</Text>
          <Text style={styles.sectionText}>
            Gizlilik politikamız veya KVKV haklarınız hakkında sorularınız için uygulama içindeki
            destek kanalları üzerinden bizimle iletişime geçebilirsiniz. Hesap silme işlemi ile
            ilgili herhangi bir sorunuz varsa, işlemi gerçekleştirmeden önce bizimle iletişime
            geçmenizi öneririz.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bu gizlilik politikası KVKK ve diğer geçerli veri koruma mevzuatı uyarınca
            hazırlanmıştır ve düzenli olarak güncellenmektedir.
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
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
