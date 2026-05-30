/**
 * HEBProductMatchScreen — Shopping list items with HEB product matches
 *
 * Shows each shopping list item alongside its best HEB product match.
 * Users can:
 *   - See the confidence score for each match
 *   - Swap a match by searching for alternative products
 *   - Adjust quantities before adding to cart
 *   - Add all matched items to the HEB cart
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Image,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import type { ProductMatch, MatchItemsResult, StoreInfo } from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShoppingListItemForMatch {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  hebProductId?: string;
}

export interface HEBProductMatchScreenProps {
  /** Family ID for auth context. */
  familyId: string;
  /** Shopping list ID to match. */
  shoppingListId: string;
  /** Selected HEB store info. */
  store: StoreInfo;
  /** Called when matched items are added to cart. */
  onAddToCart: (matches: ProductMatch[]) => void;
  /** Called when the user goes back. */
  onBack?: () => void;
  /** Container style. */
  style?: ViewStyle;
}

// ─── Confidence Badge ────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let bgColor = '#dcfce7'; // green
  let textColor = '#16a34a';
  let label = 'Great';

  if (confidence < 0.6) {
    bgColor = '#fef2f2';
    textColor = '#dc2626';
    label = 'Low';
  } else if (confidence < 0.8) {
    bgColor = '#fef9c3';
    textColor = '#ca8a04';
    label = 'Good';
  }

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: textColor } as TextStyle}>
        {label} {percentage}%
      </Text>
    </View>
  );
}

// ─── Product Swap Modal ──────────────────────────────────────────────────────

interface SwapModalProps {
  ingredientName: string;
  currentProduct: ProductMatch['product'];
  familyId: string;
  storeId: string;
  onSelect: (product: ProductMatch['product']) => void;
  onClose: () => void;
}

