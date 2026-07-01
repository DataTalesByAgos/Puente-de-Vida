import { View, Text, StyleSheet } from 'react-native';
import type { Priority } from '@pdv/shared';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@pdv/shared';

interface Props {
  priority: Priority;
}

export function PriorityBadge({ priority }: Props) {
  const color = PRIORITY_COLORS[priority];
  const label = PRIORITY_LABELS[priority];

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700' },
});
