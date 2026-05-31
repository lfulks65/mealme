import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type { RecipeSearchFilters, RecipeFull } from '@mealme/shared';
import { ProductCard } from '../synapsis/ProductCard';
import { useRecipeSearch } from '../hooks/useRecipeApi';
import { RecipeFilterModal } from './RecipeFilterModal';

// ── Filter Chip Options ───────────────────────────────────────────────────────

const CUISINE_OPTIONS = [
  'Mediterranean',
  'Italian',
  'Thai',
  'Japanese',
  'Mexican',
  'American',
  'Indian',
  'Korean',
];
const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'];
const TIME_OPTIONS = [
  { label: '≤ 15 min', value: 15 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 60 min', value: 60 },
];
const CALORIE_OPTIONS = [
  { label: '≤ 300 cal', value: 300 },
  { label: '≤ 500 cal', value: 500 },
  { label: '≤ 700 cal', value: 700 },
];

// ── FilterChip ────────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
);

// ── RecipeSearchScreen ────────────────────────────────────────────────────────

export interface RecipeSearchScreenProps {
  /** Navigate to recipe detail */
  onRecipePress?: (recipeId: string) => void;
  /** Navigate back */
  onBack?: () => void;
}

export const RecipeSearchScreen: React.FC<RecipeSearchScreenProps> = ({
  onRecipePress,
  onBack,
}) => {
  const { results, loading, error, search } = useRecipeSearch();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<RecipeSearchFilters>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Active chip selections for quick filters
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedCalories, setSelectedCalories] = useState<number | null>(null);

  // Build filters from chip selections
  const buildFilters = useCallback((): RecipeSearchFilters => {
    const f: RecipeSearchFilters = {};
    if (selectedCuisine) f.cuisine = selectedCuisine;
    if (selectedDietary.length > 0) f.dietary_restrictions = selectedDietary;
    if (selectedTime !== null) {
      f.max_prep_minutes = selectedTime;
      f.max_total_minutes = selectedTime;
    }
    if (selectedCalories !== null) f.max_calories = selectedCalories;
    return f;
  }, [selectedCuisine, selectedDietary, selectedTime, selectedCalories]);

  // Run search when query or filters change
  useEffect(() => {
    const f = buildFilters();
    setFilters(f);
    search(query || undefined, Object.keys(f).length > 0 ? f : undefined);
  }, [
    query,
    selectedCuisine,
    selectedDietary,
    selectedTime,
    selectedCalories,
    buildFilters,
    search,
  ]);

  // Toggle dietary chip
  const toggleDietary = useCallback((diet: string) => {
    setSelectedDietary((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet],
    );
  }, []);

  // Apply advanced filters from modal
  const handleApplyFilters = useCallback(
    (modalFilters: RecipeSearchFilters) => {
      setFilters(modalFilters);
      // Sync chip state from modal filters
      if (modalFilters.cuisine) setSelectedCuisine(modalFilters.cuisine);
      if (modalFilters.dietary_restrictions) setSelectedDietary(modalFilters.dietary_restrictions);
      if (modalFilters.max_prep_minutes) setSelectedTime(modalFilters.max_prep_minutes);
      if (modalFilters.max_calories) setSelectedCalories(modalFilters.max_calories);
      search(query || undefined, modalFilters);
    },
    [query, search],
  );

  const renderRecipeCard = ({ item }: { item: RecipeFull }) => {
    const totalTime = (item.prep_minutes ?? 0) + (item.cook_minutes ?? 0);
    const badge = item.tags.find((t) => t.tag === 'quick')?.tag;
    return (
      <ProductCard
        id={item.id}
        title={item.title}
        subtitle={item.cuisine ?? undefined}
        imageUrl={item.image_url}
        badge={badge ? 'Quick' : undefined}
        metadata={`${totalTime} min · ${item.calories ?? '—'} cal`}
        onPress={() => onRecipePress?.(item.id)}
      />
    );
  };

  const hasActiveFilters =
    selectedCuisine !== null ||
    selectedDietary.length > 0 ||
    selectedTime !== null ||
    selectedCalories !== null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Discover Recipes</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes, cuisines, ingredients..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search recipes"
        />
        <Pressable
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Text style={styles.filterButtonText}>⚙️ Filters{hasActiveFilters ? ' ●' : ''}</Text>
        </Pressable>
      </View>

      {/* Filter Chips: Cuisine */}
      <View style={styles.chipsSection}>
        <Text style={styles.chipsLabel}>Cuisine</Text>
        <FlatList
          data={CUISINE_OPTIONS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <FilterChip
              label={item}
              selected={selectedCuisine === item}
              onPress={() => setSelectedCuisine(selectedCuisine === item ? null : item)}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
        />
      </View>

      {/* Filter Chips: Dietary */}
      <View style={styles.chipsSection}>
        <Text style={styles.chipsLabel}>Dietary</Text>
        <FlatList
          data={DIETARY_OPTIONS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <FilterChip
              label={item}
              selected={selectedDietary.includes(item)}
              onPress={() => toggleDietary(item)}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
        />
      </View>

      {/* Filter Chips: Time & Calories */}
      <View style={styles.chipsRow}>
        <View style={styles.chipsSectionFlex}>
          <Text style={styles.chipsLabel}>Time</Text>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => (
              <FilterChip
                label={item.label}
                selected={selectedTime === item.value}
                onPress={() => setSelectedTime(selectedTime === item.value ? null : item.value)}
              />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsList}
          />
        </View>
        <View style={styles.chipsSectionFlex}>
          <Text style={styles.chipsLabel}>Calories</Text>
          <FlatList
            data={CALORIE_OPTIONS}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => (
              <FilterChip
                label={item.label}
                selected={selectedCalories === item.value}
                onPress={() =>
                  setSelectedCalories(selectedCalories === item.value ? null : item.value)
                }
              />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsList}
          />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Searching recipes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable
            onPress={() =>
              search(query || undefined, Object.keys(filters).length > 0 ? filters : undefined)
            }
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>
            {results.total} recipe{results.total !== 1 ? 's' : ''} found
          </Text>
          <FlatList
            data={results.recipes}
            keyExtractor={(item) => item.id}
            renderItem={renderRecipeCard}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recipes found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() =>
                  search(query || undefined, Object.keys(filters).length > 0 ? filters : undefined)
                }
                tintColor="#FF6B35"
              />
            }
          />
        </>
      )}

      {/* Filter Modal */}
      <RecipeFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipText: {
    color: '#333333',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipsLabel: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  chipsList: {
    gap: 6,
    paddingHorizontal: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipsSection: {
    marginBottom: 6,
  },
  chipsSectionFlex: {
    flex: 1,
    marginBottom: 6,
  },
  container: {
    backgroundColor: '#FAFAFA',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptySubtext: {
    color: '#BBBBBB',
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterButtonText: {
    color: '#333333',
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
  resultCount: {
    color: '#999999',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resultsList: {
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  retryText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    justifyContent: 'space-between',
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 10,
    borderWidth: 1,
    color: '#1A1A1A',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
