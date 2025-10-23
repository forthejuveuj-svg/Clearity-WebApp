# Audio Recording System Documentation

## Current Status: PARTIALLY WORKING
- ✅ Microphone access and recording works
- ✅ 8-second chunking implemented
- ✅ Audio playback functionality works
- ❌ Whisper API transcription disabled (not working)
- ❌ Speech-to-text conversion not functional

## System Overview

The audio recording system captures user voice input, splits it into 8-second chunks, and is designed to transcribe speech to text using OpenAI's Whisper API.

## File Structure

### Core Files
- **`src/hooks/useAudioRecording.ts`** - Main recording logic and Whisper API integration
- **`src/components/CombinedView.tsx`** - UI integration and message handling
- **`.env`** - Contains Whisper API credentials

### Configuration
- **`.env.example`** - Template for environment variables
- **`AUDIO_RECORDING_SYSTEM.md`** - This documentation file

## How It Works

### 1. Recording Process
1. User clicks microphone button in chat input
2. `useAudioRecording` hook requests microphone permission
3. Recording starts and automatically splits into 8-second chunks
4. Each chunk is saved as a separate `AudioSnippet` object
5. User clicks microphone again to stop recording

### 2. Audio Chunking (8-second intervals)
```typescript
// In useAudioRecording.ts
snippetDuration: 9000 // 9 seconds (configured in CombinedView)
```
- **Why 8 seconds**: Optimal for Whisper API processing and user experience
- **Automatic splitting**: `recordingIntervalRef` creates new chunks every 8 seconds
- **Continuous recording**: User can record for any length, system handles chunking

### 3. Whisper API Integration (CURRENTLY DISABLED)
```typescript
// In useAudioRecording.ts - transcribeAudio function
const response = await fetch(whisperApiUrl, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${whisperApiKey}` },
  body: formData // Contains audio blob
});
```
- **API Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
- **Model**: `whisper-1`
- **Format**: Converts webm audio to text
- **Status**: Disabled due to API issues

### 4. Data Flow
```
User Speech → MediaRecorder → 8s Chunks → AudioSnippet[] → Whisper API → Text → Chat Message
                                                            ↑
                                                    CURRENTLY BROKEN
```

## UI Elements

### Chat Input Area (`CombinedView.tsx`)
- **Microphone Button**: Toggles recording on/off
- **Recording Indicator**: Shows "Recording... 00:05" with red pulsing dot
- **Input Field**: Disabled during recording, shows recording status

### Chat Messages
- **Voice Message**: Shows "🎤 Voice message recorded (X clips of 8 seconds each)"
- **Playback Buttons**: "▶ Clip 1", "▶ Clip 2", etc. for each 8-second segment
- **Audio Playback**: Click buttons to hear recorded audio chunks

### Visual States
```typescript
// Recording active
isRecording = true
- Microphone button: Red background, pulsing animation
- Input field: Shows "Recording... MM:SS", disabled
- Red recording indicator visible

// Recording stopped
isRecording = false
- Microphone button: Normal state
- Chat message added with playback buttons
```

## Key Functions

### `useAudioRecording.ts`
- **`startRecording()`**: Initializes MediaRecorder and starts chunking
- **`stopRecording()`**: Stops recording and returns combined transcription
- **`transcribeAudio()`**: Sends audio to Whisper API (disabled)
- **`playSnippet()`**: Plays back specific audio chunk

### `CombinedView.tsx`
- **`handleMicrophoneClick()`**: Toggles recording and handles results
- **Message rendering**: Displays audio snippets with playback controls

## Current Issues

### 1. Whisper API Not Working
- **Problem**: Transcription returns empty or fails
- **Workaround**: Disabled API calls, shows placeholder messages
- **Fix needed**: Debug API credentials and request format

### 2. No Real Transcription
- **Current**: Shows "Voice message recorded" instead of actual speech
- **Expected**: Should show transcribed text from user's speech
- **Impact**: System records but doesn't convert speech to text

## Environment Variables
```bash
# .env file
VITE_WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions
VITE_WHISPER_API_KEY=sk-proj-[API_KEY]
```

## Next Steps for Future Development

### Immediate Fixes Needed
1. **Debug Whisper API**: Check API key validity and request format
2. **Test transcription**: Verify audio format compatibility with Whisper
3. **Error handling**: Add better error messages for API failures

### Potential Improvements
1. **Browser Speech Recognition**: Fallback to `webkitSpeechRecognition` API
2. **Local Whisper**: Self-hosted Whisper server for privacy
3. **Audio compression**: Reduce file sizes before API calls
4. **Real-time transcription**: Show partial results during recording

### Testing Checklist
- [ ] Microphone permission granted
- [ ] Recording starts/stops correctly
- [ ] 8-second chunks created
- [ ] Audio playback works
- [ ] Whisper API responds
- [ ] Transcription appears in chat
- [ ] Multiple chunks handled properly

## Architecture Notes

The system uses a **streaming approach** where:
1. Audio is captured continuously
2. Split into manageable chunks
3. Each chunk processed independently
4. Results combined into final message

This allows for **long recordings** without memory issues and **parallel processing** of audio segments for faster transcription.

## Hidden Files Status
The following files contain the audio recording implementation and are currently hidden from active development:
- `src/hooks/useAudioRecording.ts`
- Audio-related sections in `src/components/CombinedView.tsx`
- `.env` (Whisper API configuration)

**Resume point**: Fix Whisper API integration to enable actual speech-to-text conversion.