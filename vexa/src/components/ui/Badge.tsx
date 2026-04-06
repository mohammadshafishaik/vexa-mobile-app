import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { JobStatus, ApprovalStatus, PaymentStatus } from '../../types';
import {
  getJobStatusLabel,
  getJobStatusColor,
  getApprovalStatusColor,
} from '../../utils/helpers';

type BadgeVariant = 'filled' | 'outlined' | 'subtle';

interface BadgeProps {
  label: string;
  color?: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  color = colors.gray500,
  variant = 'subtle',
  size = 'sm',
  style,
}) => {
  const bgColor =
    variant === 'filled'
      ? color
      : variant === 'subtle'
      ? `${color}20`
      : 'transparent';

  const textColor = variant === 'filled' ? colors.white : color;
  const borderColor = variant === 'outlined' ? color : 'transparent';

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outlined' ? 1 : 0,
        },
        style,
      ]}
    >
      <Text
        style={[
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// Convenience component for job status badges
export const JobStatusBadge: React.FC<{
  status: JobStatus;
  style?: ViewStyle;
}> = ({ status, style }) => (
  <Badge
    label={getJobStatusLabel(status)}
    color={getJobStatusColor(status)}
    variant="subtle"
    style={style}
  />
);

// Convenience component for approval status badges
export const ApprovalStatusBadge: React.FC<{
  status: ApprovalStatus;
  style?: ViewStyle;
}> = ({ status, style }) => (
  <Badge
    label={status}
    color={getApprovalStatusColor(status)}
    variant="subtle"
    style={style}
  />
);

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  sm: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  md: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
  },
  textSm: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textMd: {
    ...typography.bodySm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default Badge;
