import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SPECIES = [
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔥',
    tagline: 'A fiery trailblazer',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.2)',
  },
  {
    id: 'sprout',
    name: 'Sprout',
    emoji: '🌱',
    tagline: 'Patient and steady',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.2)',
  },
  {
    id: 'pebble',
    name: 'Pebble',
    emoji: '🪨',
    tagline: 'Grounded and strong',
    color: '#94a3b8',
    glow: 'rgba(148,163,184,0.2)',
  },
  {
    id: 'wisp',
    name: 'Wisp',
    emoji: '✨',
    tagline: 'Curious and bright',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [selected, setSelected] = useState(null);

  const species = SPECIES.find(s => s.id === selected);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f13" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose your companion</Text>
          <Text style={styles.subtitle}>They'll grow as you stay consistent</Text>
        </View>

        <View style={styles.grid}>
          {SPECIES.map(sp => {
            const isSelected = selected === sp.id;
            return (
              <Pressable
                key={sp.id}
                style={[
                  styles.card,
                  isSelected && { borderColor: sp.color, backgroundColor: sp.glow },
                ]}
                onPress={() => setSelected(sp.id)}
              >
                <Text style={styles.cardEmoji}>{sp.emoji}</Text>
                <Text style={[styles.cardName, isSelected && { color: sp.color }]}>
                  {sp.name}
                </Text>
                <Text style={styles.cardTagline}>{sp.tagline}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.beginBtn,
            species && { backgroundColor: species.color },
            !selected && styles.beginBtnDisabled,
          ]}
          disabled={!selected}
          onPress={() => onComplete({ species: selected })}
        >
          <Text style={styles.beginBtnText}>
            {selected ? `Begin with ${species.name}` : 'Pick a companion'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f13' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 32 },

  header: { alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#e8e8f0', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#7a7a9a' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  card: {
    width: '45%',
    backgroundColor: '#1a1a22',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2e2e3e',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  cardEmoji: { fontSize: 44 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#e8e8f0' },
  cardTagline: { fontSize: 12, color: '#7a7a9a', textAlign: 'center' },

  beginBtn: {
    backgroundColor: '#7c6af7',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  beginBtnDisabled: { backgroundColor: '#2e2e3e' },
  beginBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
