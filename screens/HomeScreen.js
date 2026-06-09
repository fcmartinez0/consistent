import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
  useWindowDimensions,
} from 'react-native';

const SPECIES_CONFIG = {
  ember:  { emoji: '🔥', name: 'Ember',  color: '#f97316', glow: 'rgba(249,115,22,0.18)' },
  sprout: { emoji: '🌱', name: 'Sprout', color: '#22c55e', glow: 'rgba(34,197,94,0.18)'  },
  pebble: { emoji: '🪨', name: 'Pebble', color: '#94a3b8', glow: 'rgba(148,163,184,0.18)'},
  wisp:   { emoji: '✨', name: 'Wisp',   color: '#a78bfa', glow: 'rgba(167,139,250,0.18)'},
};

function today() { return new Date().toISOString().slice(0, 10); }
function isDoneToday(completions) { return completions.includes(today()); }

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
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 864e5;
    if (diff === 1) streak++; else break;
  }
  return streak;
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(',');
}

function getGridLayout(count, containerW, containerH) {
  if (count === 0) return { cols: 1, size: 120, displayCount: 0, overflow: 0 };
  const HPAD = 24, GAP = 12;
  const MAX_DISPLAY = 9;
  const displayCount = Math.min(count, MAX_DISPLAY);
  const overflow = count - MAX_DISPLAY;
  const totalCells = displayCount + (overflow > 0 ? 1 : 0);
  const cols = totalCells <= 2 ? totalCells : totalCells <= 4 ? 2 : 3;
  const rows = Math.ceil(totalCells / cols);
  const maxW = (containerW - HPAD * 2 - (cols - 1) * GAP) / cols;
  const maxH = containerH > 0 ? (containerH - (rows - 1) * GAP - 36) / rows : maxW;
  const size = Math.floor(Math.min(maxW, maxH, 180));
  return { cols, rows, size, displayCount, overflow };
}

// ─── Character Section ────────────────────────────────────────────────────────

function CharacterSection({ character, habits }) {
  const sp = SPECIES_CONFIG[character.species] || SPECIES_CONFIG.wisp;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const done  = habits.filter(h => isDoneToday(h.completions)).length;
  const total = habits.length;
  const mood  = total === 0       ? 'Add habits below to begin'
              : done === total    ? '✨ All done today!'
              : done > 0          ? `${done} of ${total} done today`
              :                     'Ready when you are…';

  return (
    <View style={c.section}>
      <View style={c.center}>
        <Animated.View style={[c.glow, { backgroundColor: sp.glow, transform: [{ scale: pulse }] }]} />
        <Text style={c.emoji}>{sp.emoji}</Text>
      </View>
      <Text style={[c.name, { color: sp.color }]}>{sp.name}</Text>
      <Text style={c.mood}>{mood}</Text>
    </View>
  );
}

const c = StyleSheet.create({
  section: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, height: 148 },
  center:  { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  glow:    { position: 'absolute', width: 100, height: 100, borderRadius: 50 },
  emoji:   { fontSize: 64 },
  name:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 6 },
  mood:    { fontSize: 13, color: '#7a7a9a', marginTop: 2 },
});

// ─── Habit Circle ─────────────────────────────────────────────────────────────

