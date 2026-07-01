import { View, Text, StyleSheet } from 'react-native';
import type { NeedStatus } from '@pdv/shared';
import { NEED_STATUS_LABELS, STATUS_COLORS } from '@pdv/shared';

interface Props {
  status: NeedStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const color = STATUS_COLORS[status];
  const label = NEED_STATUS_LABELS[status];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color, fontSize: isSmall ? 11 : 13 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontWeight: '600' },
});
