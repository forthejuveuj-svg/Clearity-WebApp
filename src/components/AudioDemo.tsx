import React, { useState } from 'react';
import { AudioPanel } from './AudioPanel';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export const AudioDemo: React.FC = () => {
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const handleTranscriptionComplete = (transcription: string) => {
    setMessages(prev => [...prev, `🎤 Audio: ${transcription}`]);
  };

  const handleTextSubmit = (text: string) => {
    setMessages(prev => [...prev, `💬 Text: ${text}`]);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Audio Streaming Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowAudioPanel(!showAudioPanel)}
              variant={showAudioPanel ? "destructive" : "default"}
            >
              {showAudioPanel ? 'Hide Audio Panel' : 'Show Audio Panel'}
            </Button>
            
            <div className="space-y-2">
              <h3 className="text-white font-medium">Messages:</h3>
              <div className="bg-gray-800 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-400 italic">No messages yet. Try recording some audio or typing text!</p>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className="text-white text-sm mb-2 p-2 bg-gray-700 rounded">
                      {message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showAudioPanel && (
        <AudioPanel
          onTranscriptionComplete={handleTranscriptionComplete}
          onTextSubmit={handleTextSubmit}
        />
      )}
    </div>
  );
};