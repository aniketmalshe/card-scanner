import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ScannedCard = {
  id: string;
  name: string;
  company: string;
  frontImageUri: string;
  scannedAt: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [recentCards, setRecentCards] = useState<ScannedCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadRecentCards();
    }, [])
  );

  const loadRecentCards = async () => {
    try {
      const data = await AsyncStorage.getItem('scanned_cards');
      if (data) setRecentCards(JSON.parse(data));
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Ionicons name="card-outline" size={40} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Card Scanner</Text>
        <Text style={styles.heroSub}>Scan business cards, save contacts instantly</Text>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/scan')}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.scanButtonText}>Scan a Card</Text>
      </TouchableOpacity>

      {/* Recent */}
      {recentCards.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recently Scanned</Text>
          <FlatList
            data={recentCards.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.recentCard}>
                <Image source={{ uri: item.frontImageUri }} style={styles.recentThumb} />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{item.name || 'Unknown'}</Text>
                  <Text style={styles.recentCompany}>{item.company || '—'}</Text>
                  <Text style={styles.recentDate}>
                    {new Date(item.scannedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#4caf50" />
              </View>
            )}
          />
        </View>
      )}

      {recentCards.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="scan-outline" size={64} color="#c0cfe0" />
          <Text style={styles.emptyText}>No cards scanned yet</Text>
          <Text style={styles.emptySubText}>Tap the button above to get started</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  hero: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroSub: { fontSize: 14, color: '#aab4cc', marginTop: 6 },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4361ee',
    marginHorizontal: 32,
    marginTop: -20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  recentSection: { flex: 1, marginTop: 28, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recentThumb: { width: 56, height: 36, borderRadius: 6, backgroundColor: '#e8edf2' },
  recentInfo: { flex: 1, marginLeft: 12 },
  recentName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  recentCompany: { fontSize: 13, color: '#667eaa', marginTop: 2 },
  recentDate: { fontSize: 11, color: '#aab4cc', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8899aa', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#aab4cc', marginTop: 6 },
});
