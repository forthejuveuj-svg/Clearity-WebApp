import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioSnippet {
  id: string;
  blob: Blob;
  timestamp: string;
  duration: number;
  transcription?: string;
  isTranscribing?: boolean;
}

interface UseAudioRecordingProps {
  onTranscription?: (text: string, snippetId: string) => void;
  whisperApiUrl?: string;
  whisperApiKey?: string;
  snippetDuration?: number; // Duration in milliseconds
}

export const useAudioRecording = ({
  onTranscription,
  whisperApiUrl = (import.meta as any).env?.VITE_WHISPER_API_URL || '',
  whisperApiKey = (import.meta as any).env?.VITE_WHISPER_API_KEY || '',
  snippetDuration = 9000 // 9 seconds
}: UseAudioRecordingProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioSnippets, setAudioSnippets] = useState<AudioSnippet[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingTranscriptions, setPendingTranscriptions] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const snippetCounterRef = useRef(0);
  const recordingStartTimeRef = useRef<number>(0);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(Date.now() - recordingStartTimeRef.current);
      }, 100);

      // Start first recording session
      startRecordingSession();

      // Set up interval for continuous recording
      recordingIntervalRef.current = setInterval(() => {
        if (streamRef.current) {
          startRecordingSession();
        }
      }, snippetDuration);

    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }, [snippetDuration]);

  // Start a single recording session
  const startRecordingSession = useCallback(() => {
    if (!streamRef.current) return;

    audioChunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (audioChunksRef.current.length > 0) {
        saveAudioSnippet();
      }
    };

    mediaRecorder.start();

    // Stop after specified duration
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, snippetDuration);
  }, [snippetDuration]);

  // Save audio snippet and start transcription
  const saveAudioSnippet = useCallback(() => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    const snippetId = `snippet_${++snippetCounterRef.current}_${Date.now()}`;
    
    const snippet: AudioSnippet = {
      id: snippetId,
      blob: audioBlob,
      timestamp: new Date().toISOString(),
      duration: snippetDuration / 1000,
      isTranscribing: true
    };

    setAudioSnippets(prev => [snippet, ...prev]);
    
    // Start transcription immediately without waiting
    if (whisperApiUrl && whisperApiKey) {
      transcribeAudio(snippet);
    }
  }, [snippetDuration, whisperApiUrl, whisperApiKey]);

  // Transcribe audio using Whisper API
  const transcribeAudio = useCallback(async (snippet: AudioSnippet) => {
    setPendingTranscriptions(prev => prev + 1);

    try {
      // Convert webm to wav for better compatibility
      const audioBuffer = await snippet.blob.arrayBuffer();
      
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), `${snippet.id}.webm`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // You can make this configurable

      const response = await fetch(whisperApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whisperApiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      const transcription = result.text?.trim() || '';

      // Update snippet with transcription
      setAudioSnippets(prev => 
        prev.map(s => 
          s.id === snippet.id 
            ? { ...s, transcription, isTranscribing: false }
            : s
        )
      );

      // Call callback if provided
      if (transcription && onTranscription) {
        onTranscription(transcription, snippet.id);
      }

    } catch (error) {
      console.error('Transcription error:', error);
      
      // Update snippet to show error
      setAudioSnippets(prev => 
        prev.map(s => 
          s.id === snippet.id 
            ? { ...s, transcription: '[Transcription failed]', isTranscribing: false }
            : s
        )
      );
    } finally {
      setPendingTranscriptions(prev => prev - 1);
    }
  }, [whisperApiUrl, whisperApiKey, onTranscription]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    // Clear intervals
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop current recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setRecordingTime(0);

    // Wait for pending transcriptions to complete
    return new Promise<string>((resolve) => {
      const checkPending = () => {
        if (pendingTranscriptions === 0) {
          // Combine all transcriptions
          const fullTranscription = audioSnippets
            .filter(snippet => snippet.transcription && snippet.transcription !== '[Transcription failed]')
            .map(snippet => snippet.transcription)
            .join(' ')
            .trim();
          
          resolve(fullTranscription);
        } else {
          setTimeout(checkPending, 100);
        }
      };
      checkPending();
    });
  }, [pendingTranscriptions, audioSnippets]);

  // Get combined transcription from all snippets
  const getCombinedTranscription = useCallback(() => {
    return audioSnippets
      .filter(snippet => snippet.transcription && snippet.transcription !== '[Transcription failed]')
      .reverse() // Reverse to get chronological order
      .map(snippet => snippet.transcription)
      .join(' ')
      .trim();
  }, [audioSnippets]);

  // Clear all snippets
  const clearSnippets = useCallback(() => {
    setAudioSnippets([]);
    snippetCounterRef.current = 0;
  }, []);

  // Play audio snippet
  const playSnippet = useCallback((snippetId: string) => {
    const snippet = audioSnippets.find(s => s.id === snippetId);
    if (snippet) {
      const audio = new Audio(URL.createObjectURL(snippet.blob));
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }, [audioSnippets]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    audioSnippets,
    recordingTime,
    pendingTranscriptions,
    startRecording,
    stopRecording,
    getCombinedTranscription,
    clearSnippets,
    playSnippet
  };
};