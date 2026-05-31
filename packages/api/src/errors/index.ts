/**
 * @module errors
 *
 * Barrel export for the MealMe API error system.
 */

// Error classes
export {
  ApiError,
  AuthError,
  ValidationError,
  NotFoundError,
  NetworkError,
  ServerError,
  TenantError,
} from './api-error';

// Type guard
export { isApiError } from './api-error';

// Supabase error interface (for consumers who need the shape)
export type { SupabaseError } from './api-error';

// Handler utilities
export {
  handleSupabaseError,
  wrapApiCall,
  getErrorMessage,
} from './handlers';
