import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'consistency_habits';

const colors = {
  bg: '#0f0f13',
  surface: '#1a1a22',
  border: '#2e2e3e',
  borderDone: 'rgba(42,157,92,0.35)',
  text: '#e8e8f0',
  muted: '#7a7a9a',
  accent: '#7c6af7',
  accentPress: '#9180ff',
  done: '#2a9d5c',
  doneBg: 'rgba(42,157,92,0.18)',
  doneBorder: 'rgba(42,157,92,0.3)',
  danger: '#e05252',
  dangerBg: 'rgba(224,82,82,0.12)',
  streak: '#ff8c42',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function calcStreak(completions) {
  if (!completions.length) return 0;
  const sorted = [...completions].sort();
  const todayStr = today();
  const last = sorted[sorted.length - 1];
  if (last !== todayStr) {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (last !== yesterday) return 0;
  }
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const cur = new Date(sorted[i]);
    const prev = new Date(sorted[i - 1]);
    if ((cur - prev) / 864e5 === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function isDoneToday(completions) {
  return completions.includes(today());
}

function HabitCard({ habit, onMarkDone, onDelete }) {
  const done = isDoneToday(habit.completions);
  const streak = calcStreak(habit.completions);
  const scale = useRef(new Animated.Value(1)).current;

  function handleDone() {
    if (done) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onMarkDone(habit.id);
  }

  return (
    <Animated.View style={[styles.card, done && styles.cardDone, { transform: [{ scale }] }]}>
      <View style={styles.cardTop}>
        <Text style={styles.habitName}>{habit.name}</Text>
        <Pressable
          onPress={() => onDelete(habit.id)}
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
          hitSlop={8}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={[styles.statValue, styles.statStreak]}>🔥 {streak}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>BEST</Text>
          <Text style={styles.statValue}>⭐ {habit.bestStreak || 0}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleDone}
        disabled={done}
        style={({ pressed }) => [
          styles.doneBtn,
          done ? styles.doneBtnCompleted : styles.doneBtnPending,
          !done && pressed && styles.doneBtnPressed,
        ]}
      >
        <Text style={[styles.doneBtnText, done && styles.doneBtnTextCompleted]}>
          {done ? '✓  Done for today' : 'Mark done for today'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setHabits(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits, loaded]);

  function addHabit() {
    const name = input.trim();
    if (!name) return;
    setHabits(prev => [
      ...prev,
      {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        createdAt: today(),
        completions: [],
        bestStreak: 0,
      },
    ]);
    setInput('');
  }

  function markDone(id) {
    setHabits(prev =>
      prev.map(h => {
        if (h.id !== id) return h;
        const completions = [...h.completions, today()];
        const streak = calcStreak(completions);
        return {
          ...h,
          completions,
          bestStreak: Math.max(h.bestStreak || 0, streak),
        };
      })
    );
  }

  function deleteHabit(id) {
    setHabits(prev => prev.filter(h => h.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Consistent</Text>
            <Text style={styles.subtitle}>Build habits. Protect your streak.</Text>
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Add a new habit…"
              placeholderTextColor={colors.muted}
              onSubmitEditing={addHabit}
              returnKeyType="done"
              maxLength={80}
            />
            <Pressable
              onPress={addHabit}
              style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {loaded && habits.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyText}>No habits yet. Add one above to get started.</Text>
            </View>
          )}

          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onMarkDone={markDone}
              onDelete={deleteHabit}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 60 },

  header: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#a78bfa',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: { fontSize: 14, color: colors.muted },

  addRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  addBtnPressed: { backgroundColor: colors.accentPress },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    gap: 14,
  },
  cardDone: { borderColor: colors.borderDone },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  habitName: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },

  deleteBtn: { padding: 4, borderRadius: 6 },
  deleteBtnPressed: { backgroundColor: colors.dangerBg },
  deleteBtnText: { color: colors.muted, fontSize: 16 },

  stats: { flexDirection: 'row', gap: 24 },
  stat: { gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statStreak: { color: colors.streak },

  doneBtn: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  doneBtnPending: { backgroundColor: colors.accent },
  doneBtnPressed: { backgroundColor: colors.accentPress },
  doneBtnCompleted: { backgroundColor: colors.doneBg, borderColor: colors.doneBorder },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
  doneBtnTextCompleted: { color: colors.done },
});
