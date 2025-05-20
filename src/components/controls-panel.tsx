"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, BookText, Sparkles, Loader2 } from 'lucide-react';

interface ControlsPanelProps {
  transcription: string;
  setTranscription: Dispatch<SetStateAction<string>>;
  summary: string;
  voicePrompt: string;
  setVoicePrompt: Dispatch<SetStateAction<string>>;
  isRecording: boolean;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  isSummarizing: boolean;
  isGeneratingIdeas: boolean;
  onSummarize: () => Promise<void>;
  onGenerateIdeas: () => Promise<void>;
}

export function ControlsPanel({
  transcription,
  setTranscription,
  summary,
  voicePrompt,
  setVoicePrompt,
  isRecording,
  setIsRecording,
  isSummarizing,
  isGeneratingIdeas,
  onSummarize,
  onGenerateIdeas,
}: ControlsPanelProps) {

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    // In a real app, you'd start/stop actual audio recording here.
    // For now, we just toggle state and allow typing in transcription.
    if (!isRecording) {
      // Simulating start of recording, maybe clear transcription or set placeholder
      // setTranscription("Recording started... speak now."); 
    } else {
      // Simulating stop of recording
      // if (transcription === "Recording started... speak now.") setTranscription("");
    }
  };

  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Controls & Analysis
        </CardTitle>
        <CardDescription>
          Record audio (simulated), transcribe, summarize, and enhance whiteboard content.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Audio Recording & Transcription Section */}
        <div className="space-y-2">
          <Label htmlFor="transcription" className="text-sm font-medium">Conversation Transcription (Simulated Audio Input)</Label>
          <div className="flex gap-2 mb-2">
            <Button onClick={handleRecordToggle} variant="outline" size="sm" aria-label={isRecording ? "Stop Recording" : "Start Recording"}>
              {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder={isRecording ? "Listening... (type your simulated conversation here)" : "Type or paste conversation transcript here..."}
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            className="min-h-[100px] resize-none text-base"
            aria-label="Transcription input area"
            readOnly={isRecording && false} // Allow typing even when "recording" for simulation
          />
        </div>

        {/* AI Summarization Section */}
        <div className="space-y-2">
          <Button onClick={onSummarize} disabled={isSummarizing || !transcription.trim()} className="w-full sm:w-auto" aria-label="Summarize Transcription">
            {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookText className="mr-2 h-4 w-4" />}
            Summarize Transcription
          </Button>
          {summary && (
            <div>
              <Label className="text-sm font-medium mt-2 block">Summary & Key Themes</Label>
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {summary}
              </div>
            </div>
          )}
        </div>
        
        {/* AI-Enhanced Whiteboard Section */}
        <div className="space-y-2">
          <Label htmlFor="voicePrompt" className="text-sm font-medium">Voice Prompt for Whiteboard Ideas</Label>
          <Textarea
            id="voicePrompt"
            placeholder="Enter a prompt to generate or refine whiteboard content (e.g., 'Expand on the marketing strategy')"
            value={voicePrompt}
            onChange={(e) => setVoicePrompt(e.target.value)}
            className="min-h-[80px] resize-none text-base"
            aria-label="Voice prompt for whiteboard ideas"
          />
          <Button onClick={onGenerateIdeas} disabled={isGeneratingIdeas || !voicePrompt.trim() || !summary.trim()} className="w-full sm:w-auto" aria-label="Generate Whiteboard Ideas">
            {isGeneratingIdeas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Whiteboard Ideas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
