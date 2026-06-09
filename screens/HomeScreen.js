import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const SPECIES_CONFIG = {
  ember: { emoji: '🔥', name: 'Ember', color: '#f97316', glow: 'rgba(249,115,22,0.15)' },
  sprout: { emoji: '🌱', name: 'Sprout', color: '#22c55e', glow: 'rgba(34,197,94,0.15)' },
  pebble: { emoji: '🪨', name: 'Pebble', color: '#94a3b8', glow: 'rgba(148,163,184,0.15)' },
  wisp: { emoji: '✨', name: 'Wisp', color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CIRCLE_GAP = 14;
const CIRCLE_H_PADDING = 24;
const CIRCLE_SIZE = Math.floor((SCREEN_WIDTH - CIRCLE_H_PADDING * 2 - CIRCLE_GAP) / 2);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isDoneToday(completions) {
  return completions.includes(today());
}

function getMood(habits) {
  if (!habits.length) return { text: 'Add a habit to get started', icon: '💤' };
  const done = habits.filter(h => isDoneToday(h.completions)).length;
  const ratio = done / habits.length;
  if (ratio === 1) return { text: 'Thriving! All done today 🌟', icon: '🌟' };
  if (ratio >= 0.5) return { text: `${done} of ${habits.length} done — keep going!`, icon: '😊' };
  if (ratio > 0) return { text: `${done} of ${habits.length} done so far`, icon: '🙂' };
  return { text: 'Ready when you are…', icon: '😴' };
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
    if ((cur - prev) / 864e5 === 1) streak++;
    else break;
  }
  return streak;
}

function HabitCircle({ habit, speciesColor, onPress, onLongPress }) {
  const done = isDoneToday(habit.completions);
  const streak = calcStreak(habit.completions);
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (done) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress(habit.id);
  }

  return (
    <Pressable onPress={handlePress} onLongPress={() => onLongPress(habit.id)}>
      <Animated.View
        style={[
          styles.circle,
          done
            ? { backgroundColor: speciesColor, borderColor: speciesColor }
            : { backgroundColor: '#1a1a22', borderColor: '#2e2e3e' },
          { transform: [{ scale }] },
        ]}
      >
        {streak > 0 && (
          <Text style={styles.circleStreak}>🔥{streak}</Text>
        )}
        <Text
          style={[styles.circleName, done && styles.circleNameDone]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {habit.name}
        </Text>
        {done && <Text style={styles.circleDoneCheck}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

function CharacterArea({ character, habits }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const sp = SPECIES_CONFIG[character.species] || SPECIES_CONFIG.wisp;
  const mood = getMood(habits);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.characterArea}>
      <View style={styles.characterCenter}>
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: sp.glow, transform: [{ scale: pulse }] },
          ]}
        />
        <Text style={styles.characterEmoji}>{sp.emoji}</Text>
      </View>
      <Text style={[styles.characterName, { color: sp.color }]}>{sp.name}</Text>
      <Text style={styles.characterMood}>{mood.text}</Text>
    </View>
  );
}

export default function HomeScreen({ data, onSave }) {
  const { character, habits } = data;
  const sp = SPECIES_CONFIG[character.species] || SPECIES_CONFIG.wisp;
  const [modalVisible, setModalVisible] = useState(false);
  const [input, setInput] = useState('');

  function addHabit() {
    const name = input.trim();
    if (!name) return;
    onSave({
      ...data,
      habits: [
        ...habits,
        {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name,
          createdAt: today(),
          completions: [],
          bestStreak: 0,
        },
      ],
    });
    setInput('');
    setModalVisible(false);
  }

  function markDone(id) {
    onSave({
      ...data,
      habits: habits.map(h => {
        if (h.id !== id) return h;
        const completions = [...h.completions, today()];
        const streak = calcStreak(completions);
        return { ...h, completions, bestStreak: Math.max(h.bestStreak || 0, streak) };
      }),
    });
  }

  function deleteHabit(id) {
    Alert.alert('Remove habit?', 'This will delete its streak history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onSave({ ...data, habits: habits.filter(h => h.id !== id) }),
      },
    ]);
  }

  function renderHabit({ item, index }) {
    const isLastOdd = habits.length % 2 !== 0 && index === habits.length - 1;
    return (
      <View style={[styles.circleWrapper, isLastOdd && styles.circleWrapperCentered]}>
        <HabitCircle
          habit={item}
          speciesColor={sp.color}
          onPress={markDone}
          onLongPress={deleteHabit}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f13" />

      <FlatList
        data={habits}
        keyExtractor={h => h.id}
        numColumns={2}
        ListHeaderComponent={
          <>
            <CharacterArea character={character} habits={habits} />
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Today's habits</Text>
              <Pressable
                style={[styles.addBtn, { backgroundColor: sp.color }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </Pressable>
            </View>
            {habits.length === 0 && (
              <Text style={styles.emptyHints}>
                Tap <Text style={{ color: sp.color }}>+ Add</Text> to create your first habit
              </Text>
            )}
          </>
        }
        columnWrapperStyle={styles.row}
        renderItem={renderHabit}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New habit</Text>
            <TextInput
              style={styles.modalInput}
              value={input}
              onChangeText={setInput}
              placeholder="e.g. Drink water, Read 10 pages…"
              placeholderTextColor="#7a7a9a"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addHabit}
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => { setModalVisible(false); setInput(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: sp.color }]}
                onPress={addHabit}
              >
                <Text style={styles.confirmBtnText}>Add habit</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f13' },
  listContent: { paddingBottom: 48 },

  characterArea: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  characterCenter: { alignItems: 'center', justifyContent: 'center', width: 160, height: 160 },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  characterEmoji: { fontSize: 88, textAlign: 'center' },
  characterName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 8 },
  characterMood: { fontSize: 14, color: '#7a7a9a', marginTop: 4 },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CIRCLE_H_PADDING,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#e8e8f0' },
  addBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyHints: {
    color: '#7a7a9a',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 40,
    paddingTop: 20,
  },

  row: { paddingHorizontal: CIRCLE_H_PADDING, gap: CIRCLE_GAP, marginBottom: CIRCLE_GAP },
  circleWrapper: {},
  circleWrapperCentered: { marginLeft: (CIRCLE_SIZE + CIRCLE_GAP) / 2 },

  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 4,
  },
  circleStreak: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  circleName: {
    color: '#7a7a9a',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  circleNameDone: { color: '#fff' },
  circleDoneCheck: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    backgroundColor: '#1a1a22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    gap: 16,
    borderTopWidth: 1,
    borderColor: '#2e2e3e',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#e8e8f0' },
  modalInput: {
    backgroundColor: '#0f0f13',
    borderWidth: 1.5,
    borderColor: '#2e2e3e',
    borderRadius: 12,
    color: '#e8e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#24242f',
  },
  cancelBtnText: { color: '#7a7a9a', fontWeight: '600', fontSize: 16 },
  confirmBtn: { flex: 2, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
