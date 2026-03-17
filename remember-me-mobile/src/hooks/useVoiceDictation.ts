import { useState, useRef, useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import { RecordingState, UseVoiceDictationReturn } from '../types';

export function useVoiceDictation(): UseVoiceDictationReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');

  // Holds the final transcript of the current take until confirm or discard
  const currentTranscriptRef = useRef('');
  // Guards against double-fire on confirm
  const isConfirmedRef = useRef(false);

  // ─── Speech recognition events ───────────────────────────────────────────

  useSpeechRecognitionEvent('start', () => {
    setState('recording');
    setInterimTranscript('');
    currentTranscriptRef.current = '';
    isConfirmedRef.current = false;
  });

  useSpeechRecognitionEvent('end', () => {
    // State reset happens in confirm() or discard(); 'end' alone doesn't reset
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    currentTranscriptRef.current = transcript;
    if (event.isFinal) {
      // Final result — interim display stays until confirm/discard
      setInterimTranscript(transcript);
    } else {
      setInterimTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState('error');
    setInterimTranscript('');
    currentTranscriptRef.current = '';

    if (event.error === 'network') {
      Toast.show({
        type: 'error',
        text1: 'Speech recognition unavailable — check your connection',
      });
    } else if (event.error === 'no-speech') {
      // Silent reset — no-speech is not an error worth surfacing as toast
      setState('idle');
    } else if (event.error === 'not-allowed') {
      // Handled by permission check in start(); this is a fallback
      Toast.show({
        type: 'error',
        text1: 'Microphone access denied',
        text2: 'Go to Settings to enable microphone access.',
        onPress: () => Linking.openSettings(),
      });
      setState('idle');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Speech recognition error',
        text2: 'Please try again.',
      });
      setState('idle');
    }
  });

  // ─── Public API ───────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    // Request permissions on every start attempt; no-op if already granted
    const { granted, canAskAgain } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!granted) {
      if (!canAskAgain) {
        Toast.show({
          type: 'error',
          text1: 'Microphone access denied',
          text2: 'Tap here to open Settings.',
          onPress: () => Linking.openSettings(),
        });
      }
      return;
    }

    setState('recording');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      addsPunctuation: true,
      iosTaskHint: 'dictation',
    });
  }, []);

  const pause = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setState('stopped');
  }, []);

  const confirm = useCallback((onAppend: (text: string) => void) => {
    if (isConfirmedRef.current) return; // guard double-fire
    isConfirmedRef.current = true;

    const transcript = currentTranscriptRef.current.trim();

    // Only stop recognition if currently recording (not already stopped/paused)
    ExpoSpeechRecognitionModule.abort();

    setInterimTranscript('');
    currentTranscriptRef.current = '';
    setState('idle');

    if (transcript.length > 0) {
      onAppend(transcript);
    }
  }, []);

  const discard = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    setInterimTranscript('');
    currentTranscriptRef.current = '';
    isConfirmedRef.current = false;
    setState('idle');
  }, []);

  return { state, interimTranscript, start, confirm, discard, pause };
}
