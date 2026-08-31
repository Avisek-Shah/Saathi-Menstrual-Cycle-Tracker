import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  addMonth,
  currentBsMonth,
  currentBsYear,
  formatDate,
  getMonthGrid,
  type CalendarSystem,
} from '../../core/calendar';
import { en } from '../../i18n/en';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface DatePickerGridProps {
  system: CalendarSystem;
  today: string;
  /** Currently chosen date, if any. */
  value: string | null;
  onSelect: (iso: string) => void;
  /** A date is offered only when this returns true (§6.1 — future / > 90 days ago excluded). */
  isSelectable: (iso: string) => boolean;
}

const WEEKHEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The (year, month) containing `iso`, in the given system. */
function monthOf(iso: string, system: CalendarSystem): { year: number; month: number } {
  if (system === 'BS') return { year: currentBsYear(iso), month: currentBsMonth(iso) };
  const d = new Date(iso + 'T12:00:00');
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * §6.1 step 2 — in-app month grid for the last-period date, built on the same `getMonthGrid`
 * the calendar tab uses (§6.3), so BS re-grids correctly here too. No native picker dependency
 * (§2 — M10 adds none).
 */
export function DatePickerGrid({ system, today, value, onSelect, isSelectable }: DatePickerGridProps) {
  const [cursor, setCursor] = useState(() => monthOf(value ?? today, system));

  const grid = getMonthGrid(cursor.year, cursor.month, system, today);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xs,
          paddingBottom: spacing.xs,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en.calendarPrevMonth}
          hitSlop={8}
          onPress={() => setCursor(addMonth(cursor.year, cursor.month, -1))}
          style={{
            minWidth: MIN_TOUCH_TARGET,
            minHeight: MIN_TOUCH_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.body, color: colors.text }}>{en.calendarPrevGlyph}</Text>
        </Pressable>
        <Text style={{ ...typography.cardTitle, color: colors.text }}>{grid.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en.calendarNextMonth}
          hitSlop={8}
          onPress={() => setCursor(addMonth(cursor.year, cursor.month, 1))}
          style={{
            minWidth: MIN_TOUCH_TARGET,
            minHeight: MIN_TOUCH_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.body, color: colors.text }}>{en.calendarNextGlyph}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {WEEKHEAD.map((l, idx) => (
          <Text
            key={l + idx}
            style={{ ...typography.caption, color: colors.textMuted, width: 36, textAlign: 'center' }}
          >
            {l}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {grid.cells.map((cell) => {
          const selectable = !cell.fill && isSelectable(cell.iso);
          const selected = cell.iso === value;
          const isToday = cell.iso === today;
          return (
            <Pressable
              key={cell.iso}
              disabled={!selectable}
              onPress={() => onSelect(cell.iso)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !selectable }}
              accessibilityLabel={formatDate(cell.iso, system)}
              style={{
                width: 36,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: cell.fill || !selectable ? 0.3 : 1,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.primary : 'transparent',
                  borderWidth: isToday && !selected ? 1.5 : 0,
                  borderColor: colors.text,
                }}
              >
                <Text style={{ ...typography.caption, color: selected ? colors.surface : colors.text }}>
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
