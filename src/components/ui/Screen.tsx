import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ScreenProps {
  /** Optional so a screen can render `<Screen />` alone as its loading/empty frame. */
  children?: ReactNode;
  /** Title rendered above the content. Comes from `en` — never a literal (§12). */
  title?: string;
  /** Control shown on the title row, right-aligned (e.g. the calendar Today button). */
  titleAction?: ReactNode;
  /** Wrap content in a vertical ScrollView. Off for screens that scroll their own way. */
  scroll?: boolean;
  /** Pinned below the content, kept clear of the gesture bar. */
  footer?: ReactNode;
  /** Vertical gap between children. */
  gap?: number;
  /** Horizontal padding. Off for full-bleed content such as a horizontal pager. */
  padded?: boolean;
  /** Add the bottom inset to the scroll padding. Off inside the tab bar, which owns it. */
  bottomInset?: boolean;
}

/**
 * §11.6 — the single owner of safe-area insets. Every screen renders through this, so no
 * screen can reintroduce the bug where a title sits under the status bar or a footer button
 * sits under the gesture bar and stops receiving touches.
 */
export function Screen({
  children,
  title,
  titleAction,
  scroll = true,
  footer,
  gap = spacing.lg,
  padded = true,
  bottomInset = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const horizontal = padded ? spacing.lg : 0;

  const header = title ? (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: horizontal,
        paddingBottom: spacing.md,
        gap: spacing.md,
      }}
    >
      <Text style={{ ...typography.title, color: colors.text, flexShrink: 1 }}>{title}</Text>
      {titleAction}
    </View>
  ) : null;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: horizontal,
        paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.xl,
        gap,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: horizontal, gap }}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + spacing.md }}>
      {header}
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            // §11.6 — the gesture bar is occupied space, never something to draw a button into.
            paddingBottom: insets.bottom + spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
