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

const CUISINE_OPTIONS = ['Mediterranean', 'Italian', 'Thai', 'Japanese', 'Mexican', 'American', 'Indian', 'Korean'];
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
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
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
      f.max_cook_minutes = selectedTime;
    }
    if (selectedCalories !== null) f.max_calories = selectedCalories;
    return f;
  }, [selectedCuisine, selectedDietary, selectedTime, selectedCalories]);

  // Run search when query or filters change
  useEffect(() => {
    const f = buildFilters();
    setFilters(f);
    search(query || undefined, Object.keys(f).length > 0 ? f : undefined);
  }, [query, selectedCuisine, selectedDietary, selectedTime, selectedCalories, buildFilters, search]);

  // Toggle dietary chip
  const toggleDietary = useCallback((diet: string) => {
    setSelectedDietary((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
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
    [query, search]
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
                onPress={() => setSelectedCalories(selectedCalories === item.value ? null : item.value)}
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
          <Pressable onPress={() => search(query || undefined, Object.keys(filters).length > 0 ? filters : undefined)}>
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
                onRefresh={() => search(query || undefined, Object.keys(filters).length > 0 ? filters : undefined)}
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
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    color: '#1A1A1A',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333333',
  },
  chipsSection: {
    marginBottom: 6,
  },
  chipsSectionFlex: {
    flex: 1,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsList: {
    paddingHorizontal: 12,
    gap: 6,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipText: {
    fontSize: 13,
    color: '#333333',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#CC0000',
    marginBottom: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
    color: '#999999',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resultsList: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 4,
  },
});
