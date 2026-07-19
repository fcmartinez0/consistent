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
  ember:  { name: 'Ember',  color: '#f97316', glow: 'rgba(249,115,22,0.18)' },
  sprout: { name: 'Sprout', color: '#22c55e', glow: 'rgba(34,197,94,0.18)'  },
  pebble: { name: 'Pebble', color: '#94a3b8', glow: 'rgba(148,163,184,0.18)'},
  wisp:   { name: 'Wisp',   color: '#a78bfa', glow: 'rgba(167,139,250,0.18)'},
};

const SPECIES_EVO = {
  ember:  ['🔥','⚡','🌋','☄️','🌞','✴️'],
  sprout: ['🌱','🌿','🌳','🌴','🌲','🎋'],
  pebble: ['🪨','⚫','🔵','💎','💠','🔮'],
  wisp:   ['✨','💫','⭐','🌟','🌠','🪐'],
};

const XP_THRESHOLDS = [0, 100, 275, 550, 1100, 2200];
const LEVEL_NAMES   = ['Wanderer','Apprentice','Keeper','Guardian','Champion','Legend'];
const XP_BASE = 10;
const XP_STREAK_BONUS = 2;
const XP_STREAK_CAP   = 20;

function getLevelInfo(xp = 0) {
  let lvl = 0;
  while (lvl < XP_THRESHOLDS.length - 1 && xp >= XP_THRESHOLDS[lvl + 1]) lvl++;
  const isMax   = lvl >= XP_THRESHOLDS.length - 1;
  const xpStart = XP_THRESHOLDS[lvl];
  const into    = xp - xpStart;
  const needed  = isMax ? null : XP_THRESHOLDS[lvl + 1] - xpStart;
  return { level: lvl + 1, name: LEVEL_NAMES[lvl], into, needed, progress: isMax ? 1 : into / needed, isMax };
}

function xpForCompletion(streak) {
  return XP_BASE + Math.min(streak * XP_STREAK_BONUS, XP_STREAK_CAP);
}

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

