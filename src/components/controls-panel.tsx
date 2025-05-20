
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, Sparkles, MessageSquarePlus, PlaySquare } from 'lucide-react'; // Added PlaySquare
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";


interface ControlsPanelProps {
  transcription: string;
  setTranscription: Dispatch<SetStateAction<string>>;
  summary: string;
  isRecording: boolean;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  onAudioTranscription: (audioDataUri: string) => Promise<void>;
  onStartAnalysisFromText: (transcription: string) => Promise<void>; // Ny prop
  isTranscribing: boolean;
  isSummarizing: boolean;
  isGeneratingIdeas: boolean;
  isGeneratingImage: boolean;
  currentLoadingStateForControls: string | null;
  newInsights: string;
  isGeneratingInsights: boolean;
  onUseInsights: (insights: string) => void;
}

export function ControlsPanel({
  transcription,
  setTranscription,
  summary,
  isRecording,
  setIsRecording,
  onAudioTranscription,
  onStartAnalysisFromText, // Ny prop
  isTranscribing,
  isSummarizing,
  isGeneratingIdeas,
  isGeneratingImage,
  currentLoadingStateForControls,
  newInsights,
  isGeneratingInsights,
  onUseInsights,
}: ControlsPanelProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const isAnyAIProcessRunning = isTranscribing || isSummarizing || isGeneratingIdeas || isGeneratingImage || isGeneratingInsights;
  const hasTextContent = transcription.trim().length > 0;

  const handlePrimaryAction = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop(); // onstop vil håndtere onAudioTranscription
      }
      setIsRecording(false);
    } else if (hasTextContent && !isAnyAIProcessRunning) {
      await onStartAnalysisFromText(transcription);
    } else if (!hasTextContent && !isAnyAIProcessRunning) {
      // Start lydoptagelse
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          stream.getTracks().forEach(track => track.stop()); // Stop mikrofon stream
          
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

  // Bestem knappens udseende og funktionalitet
  let buttonText: string;
  let ButtonIconComponent: React.ElementType = Mic;
  let buttonVariant: "destructive" | "outline" | "default" = "outline";

  if (isRecording) {
    if (isAnyAIProcessRunning && currentLoadingStateForControls !== "Optager lyd...") {
      buttonText = "AI Bearbejder (Stop Optagelse)";
      ButtonIconComponent = Loader2;
    } else {
      buttonText = "Stop Optagelse & Start AI";
      ButtonIconComponent = Square;
    }
    buttonVariant = "destructive";
  } else if (isAnyAIProcessRunning) {
    buttonText = currentLoadingStateForControls || "AI Bearbejder...";
    ButtonIconComponent = Loader2;
  } else if (hasTextContent) {
    buttonText = "Start AI Analyse med Tekst";
    ButtonIconComponent = PlaySquare; 
    buttonVariant = "default";
  } else {
    buttonText = "Start Lydoptagelse";
    ButtonIconComponent = Mic;
    buttonVariant = "outline";
  }

  const primaryButtonDisabled = isAnyAIProcessRunning && !isRecording;

  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Start med lydoptagelse eller indtast tekst. AI'en vil derefter automatisk analysere, generere idéer, billede og indsigter.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6">
        <ScrollArea className="h-[calc(100%-2rem)] pr-3">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="transcription" className="text-sm font-medium">Samtale (Optag, Rediger, eller Indsæt Tekst)</Label>
              <div className="flex gap-2 mb-2">
                <Button 
                  onClick={handlePrimaryAction} 
                  variant={buttonVariant}
                  size="lg" 
                  className="w-full"
                  aria-label={buttonText}
                  disabled={primaryButtonDisabled}
                >
                  <ButtonIconComponent className={`mr-2 h-5 w-5 ${isAnyAIProcessRunning || (isRecording && currentLoadingStateForControls !== "Optager lyd...") ? 'animate-spin' : isRecording ? 'animate-pulse' : ''}`} />
                  {buttonText}
                </Button>
              </div>
              <Textarea
                id="transcription"
                placeholder={
                  isRecording ? "Lytter... (optagelse aktiv)" : 
                  currentLoadingStateForControls && !isRecording ? `${currentLoadingStateForControls}... vent venligst.` :
                  "Start optagelse, skriv/indsæt samtaletransskription her, eller brug genererede indsigter..."
                }
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                className="min-h-[120px] resize-none text-base"
                aria-label="Transskriptionsinputområde"
                readOnly={isRecording || (isAnyAIProcessRunning && !isRecording)}
                disabled={isRecording || (isAnyAIProcessRunning && !isRecording)}
              />
              {currentLoadingStateForControls && !isRecording && (
                <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentLoadingStateForControls}
                </div>
              )}
            </div>

            {summary && !isSummarizing && !isGeneratingIdeas && !isGeneratingImage && !isGeneratingInsights && (
              <div className="space-y-2">
                <Label className="text-sm font-medium mt-2 block">AI Resumé & Nøgletemaer</Label>
                <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {summary}
                </div>
              </div>
            )}

            { (newInsights || isGeneratingInsights) && (
              <div className="space-y-2">
                <Label htmlFor="newInsights" className="text-sm font-medium flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Nye AI Indsigter (fra billede & samtale)
                </Label>
                {isGeneratingInsights ? (
                  <div className="flex items-center text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Genererer nye indsigter...
                  </div>
                ) : newInsights ? (
                  <>
                    <div 
                      id="newInsights"
                      className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
                    >
                      {newInsights}
                    </div>
                    <Button 
                      onClick={() => onUseInsights(newInsights)} 
                      variant="outline" 
                      className="w-full"
                      disabled={isAnyAIProcessRunning || isRecording}
                    >
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Brug Indsigter til Ny Samtale
                    </Button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

    