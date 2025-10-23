import React, { useState } from 'react';
import { Mic, MicOff, Play, Loader2, MessageSquare, X, Send } from 'lucide-react';
import { useAudioRecording, AudioSnippet } from '@/hooks/useAudioRecording';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AudioPanelProps {
  onTranscriptionComplete?: (transcription: string) => void;
  onTextSubmit?: (text: string) => void;
  className?: string;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({
  onTranscriptionComplete,
  onTextSubmit,
  className = ''
}) => {
  const [textInput, setTextInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    isRecording,
    audioSnippets,
    recordingTime,
    pendingTranscriptions,
    startRecording,
    stopRecording,
    getCombinedTranscription,
    clearSnippets,
    playSnippet
  } = useAudioRecording({
    onTranscription: (text, snippetId) => {
      console.log('New transcription:', text, 'for snippet:', snippetId);
    }
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        const finalTranscription = await stopRecording();
        if (finalTranscription && onTranscriptionComplete) {
          onTranscriptionComplete(finalTranscription);
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      try {
        await startRecording();
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && onTextSubmit) {
      onTextSubmit(textInput.trim());
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isMinimized) {
    return (
      <Card className={`fixed top-4 right-4 w-16 h-16 z-50 ${className}`}>
        <CardContent className="p-0 h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="w-full h-full"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`fixed top-4 right-4 w-80 max-h-[80vh] z-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Audio Recording
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingTranscriptions > 0 && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {pendingTranscriptions}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleToggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            className="flex-1"
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>
          
          {audioSnippets.length > 0 && (
            <Button
              onClick={clearSnippets}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-medium">Recording...</span>
            </div>
            <span className="text-muted-foreground">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Text Input */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add notes or type message..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!textInput.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Audio Snippets List */}
        {audioSnippets.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Audio Snippets ({audioSnippets.length})
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-2">
                {audioSnippets.map((snippet) => (
                  <AudioSnippetItem
                    key={snippet.id}
                    snippet={snippet}
                    onPlay={() => playSnippet(snippet.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Combined Transcription Preview */}
        {audioSnippets.some(s => s.transcription) && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Combined Transcription
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm max-h-24 overflow-y-auto">
              {getCombinedTranscription() || 'Processing...'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface AudioSnippetItemProps {
  snippet: AudioSnippet;
  onPlay: () => void;
}

const AudioSnippetItem: React.FC<AudioSnippetItemProps> = ({ snippet, onPlay }) => {
  return (
    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
      <Button
        onClick={onPlay}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        <Play className="w-3 h-3" />
      </Button>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {formatTimestamp(snippet.timestamp)}
          </span>
          <span className="text-xs text-muted-foreground">
            {snippet.duration}s
          </span>
        </div>
        
        <div className="text-xs">
          {snippet.isTranscribing ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Transcribing...
            </div>
          ) : snippet.transcription ? (
            <div className="text-foreground italic">
              "{snippet.transcription}"
            </div>
          ) : (
            <div className="text-muted-foreground">
              No transcription
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
};