function CharacterSection({ character, habits, xpFlash }) {
  const sp   = SPECIES_CONFIG[character.species] || SPECIES_CONFIG.wisp;
  const xp   = character.xp || 0;
  const info = getLevelInfo(xp);
  const evo  = SPECIES_EVO[character.species] || SPECIES_EVO.wisp;
  const emoji = evo[Math.min(info.level - 1, evo.length - 1)];

  const pulse  = useRef(new Animated.Value(1)).current;
  const xpAnim = useRef(new Animated.Value(info.progress)).current;
  const lvlScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(xpAnim, { toValue: info.progress, duration: 600, useNativeDriver: false }).start();
  }, [xp]);

  useEffect(() => {
    if (!xpFlash) return;
    Animated.sequence([
      Animated.spring(lvlScale, { toValue: 1.5, friction: 4, useNativeDriver: true }),
      Animated.timing(lvlScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [xpFlash]);

  const done  = habits.filter(h => isDoneToday(h.completions)).length;
  const total = habits.length;
  const xpToNext = info.isMax ? 0 : info.needed - info.into;
  const mood  = total === 0              ? 'Add habits to start earning XP'
              : done === total           ? 'All done for today'
              : done > 0                 ? `${done} of ${total} done`
              : !info.isMax && xpToNext <= 60 ? `${xpToNext} XP to level up`
              :                            'Ready when you are';

  const xpWidth = xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={c.section}>
      <View style={c.center}>
        <Animated.View style={[c.glow, { backgroundColor: sp.glow, transform: [{ scale: pulse }] }]} />
        <Text style={c.emoji}>{emoji}</Text>
      </View>
      <Text style={[c.name, { color: sp.color }]}>{sp.name}</Text>
      <Animated.Text style={[c.level, { color: sp.color, transform: [{ scale: lvlScale }] }]}>
        {`LV ${info.level}  ${info.name.toUpperCase()}`}
      </Animated.Text>
      <View style={c.xpWrap}>
        <View style={c.xpTrack}>
          <Animated.View style={[c.xpFill, { width: xpWidth, backgroundColor: sp.color }]} />
        </View>
        <Text style={c.xpLbl}>
          {info.isMax ? `${xp} XP · MAX` : `${info.into} / ${info.needed} XP`}
        </Text>
      </View>
      <Text style={c.mood}>{mood}</Text>
    </View>
  );
}

const c = StyleSheet.create({
  section: { alignItems: 'center', paddingTop: 4, paddingBottom: 4, height: 236 },
  center:  { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  glow:    { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
  emoji:   { fontSize: 68 },
  name:    { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 },
  level:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginTop: 2 },
  xpWrap:  { width: 150, marginTop: 6, alignItems: 'center', gap: 3 },
  xpTrack: { width: '100%', height: 3, backgroundColor: '#2e2e3e', borderRadius: 2, overflow: 'hidden' },
  xpFill:  { height: '100%', borderRadius: 2 },
  xpLbl:   { fontSize: 10, color: '#7a7a9a', fontWeight: '600', letterSpacing: 0.4 },
  mood:    { fontSize: 12, color: '#7a7a9a', marginTop: 4 },
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
          <Text style={[h.streak, { fontSize: streakSize }]}>{streak}d streak</Text>
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

  const todayXp = habits
    .filter(h => isDoneToday(h.completions))
    .reduce((s, h) => s + xpForCompletion(calcStreak(h.completions)), 0);

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
        <Text style={g.title}>{todayXp > 0 ? `Today  +${todayXp} XP` : 'Today'}</Text>
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
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:     { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  markAll:   { fontSize: 13, fontWeight: '600' },
  empty:     { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#4a4a6a', fontSize: 14 },
  grid:      { gap: 12 },
  row:       { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  rowCentered: {},
});

// ─── Calendar Section ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function DateSection({ speciesColor }) {
  const now = new Date();
  return (
    <View style={ds.container}>
      <Text style={ds.monthLbl}>{MONTH_NAMES[now.getMonth()].toUpperCase()}</Text>
      <Text style={[ds.dayNum, { color: speciesColor }]}>{now.getDate()}</Text>
      <Text style={ds.yearLbl}>{now.getFullYear()}</Text>
    </View>
  );
}

const ds = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12 },
  monthLbl:  { flex: 1, fontSize: 11, fontWeight: '700', color: '#7a7a9a', letterSpacing: 2 },
  dayNum:    { flex: 1, fontSize: 80, fontWeight: '900', lineHeight: 80, letterSpacing: -3, textAlign: 'center' },
  yearLbl:   { flex: 1, fontSize: 11, fontWeight: '600', color: '#4a4a6a', letterSpacing: 2, textAlign: 'right' },
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

// ─── Level-Up Modal ───────────────────────────────────────────────────────────

function LevelUpModal({ visible, character, onDismiss }) {
  const sp   = SPECIES_CONFIG[character.species] || SPECIES_CONFIG.wisp;
  const xp   = character.xp || 0;
  const info = getLevelInfo(xp);
  const evo  = SPECIES_EVO[character.species] || SPECIES_EVO.wisp;
  const emoji = evo[Math.min(info.level - 1, evo.length - 1)];
  const scale = useRef(new Animated.Value(0.2)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.2);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={lv.overlay} onPress={onDismiss}>
        <Animated.View style={[lv.inner, { opacity: fade }]}>
          <Animated.Text style={[lv.emoji, { transform: [{ scale }] }]}>{emoji}</Animated.Text>
          <Text style={[lv.tag, { color: sp.color }]}>LEVEL UP</Text>
          <Text style={lv.num}>Lv {info.level}</Text>
          <Text style={[lv.name, { color: sp.color }]}>{info.name}</Text>
          <Text style={lv.tap}>Tap anywhere to continue</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const lv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,15,0.93)', alignItems: 'center', justifyContent: 'center' },
  inner:   { alignItems: 'center', gap: 6 },
  emoji:   { fontSize: 96, lineHeight: 110 },
  tag:     { fontSize: 11, fontWeight: '800', letterSpacing: 5, marginTop: 16 },
  num:     { fontSize: 68, fontWeight: '900', color: '#e8e8f0', letterSpacing: -3, lineHeight: 74 },
  name:    { fontSize: 24, fontWeight: '700', marginTop: 2 },
  tap:     { fontSize: 12, color: '#4a4a6a', marginTop: 32, letterSpacing: 0.8 },
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
            placeholder="e.g. Drink water, Read 10 pages"
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
  const [lvlUpVisible, setLvlUpVisible] = useState(false);
  const [xpFlash, setXpFlash] = useState(0);

  function awardXp(streak) {
    const earned   = xpForCompletion(streak);
    const oldLevel = getLevelInfo(character.xp || 0).level;
    const newXp    = (character.xp || 0) + earned;
    const newLevel = getLevelInfo(newXp).level;
    if (newLevel > oldLevel) { setXpFlash(f => f + 1); setLvlUpVisible(true); }
    return newXp;
  }

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
    let newXp = character.xp || 0;
    const newHabits = habits.map(h => {
      if (h.id !== id) return h;
      const completions = [...h.completions, today()];
      const streak = calcStreak(completions);
      newXp = awardXp(streak);
      return { ...h, completions, bestStreak: Math.max(h.bestStreak || 0, streak) };
    });
    onSave({ ...data, character: { ...character, xp: newXp }, habits: newHabits });
  }

  function markAllDone() {
    const t = today();
    let newXp = character.xp || 0;
    const newHabits = habits.map(h => {
      if (isDoneToday(h.completions)) return h;
      const completions = [...h.completions, t];
      const streak = calcStreak(completions);
      newXp += xpForCompletion(streak);
      return { ...h, completions, bestStreak: Math.max(h.bestStreak || 0, streak) };
    });
    const oldLevel = getLevelInfo(character.xp || 0).level;
    if (getLevelInfo(newXp).level > oldLevel) setXpFlash(f => f + 1);
    onSave({ ...data, character: { ...character, xp: newXp }, habits: newHabits });
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
        <DateSection speciesColor={sp.color} />
        <CharacterSection character={character} habits={habits} xpFlash={xpFlash} />
        <HabitGrid
          habits={habits}
          speciesColor={sp.color}
          onMarkDone={markDone}
          onMarkAll={markAllDone}
          onLongPress={deleteHabit}
        />
        <BottomBar speciesColor={sp.color} onOpen={() => setModalVisible(true)} />
      </View>
      <AddModal
        visible={modalVisible}
        speciesColor={sp.color}
        onAdd={addHabit}
        onClose={() => setModalVisible(false)}
      />
      <LevelUpModal
        visible={lvlUpVisible}
        character={character}
        onDismiss={() => setLvlUpVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0f0f13' },
  container: { flex: 1 },
});
