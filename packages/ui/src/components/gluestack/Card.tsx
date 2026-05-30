/**
 * Card — composite component built from gluestack-ui Box primitives
 *
 * gluestack-ui doesn't have a dedicated Card component, so we
 * compose one from Box with NativeWind styling.
 */
import React from 'react';
import { Box } from '@gluestack-ui/themed';
import type { ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** Variant style */
  variant?: 'elevated' | 'outlined' | 'filled';
  /** Padding size */
  p?: '$0' | '$1' | '$2' | '$3' | '$4' | '$5' | '$6';
}

const variantStyles: Record<string, object> = {
  elevated: {
    shadow: 2,
    bg: '$backgroundLight50',
    borderWidth: 0,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '$borderLight300',
    bg: '$backgroundLight0',
    shadow: 0,
  },
  filled: {
    bg: '$backgroundLight50',
    borderWidth: 0,
    shadow: 0,
  },
};

export function Card({
  children,
  variant = 'elevated',
  p = '$4',
  ...rest
}: CardProps) {
  return (
    <Box
      p={p}
      borderRadius="$lg"
      {...variantStyles[variant]}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default Card;