function HabitCircle({ habit, size, speciesColor, onPress, onLongPress }) {
  const done    = isDoneToday(habit.completions);
  const streak  = calcStreak(habit.completions);
  const scale   = useRef(new Animated.Value(1)).current;
  const fill    = useRef(new Animated.Value(done ? 1 : 0)).current;

  function handlePress() {
    if (done) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.86, duration: 90, useNativeDriver: true }),
        Animated.spring(scale,  { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]),
      Animated.timing(fill, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    onPress(habit.id);
  }

  const fontSize    = Math.max(10, Math.floor(size * 0.13));
  const streakSize  = Math.max(8,  Math.floor(size * 0.09));
  const checkSize   = Math.max(12, Math.floor(size * 0.18));

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={() => onLongPress(habit.id)}
      style={{ width: size, height: size }}
      delayLongPress={400}
    >
      <Animated.View style={[h.circle, {
        width: size, height: size, borderRadius: size / 2,
        borderColor: done ? speciesColor : '#2e2e3e',
        transform: [{ scale }],
      }]}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: speciesColor, opacity: fill },
        ]} />
        {streak > 0 && (
          <Text style={[h.streak, { fontSize: streakSize }]}>🔥{streak}</Text>
        )}
        <Text
          style={[h.name, { fontSize, color: done ? '#fff' : '#9a9ab0' }]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {habit.name}
        </Text>
        {done && <Text style={[h.check, { fontSize: checkSize }]}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

const h = StyleSheet.create({
  circle: { borderWidth: 2, alignItems: 'center', justifyContent: 'center',
            padding: 8, gap: 2, overflow: 'hidden', backgroundColor: '#1a1a22' },
  streak: { color: 'rgba(255,255,255,0.65)', fontWeight: '600', zIndex: 1 },
  name:   { fontWeight: '600', textAlign: 'center', lineHeight: 18, zIndex: 1 },
  check:  { color: 'rgba(255,255,255,0.85)', fontWeight: '700', zIndex: 1 },
});

// ─── Habit Grid ───────────────────────────────────────────────────────────────

function HabitGrid({ habits, speciesColor, onMarkDone, onMarkAll, onLongPress }) {
  const { width }   = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const layout      = useMemo(() => getGridLayout(habits.length, width, height), [habits.length, width, height]);
  const allDone     = habits.length > 0 && habits.every(h => isDoneToday(h.completions));
  const displayHabits = habits.slice(0, layout.displayCount);

  const rows = [];
  for (let r = 0; r < Math.ceil(displayHabits.length / layout.cols); r++) {
    rows.push(displayHabits.slice(r * layout.cols, (r + 1) * layout.cols));
  }
  if (layout.overflow > 0) {
    const lastRow = rows[rows.length - 1];
    if (lastRow.length < layout.cols) lastRow.push({ _overflow: true, count: layout.overflow });
    else rows.push([{ _overflow: true, count: layout.overflow }]);
  }

  return (
    <View style={g.container} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      <View style={g.header}>
        <Text style={g.title}>Today</Text>
        {!allDone && habits.length > 1 && (
          <Pressable onPress={onMarkAll} hitSlop={8}>
            <Text style={[g.markAll, { color: speciesColor }]}>Mark all done</Text>
          </Pressable>
        )}
      </View>

      {habits.length === 0 ? (
        <View style={g.empty}>
          <Text style={g.emptyText}>Tap below to add your first habit</Text>
        </View>
      ) : (
        <View style={g.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={[g.row, row.length < layout.cols && g.rowCentered]}>
              {row.map((item, ci) =>
                item._overflow ? (
                  <View key="overflow" style={[h.circle, {
                    width: layout.size, height: layout.size,
                    borderRadius: layout.size / 2, borderColor: '#2e2e3e',
                    justifyContent: 'center', alignItems: 'center',
                  }]}>
                    <Text style={{ color: '#7a7a9a', fontSize: 18, fontWeight: '700' }}>+{item.count}</Text>
                  </View>
                ) : (
                  <HabitCircle
                    key={item.id}
                    habit={item}
                    size={layout.size}
                    speciesColor={speciesColor}
                    onPress={onMarkDone}
                    onLongPress={onLongPress}
                  />
                )
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const g = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title:     { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  markAll:   { fontSize: 13, fontWeight: '600' },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#4a4a6a', fontSize: 14 },
  grid:      { flex: 1, justifyContent: 'center', gap: 12 },
  row:       { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  rowCentered: {},
});

// ─── Calendar Section ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['S','M','T','W','T','F','S'];

function CalendarSection({ habits, speciesColor }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const todayStr = today();
  const rgb      = hexToRgb(speciesColor);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function getRatio(day) {
    if (!habits.length) return 0;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return habits.filter(h => h.completions.includes(dateStr)).length / habits.length;
  }

  return (
    <View style={cal.container}>
      <View style={cal.header}>
        <Pressable onPress={prevMonth} hitSlop={10}><Text style={cal.nav}>‹</Text></Pressable>
        <Text style={cal.month}>{MONTH_NAMES[month].slice(0,3)} {year}</Text>
        <Pressable onPress={nextMonth} hitSlop={10}><Text style={cal.nav}>›</Text></Pressable>
      </View>

      <View style={cal.labelRow}>
        {DAY_LABELS.map((d, i) => <Text key={i} style={cal.label}>{d}</Text>)}
      </View>

      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={cal.cell} />;
          const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday  = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const ratio    = isFuture ? 0 : getRatio(day);
          return (
            <View key={`d${day}`} style={cal.cell}>
              <View style={[
                cal.dot,
                isToday                         && { backgroundColor: speciesColor },
                !isToday && ratio > 0           && { backgroundColor: `rgba(${rgb},${(0.25 + ratio * 0.65).toFixed(2)})` },
              ]}>
                <Text style={[
                  cal.dayNum,
                  isToday           && cal.dayToday,
                  isFuture          && cal.dayFuture,
                  !isToday && ratio === 1 && { color: '#fff', fontWeight: '700' },
                ]}>
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 8 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  nav:       { fontSize: 22, color: '#7a7a9a', fontWeight: '300', paddingHorizontal: 8 },
  month:     { fontSize: 13, fontWeight: '700', color: '#e8e8f0', letterSpacing: 0.5 },
  labelRow:  { flexDirection: 'row', marginBottom: 4 },
  label:     { flex: 1, textAlign: 'center', fontSize: 10, color: '#4a4a6a', fontWeight: '600' },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
  dot:       { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNum:    { fontSize: 11, color: '#7a7a9a', fontWeight: '500' },
  dayToday:  { color: '#fff', fontWeight: '800' },
  dayFuture: { color: '#2e2e3e' },
});

// ─── Bottom Bar (Safari-style) ────────────────────────────────────────────────

function BottomBar({ speciesColor, onOpen }) {
  return (
    <Pressable style={bar.wrapper} onPress={onOpen}>
      <View style={bar.bar}>
        <Text style={bar.placeholder}>Add a habit…</Text>
        <View style={[bar.pill, { backgroundColor: speciesColor }]}>
          <Text style={bar.pillText}>+</Text>
        </View>
      </View>
    </Pressable>
  );
}

const bar = StyleSheet.create({
  wrapper:     { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 6 },
  bar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a22',
                 borderRadius: 14, borderWidth: 1, borderColor: '#2e2e3e',
                 paddingLeft: 18, paddingRight: 8, paddingVertical: 10 },
  placeholder: { flex: 1, color: '#4a4a6a', fontSize: 15 },
  pill:        { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pillText:    { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },
});

// ─── Add Modal ────────────────────────────────────────────────────────────────

function AddModal({ visible, speciesColor, onAdd, onClose }) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const name = input.trim();
    if (!name) return;
    onAdd(name);
    setInput('');
  }

  function handleClose() {
    setInput('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={mod.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={mod.backdrop} onPress={handleClose} />
        <View style={mod.sheet}>
          <View style={mod.handle} />
          <Text style={mod.title}>New habit</Text>
          <TextInput
            style={mod.input}
            value={input}
            onChangeText={setInput}
            placeholder="e.g. Drink water, Read 10 pages…"
            placeholderTextColor="#4a4a6a"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            maxLength={60}
          />
          <View style={mod.actions}>
            <Pressable style={mod.cancelBtn} onPress={handleClose}>
              <Text style={mod.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[mod.addBtn, { backgroundColor: speciesColor }]} onPress={handleAdd}>
              <Text style={mod.addText}>Add habit</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mod = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  backdrop:   { flex: 1 },
  sheet:      { backgroundColor: '#1a1a22', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: 24, gap: 16, borderTopWidth: 1, borderColor: '#2e2e3e' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3a3a50', alignSelf: 'center', marginBottom: 4 },
  title:      { fontSize: 18, fontWeight: '700', color: '#e8e8f0' },
  input:      { backgroundColor: '#0f0f13', borderWidth: 1.5, borderColor: '#2e2e3e',
                borderRadius: 12, color: '#e8e8f0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  actions:    { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#24242f' },
  cancelText: { color: '#7a7a9a', fontWeight: '600', fontSize: 15 },
  addBtn:     { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ data, onSave }) {
  const { character, habits } = data;
  const sp = SPECIES_CONFIG[character.species] || SPECIES_CONFIG.wisp;
  const [modalVisible, setModalVisible] = useState(false);

  function addHabit(name) {
    onSave({
      ...data,
      habits: [...habits, {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, createdAt: today(), completions: [], bestStreak: 0,
      }],
    });
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

  function markAllDone() {
    const t = today();
    onSave({
      ...data,
      habits: habits.map(h => {
        if (isDoneToday(h.completions)) return h;
        const completions = [...h.completions, t];
        const streak = calcStreak(completions);
        return { ...h, completions, bestStreak: Math.max(h.bestStreak || 0, streak) };
      }),
    });
  }

  function deleteHabit(id) {
    Alert.alert('Remove habit?', 'This will delete its streak history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive',
        onPress: () => onSave({ ...data, habits: habits.filter(h => h.id !== id) }) },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f13" />
      <View style={s.container}>
        <CharacterSection character={character} habits={habits} />
        <HabitGrid
          habits={habits}
          speciesColor={sp.color}
          onMarkDone={markDone}
          onMarkAll={markAllDone}
          onLongPress={deleteHabit}
        />
        <CalendarSection habits={habits} speciesColor={sp.color} />
        <BottomBar speciesColor={sp.color} onOpen={() => setModalVisible(true)} />
      </View>
      <AddModal
        visible={modalVisible}
        speciesColor={sp.color}
        onAdd={addHabit}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0f0f13' },
  container: { flex: 1 },
});
