/**
 * HEBStoreSelectScreen — ZIP code → store selector
 *
 * Allows users to enter a ZIP code and select an HEB store
 * for their organization. The selected store is persisted
 * to the org's heb_store_id field.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import type { StoreInfo } from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HEBStoreSelectScreenProps {
  /** Family ID for auth context. */
  familyId: string;
  /** Called when a store is selected. */
  onStoreSelected: (store: StoreInfo) => void;
  /** Called when the user goes back. */
  onBack?: () => void;
  /** Optional pre-fill ZIP code. */
  initialZipCode?: string;
  /** Container style. */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HEBStoreSelectScreen({
  familyId,
  onStoreSelected,
  onBack,
  initialZipCode = '',
  style,
}: HEBStoreSelectScreenProps) {
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // ── Search stores ────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const trimmed = zipCode.trim();
    if (trimmed.length < 5) {
      setError('Please enter a valid 5-digit ZIP code');
      return;
    }

    setLoading(true);
    setError(null);
    setStores([]);

    try {
      // Dynamic import to avoid bundling server code in client
      const { searchStores } = await import('@mealme/api/dist/heb/hebService');
      const results = await searchStores(trimmed, familyId);
      setStores(results);

      if (results.length === 0) {
        setError('No HEB stores found near this ZIP code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search stores');
    } finally {
      setLoading(false);
    }
  }, [zipCode, familyId]);

  // ── Select store ─────────────────────────────────────────────────────────

  const handleSelectStore = useCallback(
    (store: StoreInfo) => {
      setSelectedStoreId(store.id);
      onStoreSelected(store);
    },
    [onStoreSelected],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={[{ flex: 1, backgroundColor: '#ffffff' }, style]}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {onBack && (
          <Pressable onPress={onBack} style={{ marginRight: 12 }}>
            <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '500' } as TextStyle}>
              ← Back
            </Text>
          </Pressable>
        )}
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' } as TextStyle}>
          Select HEB Store
        </Text>
      </View>

      {/* ZIP Code Input */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text
          style={{ fontSize: 15, color: '#6b7280', marginBottom: 8 } as TextStyle}
        >
          Enter your ZIP code to find nearby HEB stores
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="Enter ZIP code"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={5}
            style={{
              flex: 1,
              fontSize: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              backgroundColor: '#f9fafb',
              color: '#111827',
            } as TextStyle}
            onSubmitEditing={handleSearch}
          />
          <Pressable
            onPress={handleSearch}
            disabled={loading || zipCode.trim().length < 5}
            style={{
              marginLeft: 12,
              backgroundColor: zipCode.trim().length >= 5 && !loading ? '#2563eb' : '#d1d5db',
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600' }}>Search</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
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

      {/* Store List */}
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isSelected = selectedStoreId === item.id;
          return (
            <Pressable
              onPress={() => handleSelectStore(item)}
              style={{
                borderWidth: 2,
                borderColor: isSelected ? '#2563eb' : '#e5e7eb',
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isSelected ? '#2563eb' : '#111827',
                      marginBottom: 4,
                    } as TextStyle}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>
                    {item.address.street}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>
                    {item.address.city}, {item.address.state} {item.address.zip}
                  </Text>
                </View>
                {item.distanceMiles !== undefined && (
                  <View
                    style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' } as TextStyle}>
                      {item.distanceMiles.toFixed(1)} mi
                    </Text>
                  </View>
                )}
              </View>
              {isSelected && (
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#2563eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  </View>
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      fontWeight: '500',
                      color: '#2563eb',
                    } as TextStyle}
                  >
                    Selected
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
              <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' } as TextStyle}>
                Enter a ZIP code to find HEB stores near you
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default HEBStoreSelectScreen;
