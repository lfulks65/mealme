/**
 * @module types
 *
 * Barrel export for all API request/response type definitions.
 */

// Generic API types
export type {
  PaginatedResponse,
  PaginationParams,
  SortDirection,
  SortOptions,
  ApiResponse,
} from './api';

// Recipe API types
export type {
  ListRecipesRequest,
  ListRecipesResponse,
  GetRecipeResponse,
  CreateRecipeRequest,
  CreateRecipeResponse,
  UpdateRecipeRequest,
  UpdateRecipeResponse,
  DeleteRecipeResponse,
  SearchRecipesRequest,
  SearchRecipesResponse,
  GetRecommendationsRequest,
  GetRecommendationsResponse,
} from './recipe-api';

// Meal plan API types
export type {
  ListMealPlansRequest,
  ListMealPlansResponse,
  GetMealPlanResponse,
  CreateMealPlanRequest,
  CreateMealPlanResponse,
  UpdateMealPlanRequest,
  UpdateMealPlanResponse,
  DeleteMealPlanResponse,
} from './meal-plan-api';

// Shopping list API types
export type {
  ListShoppingListsRequest,
  ListShoppingListsResponse,
  GetShoppingListResponse,
  CreateShoppingListRequest,
  CreateShoppingListResponse,
  UpdateShoppingListRequest,
  UpdateShoppingListResponse,
  DeleteShoppingListResponse,
  ToggleItemRequest,
  ToggleItemResponse,
} from './shopping-list-api';

// Family API types
export type {
  ListFamiliesResponse,
  GetFamilyResponse,
  CreateFamilyRequest,
  CreateFamilyResponse,
  UpdateFamilyRequest,
  UpdateFamilyResponse,
  InviteMemberRequest,
  InviteMemberResponse,
  RemoveMemberRequest,
  RemoveMemberResponse,
} from './family-api';

// Org API types
export type {
  ListOrgsResponse,
  GetOrgResponse,
  CreateOrgRequest,
  CreateOrgResponse,
  InviteOrgMemberRequest,
  InviteOrgMemberResponse,
} from './org-api';

// Preferences API types
export type {
  GetFamilyPreferencesResponse,
  UpdateFamilyPreferencesRequest,
  UpdateFamilyPreferencesResponse,
  GetMemberPreferencesResponse,
  UpdateMemberPreferencesRequest,
  UpdateMemberPreferencesResponse,
  // Backward-compatible aliases
  GetUserPreferencesResponse,
  UpdateUserPreferencesRequest,
  UpdateUserPreferencesResponse,
} from './preferences-api';
