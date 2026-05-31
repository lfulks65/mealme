import { useState, useEffect } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Box } from '@gluestack-ui/themed';
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlErrorText,
} from '@gluestack-ui/themed';
import { Input, InputField, InputSlot, InputIcon } from '@gluestack-ui/themed';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { EyeIcon, EyeOffIcon } from '@gluestack-ui/themed';
import { supabase } from '@mealme/api';

/**
 * Reset Password screen — users land here after clicking the password
 * reset deep link. The URL contains an access_token (and optionally
 * refresh_token) that Supabase embeds in the redirect URL.
 *
 * We use `supabase.auth.updateUser({ password })` to set the new
 * password once the user submits the form.
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // When Supabase redirects via deep link, the tokens arrive as URL
  // params. We set the session first so updateUser has a valid session.
  const accessToken = (params.access_token as string) ?? '';
  const refreshToken = (params.refresh_token as string) ?? '';

  useEffect(() => {
    async function establishSession() {
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setSessionError(error.message ?? 'Failed to establish session from reset link.');
        }
      }
    }
    establishSession();
  }, [accessToken, refreshToken]);

  const validate = (): boolean => {
    let valid = true;
    setPasswordError('');
    setConfirmPasswordError('');

    if (!newPassword) {
      setPasswordError('New password is required');
      valid = false;
    } else if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setGeneralError(error.message ?? 'Failed to update password. Please try again.');
        return;
      }

      setIsSuccess(true);
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToLogin = () => {
    router.replace('/(auth)/login');
  };

  // Session error state — the deep link tokens were invalid or missing
  if (sessionError) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="xl" style={styles.formContainer}>
            <VStack space="xs" style={styles.header}>
              <Text size="2xl" fontWeight="$bold" color="$textLight900">
                Invalid Link
              </Text>
              <Text size="sm" color="$textLight500">
                {sessionError}
              </Text>
            </VStack>

            <Button
              size="lg"
              variant="solid"
              action="primary"
              onPress={navigateToLogin}
              style={styles.primaryButton}
            >
              <ButtonText size="md" fontWeight="$semibold">
                Back to Login
              </ButtonText>
            </Button>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="xl" style={styles.formContainer}>
            <VStack space="xs" style={styles.header}>
              <Text size="2xl" fontWeight="$bold" color="$textLight900">
                Password Updated
              </Text>
              <Text size="sm" color="$textLight500">
                Your password has been successfully reset. You can now sign in with your new
                password.
              </Text>
            </VStack>

            <Box
              bg="$success50"
              px="$4"
              py="$3"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$success500"
            >
              <Text size="sm" color="$success600">
                Password reset successful!
              </Text>
            </Box>

            <Button
              size="lg"
              variant="solid"
              action="primary"
              onPress={navigateToLogin}
              style={styles.primaryButton}
            >
              <ButtonText size="md" fontWeight="$semibold">
                Sign In
              </ButtonText>
            </Button>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Form state
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <VStack space="xl" style={styles.formContainer}>
          {/* Header */}
          <VStack space="xs" style={styles.header}>
            <Text size="2xl" fontWeight="$bold" color="$textLight900">
              Set New Password
            </Text>
            <Text size="sm" color="$textLight500">
              Enter your new password below to complete the password reset.
            </Text>
          </VStack>

          {/* Error Banner */}
          {generalError && (
            <Box
              bg="$error50"
              px="$4"
              py="$3"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$error500"
            >
              <Text size="sm" color="$error600">
                {generalError}
              </Text>
            </Box>
          )}

          {/* New Password Field */}
          <FormControl isInvalid={!!passwordError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                New Password
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Enter your new password"
                value={newPassword}
                onChangeText={(text: string) => {
                  setNewPassword(text);
                  setPasswordError('');
                  setGeneralError(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isSubmitting}
                aria-label="New Password"
              />
              <InputSlot pr="$3" onPress={() => setShowPassword(!showPassword)}>
                <InputIcon as={showPassword ? EyeOffIcon : EyeIcon} color="$textLight400" />
              </InputSlot>
            </Input>
            {passwordError && (
              <FormControlError>
                <FormControlErrorText>{passwordError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Confirm New Password Field */}
          <FormControl isInvalid={!!confirmPasswordError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Confirm New Password
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChangeText={(text: string) => {
                  setConfirmPassword(text);
                  setConfirmPasswordError('');
                  setGeneralError(null);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isSubmitting}
                aria-label="Confirm New Password"
              />
              <InputSlot pr="$3" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <InputIcon as={showConfirmPassword ? EyeOffIcon : EyeIcon} color="$textLight400" />
              </InputSlot>
            </Input>
            {confirmPasswordError && (
              <FormControlError>
                <FormControlErrorText>{confirmPasswordError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Reset Password Button */}
          <Button
            size="lg"
            variant="solid"
            action="primary"
            onPress={handleResetPassword}
            isDisabled={isSubmitting}
            style={styles.primaryButton}
          >
            {isSubmitting && <ButtonSpinner mr="$2" />}
            <ButtonText size="md" fontWeight="$semibold">
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </ButtonText>
          </Button>

          {/* Back to Login Link */}
          <HStack justifyContent="center" space="xs" mt="$4">
            <Text size="sm" color="$textLight500">
              Remember your password?
            </Text>
            <Button variant="link" size="sm" onPress={navigateToLogin}>
              <ButtonText size="sm" color="$primary500" fontWeight="$semibold">
                Sign In
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  formContainer: {
    alignSelf: 'center',
    maxWidth: 400,
    width: '100%',
  },
  header: {
    marginBottom: 8,
  },
  primaryButton: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
