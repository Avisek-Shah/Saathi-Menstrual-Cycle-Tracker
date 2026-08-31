import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface TextFieldProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Shown beneath the field. Pass validation copy here — never a blocking dialog (§6.1). */
  errorText?: string | null;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  accessibilityLabel: string;
}

/**
 * §6.1 — the typed half of every "chips + typed field" answer step. Chips fill this field;
 * typing here is read the same way a chip tap is.
 */
export function TextField({
  value,
  onChangeText,
  placeholder,
  errorText,
  keyboardType = 'default',
  maxLength,
  accessibilityLabel,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorText);

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel}
        style={{
          ...typography.cardTitle,
          minHeight: MIN_TOUCH_TARGET,
          color: colors.text,
          borderWidth: hasError ? 2 : 1,
          borderColor: hasError ? colors.warning : focused ? colors.primary : colors.border,
          borderRadius: radius.control,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
        }}
      />
      {hasError ? (
        <Text style={{ ...typography.caption, color: colors.warning, marginTop: spacing.xs }}>
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
