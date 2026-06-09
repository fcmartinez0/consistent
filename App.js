import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';

const STORAGE_KEY = 'consistent_v2';

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setData(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  function save(newData) {
    setData(newData);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }

  if (!loaded) return <View style={styles.splash} />;

  if (!data?.character) {
    return (
      <OnboardingScreen
        onComplete={character => save({ character, habits: [] })}
      />
    );
  }

  return <HomeScreen data={data} onSave={save} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#0f0f13' },
});
