import { Text, View } from 'react-native';

import { fill } from '../../i18n/en';
import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';
import { Chip } from './Chip';
import { NumberPicker } from './NumberPicker';
import { TextField } from './TextField';

interface NumberAnswerFieldProps {
  value: number | null;
  text: string;
  onChangeText: (next: string) => void;
  errorText: string | null;
  choices: readonly number[];
  pickerMin: number;
  pickerMax: number;
  accessibilityLabel: string;
  /** Shown only when set — the onboarding steps offer it, the Settings rows do not. */
  onDontKnow?: () => void;
  /** Off in Settings, where the picker would be redundant with the chips + field. */
  showPicker?: boolean;
}

/**
 * §6.1 / §6.7 — the "chips + typed field" shape shared by onboarding steps 3–4 and the
 * matching rows in Settings → My cycle, so the two surfaces stay identical in behaviour.
 */
export function NumberAnswerField({
  value,
  text,
  onChangeText,
  errorText,
  choices,
  pickerMin,
  pickerMax,
  accessibilityLabel,
  onDontKnow,
  showPicker = true,
}: NumberAnswerFieldProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text style={{ ...typography.hero, color: colors.primary }}>
          {value !== null ? fill(en.onboardingCycleUnit, { n: value }) : en.numberFieldPlaceholder}
        </Text>
        <View style={{ flex: 1, maxWidth: 100 }}>
          <TextField
            value={text}
            onChangeText={onChangeText}
            keyboardType="number-pad"
            maxLength={2}
            errorText={errorText}
            accessibilityLabel={accessibilityLabel}
          />
        </View>
      </View>

      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}
      >
        {choices.map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={value === n}
            onPress={() => onChangeText(String(n))}
          />
        ))}
      </View>

      {showPicker ? (
        <View style={{ marginTop: spacing.md }}>
          <NumberPicker
            min={pickerMin}
            max={pickerMax}
            value={value ?? pickerMin}
            onChange={(n) => onChangeText(String(n))}
            accessibilityLabel={accessibilityLabel}
          />
        </View>
      ) : null}

      {onDontKnow ? (
        <View style={{ marginTop: spacing.md, alignItems: 'flex-start' }}>
          <Button variant="ghost" label={en.onboardingDontKnow} onPress={onDontKnow} />
        </View>
      ) : null}
    </View>
  );
}
