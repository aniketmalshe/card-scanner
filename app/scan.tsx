import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, useCallback } from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import { runOcrOnFrame, parseCardText } from '../src/utils/ocr';

type Side = 'front' | 'back';

export default function ScanScreen() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [currentSide, setCurrentSide] = useState<Side>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [frontText, setFrontText] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Live OCR text from frame processor (shown as feedback)
  const [liveText, setLiveText] = useState('');

  const handleLiveText = useCallback((text: string) => {
    // Only update if it's meaningful — avoids jitter
    if (text && text.length > 10) setLiveText(text);
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const text = runOcrOnFrame(frame);
      runOnJS(handleLiveText)(text);
    },
    [handleLiveText]
  );

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Ionicons name="camera-outline" size={64} color="#4361ee" />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permText}>
          This app needs camera access to scan business cards.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.permTitle}>Camera Unavailable</Text>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    setLiveText('');

    try {
      const photo = await cameraRef.current.takePhoto({ qualityPrioritization: 'quality' });

      // Save to persistent app storage
      const dir = FileSystem.documentDirectory + 'cards/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const filename = `${currentSide}_${Date.now()}.jpg`;
      const destUri = dir + filename;
      await FileSystem.copyAsync({ from: `file://${photo.path}`, to: destUri });

      if (currentSide === 'front') {
        setFrontUri(destUri);
        setFrontText(liveText);
        setProcessing(false);

        Alert.alert(
          'Front Captured ✓',
          'Do you want to scan the back of the card too?',
          [
            {
              text: 'Skip — Process Now',
              onPress: () => navigateToReview(destUri, '', liveText, ''),
            },
            {
              text: 'Scan Back',
              onPress: () => {
                setCurrentSide('back');
                setLiveText('');
              },
            },
          ]
        );
      } else {
        // Back side captured
        const backText = liveText;
        setProcessing(false);
        navigateToReview(frontUri!, destUri, frontText, backText);
      }
    } catch (err) {
      setProcessing(false);
      Alert.alert('Error', 'Failed to capture. Please try again.');
    }
  };

  const navigateToReview = (
    front: string,
    back: string,
    fText: string,
    bText: string
  ) => {
    const parsed = parseCardText(fText, bText);
    router.push({
      pathname: '/review',
      params: {
        frontUri: front,
        backUri: back,
        name: parsed.name || '',
        designation: parsed.designation || '',
        company: parsed.company || '',
        phone: parsed.phone || '',
        mobile: parsed.mobile || '',
        email: parsed.email || '',
        website: parsed.website || '',
        address: parsed.address || '',
      },
    });
  };

  const isReading = liveText.length > 10;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={2}
      />

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentSide === 'front' ? 'Scan Front Side' : 'Scan Back Side'}
        </Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* Card frame overlay */}
      <View style={styles.frameContainer}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.frameHint}>Align the card within the frame</Text>
      </View>

      {/* Live OCR status indicator */}
      <View style={styles.liveStatus}>
        <View style={[styles.liveIndicator, isReading && styles.liveIndicatorActive]} />
        <Text style={styles.liveText}>
          {isReading ? 'Card detected — tap to capture' : 'Looking for card...'}
        </Text>
      </View>

      {/* Side indicators */}
      <View style={styles.sideIndicators}>
        <View style={[styles.sideChip, frontUri && styles.sideChipDone]}>
          <Ionicons
            name={frontUri ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={frontUri ? '#4caf50' : '#fff'}
          />
          <Text style={styles.sideChipText}>Front</Text>
        </View>
        <View style={styles.sideDivider} />
        <View style={styles.sideChip}>
          <Ionicons name="ellipse-outline" size={16} color="#fff" />
          <Text style={styles.sideChipText}>Back</Text>
        </View>
      </View>

      {/* Capture button */}
      <View style={styles.controls}>
        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Saving...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.captureBtn, isReading && styles.captureBtnReady]}
            onPress={takePicture}
          >
            <View style={[styles.captureBtnInner, isReading && styles.captureBtnInnerReady]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
    padding: 32,
    gap: 16,
  },
  permTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  permText: { fontSize: 15, color: '#667eaa', textAlign: 'center', lineHeight: 22 },
  permButton: {
    backgroundColor: '#4361ee',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  permButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '85%', aspectRatio: 1.6, position: 'relative' },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#4361ee',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  frameHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 16, textAlign: 'center' },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  liveIndicatorActive: { backgroundColor: '#4caf50' },
  liveText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  sideIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sideChipDone: { backgroundColor: 'rgba(76,175,80,0.25)' },
  sideChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sideDivider: { width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  controls: {
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureBtnReady: { borderColor: '#4caf50' },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  captureBtnInnerReady: { backgroundColor: '#4caf50' },
  processingContainer: { alignItems: 'center', gap: 12 },
  processingText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
