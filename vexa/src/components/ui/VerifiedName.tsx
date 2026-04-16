import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface VerifiedNameProps {
  name: string;
  isVerified?: boolean;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
}

const VerifiedName: React.FC<VerifiedNameProps> = ({
  name,
  isVerified = false,
  textStyle,
  containerStyle,
  numberOfLines,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={textStyle} numberOfLines={numberOfLines}>
        {name}
      </Text>
      {isVerified && (
        <View style={styles.badge}>
          <Check size={10} color={colors.white} strokeWidth={3} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[1],
  },
});

export default VerifiedName;
