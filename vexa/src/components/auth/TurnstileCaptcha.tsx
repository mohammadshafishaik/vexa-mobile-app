import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { authService } from '../../services/auth';
import { colors } from '../../theme/colors';

type TurnstileCaptchaProps = {
  action: string;
  onTokenChange: (token: string | null) => void;
  onEnabledChange?: (enabled: boolean) => void;
};

const TurnstileCaptcha: React.FC<TurnstileCaptchaProps> = ({
  onTokenChange,
  onEnabledChange,
}) => {
  const [captcha, setCaptcha] = useState<{ id: string; svg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const loadCaptcha = async () => {
    setIsLoading(true);
    setError(null);
    setInputValue('');
    onTokenChange(null);
    try {
      const data = await authService.getCaptchaImage();
      setCaptcha(data);
      onEnabledChange?.(true);
    } catch {
      onEnabledChange?.(false);
      setError('Captcha is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  // Update token whenever user types (format: id:text)
  useEffect(() => {
    if (captcha && inputValue.length > 0) {
      onTokenChange(`${captcha.id}:${inputValue}`);
    } else {
      onTokenChange(null);
    }
  }, [inputValue, captcha, onTokenChange]);

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.white} />
        <Text style={styles.helperText}>Loading captcha...</Text>
      </View>
    );
  }

  if (!captcha) {
    return (
      <View style={styles.fallbackBox}>
        <Text style={styles.fallbackTitle}>Captcha unavailable</Text>
        <Text style={styles.helperText}>
          The backend might be down. You can try logging in anyway if in dev mode.
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Please type the characters you see below:</Text>
      
      <View style={styles.captchaRow}>
        <View style={styles.svgContainer}>
          <SvgXml xml={captcha.svg} width="100%" height="100%" />
        </View>
        <TouchableOpacity style={styles.reloadButton} onPress={loadCaptcha}>
          <Text style={styles.reloadButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter captcha"
        placeholderTextColor={colors.gray400}
        value={inputValue}
        onChangeText={setInputValue}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={6}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 130,
    marginBottom: 10,
  },
  label: {
    color: colors.gray300,
    fontSize: 13,
    marginBottom: 8,
  },
  captchaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  svgContainer: {
    backgroundColor: '#1a1a1a',
    height: 50,
    width: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reloadButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadButtonText: {
    color: colors.white,
    fontSize: 18,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: colors.white,
    fontSize: 16,
  },
  loadingBox: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fallbackBox: {
    minHeight: 110,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  fallbackTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  helperText: {
    color: colors.gray400,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default TurnstileCaptcha;
