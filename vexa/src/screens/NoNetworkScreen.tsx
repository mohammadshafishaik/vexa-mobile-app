import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const NoNetworkScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
          <View style={styles.iconContainer}>
            <WifiOff size={48} color={colors.error} />
          </View>
          <Text style={styles.title}>No Internet Connection</Text>
          <Text style={styles.subtitle}>
            VEXA needs an active internet connection to work. Please check your Wi-Fi or mobile data and try again.
          </Text>
          <View style={styles.hint}>
            <Text style={styles.hintText}>The app will reconnect automatically once your connection is restored.</Text>
          </View>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  hint: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  hintText: {
    ...typography.bodySmall,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NoNetworkScreen;
