import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';
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
            Please check your network settings and try again. VEXA requires an active internet connection to function.
          </Text>
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
  },
});

export default NoNetworkScreen;
