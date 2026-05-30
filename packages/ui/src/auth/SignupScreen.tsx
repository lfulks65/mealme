import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { FormControl, FormControlLabel, FormControlError, FormControlErrorText } from '@gluestack-ui/themed';
import { Input, InputField } from '@gluestack-ui/themed';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import { VStack } from '@gluestack-ui/themed';
import { HStack } from '@gluestack-ui/themed';
import { Divider } from '@gluestack-ui/themed';
import { useAuth } from './AuthContext';

export interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onSignupSuccess?: () => void;
}

export function SignupScreen({
  onNavigateToLogin,
  onSignupSuccess,
}: SignupScreenProps) {
  const { signUp, signInWithGoogle, signInWithApple, isLoading, error, resetPasswordState } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      valid = false;
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }

    return valid;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    try {
      await signUp(name.trim(), email.trim(), password);
      onSignupSuccess?.();
    } catch {
      // Error is set in context
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onSignupSuccess?.();
    } catch {
      // Error is set in context
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      onSignupSuccess?.();
    } catch {
      // Error is set in context
    }
  };

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
          {/* Header */}
          <VStack space="xs" style={styles.header}>
            <Text size="2xl" fontWeight="$bold" color="$textLight900">
              Create Account
            </Text>
            <Text size="sm" color="$textLight500">
              Sign up to start planning your meals
            </Text>
          </VStack>

          {/* Error Banner */}
          {error && (
            <Box
              bg="$error50"
              px="$4"
              py="$3"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$error500"
            >
              <Text size="sm" color="$error600">
                {error}
              </Text>
            </Box>
          )}

          {/* Name Field */}
          <FormControl isInvalid={!!nameError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Full Name
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Enter your name"
                value={name}
                onChangeText={(text: string) => {
                  setName(text);
                  setNameError('');
                  resetPasswordState();
                }}
                autoCapitalize="words"
                editable={!isLoading}
                aria-label="Full Name"
              />
            </Input>
            {nameError && (
              <FormControlError>
                <FormControlErrorText>{nameError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Email Field */}
          <FormControl isInvalid={!!emailError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Email
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Enter your email"
                value={email}
                onChangeText={(text: string) => {
                  setEmail(text);
                  setEmailError('');
                  resetPasswordState();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                aria-label="Email"
              />
            </Input>
            {emailError && (
              <FormControlError>
                <FormControlErrorText>{emailError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Password Field */}
          <FormControl isInvalid={!!passwordError}>
            <FormControlLabel>
              <Text size="sm" fontWeight="$medium" color="$textLight900">
                Password
              </Text>
            </FormControlLabel>
            <Input variant="outline" size="md">
              <InputField
                placeholder="Create a password"
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  setPasswordError('');
                  resetPasswordState();
                }}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
                aria-label="Password"
              />
            </Input>
            {passwordError && (
              <FormControlError>
                <FormControlErrorText>{passwordError}</FormControlErrorText>
              </FormControlError>
            )}
          </FormControl>

          {/* Sign Up Button */}
          <Button
            size="lg"
            variant="solid"
            action="primary"
            onPress={handleSignUp}
            isDisabled={isLoading}
            style={styles.primaryButton}
          >
            {isLoading && <ButtonSpinner mr="$2" />}
            <ButtonText size="md" fontWeight="$semibold">
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </ButtonText>
          </Button>

          {/* Divider */}
          <HStack space="sm" alignItems="center">
            <Divider flex={1} />
            <Text size="sm" color="$textLight400">
              or
            </Text>
            <Divider flex={1} />
          </HStack>

          {/* Social Buttons */}
          <VStack space="md">
            <Button
              size="lg"
              variant="outline"
              onPress={handleGoogleSignIn}
              isDisabled={isLoading}
              style={styles.socialButton}
            >
              <ButtonText size="md" color="$textLight900">
                Continue with Google
              </ButtonText>
            </Button>

            {Platform.OS === 'ios' && (
              <Button
                size="lg"
                variant="outline"
                onPress={handleAppleSignIn}
                isDisabled={isLoading}
                style={styles.socialButton}
              >
                <ButtonText size="md" color="$textLight900">
                  Continue with Apple
                </ButtonText>
              </Button>
            )}
          </VStack>

          {/* Login Link */}
          <HStack justifyContent="center" space="xs" mt="$4">
            <Text size="sm" color="$textLight500">
              Already have an account?
            </Text>
            <Button variant="link" size="sm" onPress={onNavigateToLogin}>
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
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formContainer: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  primaryButton: {
    width: '100%',
  },
  socialButton: {
    width: '100%',
  },
});
