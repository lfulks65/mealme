/**
 * ProductCard — animated product card for SynapsisUI
 *
 * Displays a product image, title, subtitle, price, and optional
 * action button with press animation.
 */
import { useCallback } from 'react';
import {
  Pressable,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
  View,
  Text,
  Image,
} from 'react-native';

export interface ProductCardProps {
  /** Product title */
  title: string;
  /** Product subtitle / description */
  subtitle?: string;
  /** Price string (e.g. "$4.99") */
  price: string;
  /** Image URI */
  imageUri?: string;
  /** Badge text (e.g. "Sale") */
  badge?: string;
  /** Press handler */
  onPress?: () => void;
  /** Add-to-cart handler */
  onAddToCart?: () => void;
  /** Container style */
  style?: ViewStyle;
}

export function ProductCard({
  title,
  subtitle,
  price,
  imageUri,
  badge,
  onPress,
  onAddToCart,
  style,
}: ProductCardProps) {
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
          maxWidth: 200,
        },
        style,
      ]}
    >
      {imageUri && (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: imageUri }}
            style={{
              width: '100%',
              height: 140,
              resizeMode: 'cover',
            } as ImageStyle}
          />
          {badge && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: '#2563eb',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                {badge}
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={{ padding: 12 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 15, fontWeight: '600', color: '#111827' } as TextStyle}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            numberOfLines={2}
            style={{ fontSize: 13, color: '#6b7280', marginTop: 2 } as TextStyle}
          >
            {subtitle}
          </Text>
        )}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2563eb' } as TextStyle}>
            {price}
          </Text>
          {onAddToCart && (
            <Pressable
              onPress={onAddToCart}
              style={{
                backgroundColor: '#2563eb',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Add</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default ProductCard;
