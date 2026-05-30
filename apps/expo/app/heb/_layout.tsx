/**
 * HEB route group layout.
 *
 * Groups all HEB grocery screens under the /heb/ prefix.
 */

import { Stack } from 'expo-router';

export default function HEBLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
