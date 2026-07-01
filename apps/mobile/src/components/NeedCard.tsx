import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Need } from '@pdv/shared';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { CategoryBadge } from './CategoryBadge';

interface Props {
  need: Need;
  onPress?: (need: Need) => void;
}

export function NeedCard({ need, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(need)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {need.title}
        </Text>
        <View style={styles.badges}>
          <StatusBadge status={need.status} size="sm" />
        </View>
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {need.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.tags}>
          <CategoryBadge category={need.category} />
          <PriorityBadge priority={need.priority} />
        </View>
        {need.location_text && (
          <Text style={styles.location} numberOfLines={1}>
            📍 {need.location_text}
          </Text>
        )}
      </View>

      {need.scope === 'macro' && (
        <View style={styles.scopeTag}>
          <Text style={styles.scopeText}>Macro</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1a1d26', borderRadius: 12, padding: 16, marginBottom: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#ffffff', flex: 1, marginRight: 8 },
  badges: { flexShrink: 0 },
  description: { fontSize: 14, color: '#c8ccd4', lineHeight: 20, marginBottom: 10 },
  footer: { gap: 6 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  location: { fontSize: 12, color: '#5d6675' },
  scopeTag: { position: 'absolute', top: 12, right: 12 },
  scopeText: {
    fontSize: 10,
    color: '#6fcaef',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