function ProductSwapModal({
  ingredientName,
  currentProduct,
  familyId,
  storeId,
  onSelect,
  onClose,
}: SwapModalProps) {
  const [query, setQuery] = useState(ingredientName);
  const [results, setResults] = useState<ProductMatch['product'][]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { searchProducts } = await import('@mealme/api/dist/heb/hebService');
      const products = await searchProducts(query.trim(), familyId, { storeId });
      setResults(
        products.map((p: { id: string; skuId: string; name: string; brand?: string; imageUrl?: string; price?: { amount: number; formatted: string }; unit?: string; inStock?: boolean }) => ({
          id: p.id,
          skuId: p.skuId,
          name: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          price: p.price,
          unit: p.unit,
          inStock: p.inStock,
        })),
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, familyId, storeId]);

  // Auto-search on mount
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
          padding: 20,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' } as TextStyle}>
            Swap: {ingredientName}
          </Text>
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 16, color: '#6b7280' }}>✕</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search HEB products..."
            placeholderTextColor="#9ca3af"
            style={{
              flex: 1,
              fontSize: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 10,
              backgroundColor: '#f9fafb',
              color: '#111827',
            } as TextStyle}
            onSubmitEditing={handleSearch}
          />
          <Pressable
            onPress={handleSearch}
            style={{
              marginLeft: 8,
              backgroundColor: '#2563eb',
              borderRadius: 10,
              paddingHorizontal: 16,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Search</Text>
          </Pressable>
        </View>

        {/* Current match */}
        <View
          style={{
            borderWidth: 1,
            borderColor: '#2563eb',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            backgroundColor: '#eff6ff',
          }}
        >
          <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '500', marginBottom: 4 } as TextStyle}>
            CURRENT MATCH
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
            {currentProduct.name}
          </Text>
          {currentProduct.brand && (
            <Text style={{ fontSize: 12, color: '#6b7280' } as TextStyle}>{currentProduct.brand}</Text>
          )}
          {currentProduct.price && (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 } as TextStyle}>
              {currentProduct.price.formatted}
            </Text>
          )}
        </View>

        {/* Results */}
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ paddingVertical: 20 }} />
        ) : (
          <ScrollView style={{ maxHeight: 300 }}>
            {results.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => onSelect(product)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                }}
              >
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={{ width: 40, height: 40, borderRadius: 6, marginRight: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      backgroundColor: '#f3f4f6',
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>🛒</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
                    {product.name}
                  </Text>
                  {product.brand && (
                    <Text style={{ fontSize: 12, color: '#6b7280' } as TextStyle}>{product.brand}</Text>
                  )}
                </View>
                {product.price && (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' } as TextStyle}>
                    {product.price.formatted}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Match Item Row ──────────────────────────────────────────────────────────

interface MatchItemRowProps {
  match: ProductMatch;
  quantity: number;
  unit: string;
  onSwap: () => void;
  onQuantityChange: (qty: number) => void;
}

function MatchItemRow({ match, quantity, unit, onSwap, onQuantityChange }: MatchItemRowProps) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Ingredient name */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 } as TextStyle}>
          {match.ingredientName}
        </Text>
        <ConfidenceBadge confidence={match.confidence} />
      </View>

      {/* Matched product */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: 10,
          padding: 10,
        }}
      >
        {match.product.imageUrl ? (
          <Image
            source={{ uri: match.product.imageUrl }}
            style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              backgroundColor: '#e5e7eb',
              marginRight: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>🛒</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
            {match.product.name}
          </Text>
          {match.product.brand && (
            <Text style={{ fontSize: 12, color: '#6b7280' } as TextStyle}>{match.product.brand}</Text>
          )}
          {match.product.price && (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669', marginTop: 2 } as TextStyle}>
              {match.product.price.formatted}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onSwap}
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151' } as TextStyle}>Swap</Text>
        </Pressable>
      </View>

      {/* Quantity controls */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>Quantity</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, color: '#374151' }}>−</Text>
          </Pressable>
          <View
            style={{
              minWidth: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' } as TextStyle}>
              {quantity} {unit}
            </Text>
          </View>
          <Pressable
            onPress={() => onQuantityChange(quantity + 1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#2563eb',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, color: '#ffffff' }}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HEBProductMatchScreen({
  familyId,
  shoppingListId,
  store,
  onAddToCart,
  onBack,
  style,
}: HEBProductMatchScreenProps) {
  const [matchResult, setMatchResult] = useState<MatchItemsResult | null>(null);
  const [matches, setMatches] = useState<ProductMatch[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<ProductMatch | null>(null);

  // ── Match items ──────────────────────────────────────────────────────────

  useEffect(() => {
    const doMatch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { matchItemsToProducts } = await import('@mealme/api/dist/heb/hebService');
        const result = await matchItemsToProducts(shoppingListId, familyId, {
          storeId: store.id,
          zipCode: store.address.zip,
        });
        setMatchResult(result);
        setMatches(result.matches);

        // Initialize quantities from shopping list items
        const initialQtys: Record<string, number> = {};
        result.matches.forEach((m) => {
          initialQtys[m.shoppingListItemId] = 1;
        });
        setQuantities(initialQtys);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to match items');
      } finally {
        setLoading(false);
      }
    };
    doMatch();
  }, [shoppingListId, familyId, store]);

  // ── Swap handler ────────────────────────────────────────────────────────

  const handleSwap = useCallback(
    (oldMatch: ProductMatch, newProduct: ProductMatch['product']) => {
      setMatches((prev) =>
        prev.map((m: ProductMatch) =>
          m.shoppingListItemId === oldMatch.shoppingListItemId
            ? { ...m, product: newProduct, confidence: 1.0 }
            : m,
        ),
      );
      setSwapTarget(null);
    },
    [],
  );

  // ── Quantity handler ────────────────────────────────────────────────────

  const handleQuantityChange = useCallback((itemId: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: qty }));
  }, []);

  // ── Add to cart ──────────────────────────────────────────────────────────

  const handleAddToCart = useCallback(() => {
    onAddToCart(matches);
  }, [matches, onAddToCart]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }, style]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16 } as TextStyle}>
          Matching your items to HEB products...
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: '#f9fafb' }, style]}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onBack && (
            <Pressable onPress={onBack} style={{ marginRight: 12 }}>
              <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '500' } as TextStyle}>
                ← Back
              </Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' } as TextStyle}>
              Match Products
            </Text>
            {matchResult && (
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 } as TextStyle}>
                {matchResult.matchedCount} of {matchResult.totalItems} items matched
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderWidth: 1,
              borderColor: '#fecaca',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          </View>
        </View>
      )}

      {/* Matched Items */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.shoppingListItemId}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <MatchItemRow
            match={item}
            quantity={quantities[item.shoppingListItemId] ?? 1}
            unit={item.product.unit ?? 'ea'}
            onSwap={() => setSwapTarget(item)}
            onQuantityChange={(qty) => handleQuantityChange(item.shoppingListItemId, qty)}
          />
        )}
        ListHeaderComponent={
          matchResult && matchResult.unmatched.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 8 } as TextStyle}>
                ⚠️ {matchResult.unmatched.length} items could not be matched
              </Text>
              {matchResult.unmatched.map((u: { shoppingListItemId: string; ingredientName: string; reason: string }) => (
                <View
                  key={u.shoppingListItemId}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>{u.ingredientName}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af', flex: 1, textAlign: 'right' } as TextStyle}>
                    {u.reason}
                  </Text>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {/* Add to Cart Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        }}
      >
        <Pressable
          onPress={handleAddToCart}
          disabled={matches.length === 0}
          style={{
            backgroundColor: matches.length > 0 ? '#2563eb' : '#d1d5db',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
            Add {matches.length} Item{matches.length !== 1 ? 's' : ''} to Cart
          </Text>
        </Pressable>
      </View>

      {/* Swap Modal */}
      {swapTarget && (
        <ProductSwapModal
          ingredientName={swapTarget.ingredientName}
          currentProduct={swapTarget.product}
          familyId={familyId}
          storeId={store.id}
          onSelect={(product) => handleSwap(swapTarget, product)}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </View>
  );
}

export default HEBProductMatchScreen;
