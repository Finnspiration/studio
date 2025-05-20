
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ControlsPanelProps {
  transcription: string;
  setTranscription: Dispatch<SetStateAction<string>>;
  summary: string;
  isRecording: boolean;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  onAudioTranscription: (audioDataUri: string) => Promise<void>;
  isTranscribing: boolean;
  isSummarizing: boolean;
  isGeneratingIdeas: boolean;
  isGeneratingImage: boolean;
  currentLoadingStateForControls: string | null; // Renamed for clarity
}

export function ControlsPanel({
  transcription,
  setTranscription,
  summary,
  isRecording,
  setIsRecording,
  onAudioTranscription,
  isTranscribing,
  isSummarizing,
  isGeneratingIdeas,
  isGeneratingImage,
  currentLoadingStateForControls,
}: ControlsPanelProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const handleRecordToggle = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Standard webm for broader compatibility
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          stream.getTracks().forEach(track => track.stop()); // Vigtigt at stoppe stream for at frigive mikrofon
          
          toast({ title: "Optagelse Færdig", description: "Starter automatisk AI-behandling..." });
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await onAudioTranscription(base64Audio);
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setTranscription("Optager lyd... Klik igen for at stoppe og starte AI-analyse."); 
      } catch (error) {
        console.error("Fejl ved adgang til mikrofon:", error);
        toast({ title: "Fejl", description: "Kunne ikke starte optagelse. Tjek mikrofontilladelser.", variant: "destructive" });
        setIsRecording(false);
      }
    }
  };

  const isAnyAIProcessRunning = isTranscribing || isSummarizing || isGeneratingIdeas || isGeneratingImage;
  const recordButtonDisabled = (isAnyAIProcessRunning && !isRecording) || (isRecording && isAnyAIProcessRunning);


  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Start med at optage lyd. AI'en vil derefter automatisk transskribere, opsummere, generere whiteboard-idéer og et billede.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="transcription" className="text-sm font-medium">Samtale (Optag eller Rediger Manuelt)</Label>
          <div className="flex gap-2 mb-2">
            <Button 
              onClick={handleRecordToggle} 
              variant={isRecording ? "destructive" : "outline"}
              size="lg" 
              className="w-full"
              aria-label={isRecording ? "Stop Optagelse & Start Analyse" : "Start Lydoptagelse"}
              disabled={recordButtonDisabled}
            >
              {isRecording && !isAnyAIProcessRunning ? <Square className="mr-2 h-5 w-5 animate-pulse" /> : null}
              {isRecording && isAnyAIProcessRunning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {!isRecording ? <Mic className="mr-2 h-5 w-5" /> : null}
              {isRecording ? (isAnyAIProcessRunning ? 'AI Bearbejder...' : 'Stop Optagelse & Start AI') : 'Start Lydoptagelse'}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder={
              isRecording ? "Lytter... (optagelse aktiv)" : 
              currentLoadingStateForControls ? `${currentLoadingStateForControls}... vent venligst.` :
              "Start optagelse, eller skriv/indsæt samtaletransskription her og rediger efter behov..."
            }
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            className="min-h-[150px] resize-none text-base"
            aria-label="Transskriptionsinputområde"
            readOnly={isRecording || isAnyAIProcessRunning}
            disabled={isRecording || isAnyAIProcessRunning}
          />
           {currentLoadingStateForControls && !isRecording && ( // Vis kun global loading state hvis ikke aktivt i optagelse
            <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {currentLoadingStateForControls}
            </div>
          )}
        </div>

        {summary && !isSummarizing && !isGeneratingIdeas && !isGeneratingImage && (
          <div className="space-y-2">
            <Label className="text-sm font-medium mt-2 block">AI Resumé & Nøgletemaer</Label>
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {summary}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
