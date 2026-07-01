import { View, Text, StyleSheet } from 'react-native';
import type { NeedCategory } from '@pdv/shared';
import { CATEGORY_LABELS } from '@pdv/shared';

interface Props {
  category: NeedCategory;
}

export function CategoryBadge({ category }: Props) {
  const label = CATEGORY_LABELS[category];

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#2a2d36',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: { color: '#c8ccd4', fontSize: 11, fontWeight: '500' },
});
