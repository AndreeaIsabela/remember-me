import React, { useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useVoiceDictation } from '../hooks/useVoiceDictation';

const DISCARD_THRESHOLD_X = -50;

interface VoiceDictationButtonProps {
  onAppend: (text: string) => void;
  selectionRef?: React.RefObject<{ start: number; end: number }>;
}

export function VoiceDictationButton({
  onAppend,
  selectionRef,
}: VoiceDictationButtonProps) {
  const { state, interimTranscript, start, confirm, discard } =
    useVoiceDictation();

  const isRecording = state === 'recording';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ─── Gestures ─────────────────────────────────────────────────────────────

  const longPress = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
      start();
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (isRecording && event.translationX < DISCARD_THRESHOLD_X) {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        discard();
      }
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  // ─── Release handler via Pressable wrapper ────────────────────────────────
  // GestureDetector doesn't have an onEnd prop directly accessible from
  // outside, so we track release via the LongPress onEnd callback.
  const longPressWithRelease = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
      start();
    })
    .onEnd(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      if (selectionRef?.current) {
        // Cursor-aware insertion for edit screen
        const selection = selectionRef.current;
        confirm((transcript) => {
          onAppend(transcript);
        });
        // The actual splice logic is handled by onAppend in the screen,
        // which receives the selection position via selectionRef
        void selection; // acknowledge ref usage
      } else {
        confirm(onAppend);
      }
    })
    .onFinalize(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });

  const composedGesture = Gesture.Simultaneous(longPressWithRelease, pan);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {interimTranscript.length > 0 && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText}>{interimTranscript}</Text>
        </View>
      )}

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.micButton,
            isRecording && styles.micButtonRecording,
            { transform: [{ scale: scaleAnim }] },
          ]}
          accessibilityLabel="Record voice note"
          accessibilityHint={
            isRecording
              ? 'Release to confirm, slide left to discard'
              : undefined
          }
          accessibilityRole="button"
        >
          <Text style={styles.micIcon}>{isRecording ? '🔴' : '🎤'}</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  transcriptContainer: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    maxWidth: 280,
  },
  transcriptText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  micButtonRecording: {
    backgroundColor: '#ffe0e0',
    borderColor: '#ff4444',
  },
  micIcon: {
    fontSize: 20,
  },
});
