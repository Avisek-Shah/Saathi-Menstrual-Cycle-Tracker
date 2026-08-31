import { Pressable, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../ui/Card';

interface IrregularNoticeCardProps {
  onDismiss: () => void;
}

// §5.6 — neutral wording, no diagnosis, no condition names, no alarm. Copy is fixed by spec.
export function IrregularNoticeCard({ onDismiss }: IrregularNoticeCardProps) {
  return (
    <Card>
      <Text style={{ ...typography.body, color: colors.text }}>{en.irregularNoticeBody}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <Text style={{ ...typography.body, color: colors.primary }}>{en.dismiss}</Text>
        </Pressable>
      </View>
    </Card>
  );
}
