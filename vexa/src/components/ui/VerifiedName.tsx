import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
      <Text style={[styles.nameText, textStyle]} numberOfLines={numberOfLines}>
        {name}
      </Text>
      {isVerified && (
        <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.badge}>
          <Path
            fill={colors.info}
            d="M12 1.6 14.42 3.62 17.53 3.11 18.82 5.98 21.89 6.84 21.75 9.99 24 12 21.75 14.01 21.89 17.16 18.82 18.02 17.53 20.89 14.42 20.38 12 22.4 9.58 20.38 6.47 20.89 5.18 18.02 2.11 17.16 2.25 14.01 0 12 2.25 9.99 2.11 6.84 5.18 5.98 6.47 3.11 9.58 3.62 12 1.6Z"
          />
          <Path
            d="m7.2 12.4 2.7 2.7 6-6"
            stroke={colors.white}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  nameText: {
    flexShrink: 1,
  },
  badge: {
    marginLeft: spacing[1],
    marginTop: 1,
  },
});

export default VerifiedName;
