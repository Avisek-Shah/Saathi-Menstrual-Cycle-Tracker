import { Text, View } from 'react-native';

import { flowLabel, symptomLabel } from '../../core/enums';
import type { QuickLogOption } from '../../core/quickLog';
import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Chip } from '../ui/Chip';

interface QuickLogProps {
  options: QuickLogOption[];
  onToggle: (option: QuickLogOption) => void;
}

function optionLabel(option: QuickLogOption): string {
  return option.kind === 'flow' ? flowLabel(option.flow) : symptomLabel(option.symptom);
}

/**
 * §6.2 quick-log row — at most five one-tap chips that write immediately without opening the
 * log modal. Empty when there is nothing to offer (not on a period, no recent symptoms).
 */
export function QuickLog({ options, onToggle }: QuickLogProps) {
  if (options.length === 0) return null;

  return (
    <View>
      <Text style={{ ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs }}>
        {en.homeQuickLogLabel}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => (
          <Chip
            key={option.kind === 'flow' ? 'flow' : option.symptom}
            label={optionLabel(option)}
            selected={option.selected}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
    </View>
  );
}
