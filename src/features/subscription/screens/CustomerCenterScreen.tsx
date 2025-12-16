import { StyleSheet, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

export const CustomerCenterScreen = () => {
  return (
    <View style={styles.container}>
      <RevenueCatUI.CustomerCenterView />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
