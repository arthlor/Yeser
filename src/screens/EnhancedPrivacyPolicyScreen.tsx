// src/screens/EnhancedPrivacyPolicyScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';

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

const EnhancedPrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('privacy_policy');
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityRole="scrollbar"
      accessibilityLabel="Gizlilik Politikası Sayfası"
    >
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
          Son Güncelleme: 01.06.2025
        </Text>
      </View>

      <ThemedCard style={styles.card}>
        <Section title="Giriş">
          <Text style={styles.paragraph}>
            Yeşer ("biz", "bizim" veya "uygulama") olarak gizliliğinize değer veriyoruz. Bu Gizlilik
            Politikası, Yeşer mobil uygulamasını kullandığınızda bilgilerinizi nasıl topladığımızı,
            kullandığımızı, açıkladığımızı ve koruduğumuzu açıklamaktadır. Lütfen bu gizlilik
            politikasını dikkatlice okuyun. Bu gizlilik politikasının şartlarını kabul etmiyorsanız,
            lütfen uygulamaya erişmeyin.
          </Text>
        </Section>

        <Section title="Bilgilerinizin Toplanması">
          <Text style={styles.paragraph}>
            Uygulamayı kullandığınızda sizden çeşitli şekillerde bilgi toplayabiliriz. Uygulama
            aracılığıyla toplayabileceğimiz bilgiler şunları içerir:
          </Text>
          <ListItem text="Kişisel Veriler: E-posta adresiniz, kullanıcı adınız gibi gönüllü olarak bize verdiğiniz kişisel kimlik bilgileri." />
          <ListItem text="Minnettarlık Günlüğü Verileri: Uygulamaya girdiğiniz minnettarlık kayıtlarınız. Bu veriler hesabınızla ilişkilendirilir ve güvenli bir şekilde saklanır." />
          <ListItem text="Kullanım Verileri: Uygulamadaki özelliklerle nasıl etkileşimde bulunduğunuz gibi otomatik olarak toplanan bilgiler." />
        </Section>

        <Section title="Bilgilerinizin Kullanımı">
          <Text style={styles.paragraph}>
            Hakkınızda doğru bilgilere sahip olmak, size sorunsuz, verimli ve özelleştirilmiş bir
            deneyim sunmamızı sağlar. Özellikle, uygulama aracılığıyla hakkınızda toplanan bilgileri
            şu amaçlarla kullanabiliriz:
          </Text>
          <ListItem text="Hesabınızı oluşturmak ve yönetmek." />
          <ListItem text="Size minnettarlık günlüğü özelliklerini sunmak." />
          <ListItem text="Uygulamayı iyileştirmek ve kullanıcı deneyimini kişiselleştirmek." />
          <ListItem text="Kullanım ve eğilimleri analiz etmek." />
        </Section>

        <Section title="Bilgilerinizin Açıklanması">
          <Text style={styles.paragraph}>
            Aşağıdaki durumlar dışında bilgilerinizi herhangi bir üçüncü tarafa satmayız, dağıtmayız
            veya kiralamayız:
          </Text>
          <ListItem text="Yasalar Gerektirdiğinde: Yasal süreçlere yanıt vermek, potansiyel politika ihlallerini araştırmak veya haklarımızı, mülkiyetimizi ve güvenliğimizi korumak için bilgi açıklamasının gerekli olduğuna inandığımızda." />
          <ListItem text="Hizmet Sağlayıcılar: Veri depolama veya müşteri hizmetleri gibi bizim adımıza hizmet veren üçüncü taraf hizmet sağlayıcılarla. Bu hizmet sağlayıcıların bilgilerinizi korumaları ve yalnızca bizim adımıza hizmet vermek için kullanmaları gerekmektedir." />
        </Section>

        <Section title="Bilgilerinizin Güvenliği">
          <Text style={styles.paragraph}>
            Bilgilerinizi korumak için idari, teknik ve fiziksel güvenlik önlemleri kullanıyoruz.
            Makul önlemler alsak da, hiçbir güvenlik önleminin mükemmel veya aşılmaz olmadığını ve
            hiçbir veri aktarım yönteminin herhangi bir müdahaleye veya başka tür bir kötüye
            kullanıma karşı garanti edilemeyeceğini lütfen unutmayın.
          </Text>
        </Section>

        <Section title="Çocukların Gizliliği">
          <Text style={styles.paragraph}>
            13 yaşın altındaki çocuklardan bilerek kişisel kimlik bilgileri toplamıyoruz. Ebeveyn
            veya vasi iseniz ve çocuğunuzun bize kişisel bilgiler verdiğini fark ederseniz, lütfen
            bizimle iletişime geçin.
          </Text>
        </Section>

        <Section title="Bu Gizlilik Politikasındaki Değişiklikler">
          <Text style={styles.paragraph}>
            Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Bu sayfada yeni Gizlilik
            Politikasını yayınlayarak herhangi bir değişikliği size bildireceğiz. Herhangi bir
            değişiklik için bu Gizlilik Politikasını periyodik olarak gözden geçirmeniz önerilir.
          </Text>
        </Section>

        <Section title="Bize Ulaşın">
          <Text style={styles.paragraph}>
            Bu Gizlilik Politikası hakkında herhangi bir sorunuz veya yorumunuz varsa, lütfen
            bizimle iletişime geçin:
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="E-posta ile iletişime geç"
            accessibilityHint="Gizlilik politikası hakkında soru sormak için e-posta gönder"
          >
            <Text style={styles.contactLink}>iletisim@yeserapp.com</Text>
          </TouchableOpacity>
        </Section>
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
    },
    listItemContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.small,
      paddingLeft: theme.spacing.small,
    },
    listIcon: {
      marginRight: theme.spacing.small,
      marginTop: 3, // Align with text
    },
    listItem: {
      ...theme.typography.body1,
      color: theme.colors.text,
      flex: 1,
    },
    contactLink: {
      ...theme.typography.body1,
      color: theme.colors.primary,
      textDecorationLine: 'underline',
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
    },
  });

export default EnhancedPrivacyPolicyScreen;
