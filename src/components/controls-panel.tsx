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
    // I en rigtig app ville du starte/stoppe faktisk lydoptagelse her.
    // For nu skifter vi bare tilstand og tillader indtastning i transskription.
    if (!isRecording) {
      // Simulerer start af optagelse, ryd måske transskription eller sæt pladsholder
      // setTranscription("Optagelse startet... tal nu."); 
    } else {
      // Simulerer stop af optagelse
      // if (transcription === "Optagelse startet... tal nu.") setTranscription("");
    }
  };

  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Optag lyd (simuleret), transskriber, opsummer og forbedr whiteboard-indhold.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Lydoptagelse & Transskriptionssektion */}
        <div className="space-y-2">
          <Label htmlFor="transcription" className="text-sm font-medium">Samtale Transskription (Simuleret Lydinput)</Label>
          <div className="flex gap-2 mb-2">
            <Button onClick={handleRecordToggle} variant="outline" size="sm" aria-label={isRecording ? "Stop Optagelse" : "Start Optagelse"}>
              {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stop Optagelse' : 'Start Optagelse'}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder={isRecording ? "Lytter... (skriv din simulerede samtale her)" : "Skriv eller indsæt samtaletransskription her..."}
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            className="min-h-[100px] resize-none text-base"
            aria-label="Transskriptionsinputområde"
            readOnly={isRecording && false} // Tillad indtastning selv under "optagelse" for simulering
          />
        </div>

        {/* AI Opsummeringssektion */}
        <div className="space-y-2">
          <Button onClick={onSummarize} disabled={isSummarizing || !transcription.trim()} className="w-full sm:w-auto" aria-label="Opsummer Transskription">
            {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookText className="mr-2 h-4 w-4" />}
            Opsummer Transskription
          </Button>
          {summary && (
            <div>
              <Label className="text-sm font-medium mt-2 block">Resumé & Nøgletemaer</Label>
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {summary}
              </div>
            </div>
          )}
        </div>
        
        {/* AI-Forbedret Whiteboardsektion */}
        <div className="space-y-2">
          <Label htmlFor="voicePrompt" className="text-sm font-medium">Stemmebesked til Whiteboard-idéer</Label>
          <Textarea
            id="voicePrompt"
            placeholder="Indtast en besked for at generere eller forfine whiteboard-indhold (f.eks. 'Uddyb marketingstrategien')"
            value={voicePrompt}
            onChange={(e) => setVoicePrompt(e.target.value)}
            className="min-h-[80px] resize-none text-base"
            aria-label="Stemmebesked til whiteboard-idéer"
          />
          <Button onClick={onGenerateIdeas} disabled={isGeneratingIdeas || !voicePrompt.trim() || !summary.trim()} className="w-full sm:w-auto" aria-label="Generer Whiteboard-idéer">
            {isGeneratingIdeas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generer Whiteboard-idéer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
