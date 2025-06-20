
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, PlaySquare, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ControlsPanelProps {
  transcription: string;
  setTranscription: Dispatch<SetStateAction<string>>;
  isRecording: boolean;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  onAudioTranscription: (audioDataUri: string) => Promise<any>; 
  onStartAnalysisFromText: (transcription: string) => Promise<any>; 
  onResetSession: () => void;
  isAnyAIProcessRunning: boolean;
  currentLoadingStateForControls: string | null;
  canStartNewCycle: boolean;
  sessionCyclesLength: number;
  maxCycles: number;
}

export function ControlsPanel({
  transcription,
  setTranscription,
  isRecording,
  setIsRecording,
  onAudioTranscription,
  onStartAnalysisFromText, 
  onResetSession,
  isAnyAIProcessRunning,
  currentLoadingStateForControls,
  canStartNewCycle,
  sessionCyclesLength,
  maxCycles,
}: ControlsPanelProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const hasTextContentForAnalysis = transcription.trim().length > 0 && 
                                   !isRecording && 
                                   !currentLoadingStateForControls?.includes("Optager lyd") &&
                                   transcription !== "Optager lyd... Klik igen for at stoppe og starte AI-analyse.";


  const handlePrimaryAction = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop(); 
      }
      setIsRecording(false); 
    } else if (hasTextContentForAnalysis && !isAnyAIProcessRunning) {
      if(!canStartNewCycle && !transcription.startsWith("Nye AI Indsigter:") && !transcription.startsWith("Ingen specifikke nye indsigter kunne udledes på grund af manglende input.")) { // Allow using insights even if max cycles reached for NEW audio/text
        toast({ title: "Max cyklusser nået", description: `Du kan ikke starte flere nye analysecyklusser. Nulstil sessionen for at starte forfra.`, variant: "default" });
        return;
      }
      await onStartAnalysisFromText(transcription);
    } else if (!hasTextContentForAnalysis && !isAnyAIProcessRunning) { 
      if (!canStartNewCycle) {
         toast({ title: "Max cyklusser nået", description: `Du kan ikke starte flere nye analysecyklusser via optagelse. Nulstil sessionen for at starte forfra.`, variant: "default" });
        return;
      }
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
          stream.getTracks().forEach(track => track.stop()); 
          
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

  let buttonText: string;
  let ButtonIconComponent: React.ElementType = Mic;
  let buttonVariant: "destructive" | "outline" | "default" = "outline";
  let iconAnimationClass = "";
  let primaryButtonDisabled = (isAnyAIProcessRunning && !isRecording);


  if (isRecording) {
    if (isAnyAIProcessRunning && currentLoadingStateForControls !== "Optager lyd...") {
      buttonText = "AI Bearbejder (Stop Optagelse)";
      ButtonIconComponent = Loader2;
      iconAnimationClass = "animate-spin";
    } else {
      buttonText = "Stop Optagelse & Start AI";
      ButtonIconComponent = Square;
      iconAnimationClass = currentLoadingStateForControls === "Optager lyd..." ? "animate-pulse" : "";
    }
    buttonVariant = "destructive";
    primaryButtonDisabled = false; 
  } else if (isAnyAIProcessRunning) {
    buttonText = currentLoadingStateForControls || "AI Bearbejder...";
    ButtonIconComponent = Loader2;
    iconAnimationClass = "animate-spin";
  } else if (hasTextContentForAnalysis) {
    buttonText = "Start AI Analyse med Tekst";
    ButtonIconComponent = PlaySquare; 
    buttonVariant = "default";
    if(!canStartNewCycle && !transcription.startsWith("Nye AI Indsigter:") && !transcription.startsWith("Ingen specifikke nye indsigter kunne udledes på grund af manglende input.")){ 
        primaryButtonDisabled = true;
        buttonText = `Max ${maxCycles} cyklusser nået`;
    }
  } else { 
    buttonText = "Start Lydoptagelse";
    ButtonIconComponent = Mic;
    buttonVariant = "outline";
    if(!canStartNewCycle){
        primaryButtonDisabled = true;
        buttonText = `Max ${maxCycles} cyklusser nået`;
    }
  }
  
  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-primary" /> 
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Start med lydoptagelse eller indtast tekst. AI&apos;en vil derefter automatisk analysere.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="transcription" className="text-sm font-medium">Samtale (Optag, Rediger, eller Indsæt Tekst)</Label>
              <div className="flex flex-col sm:flex-row gap-2 mb-2 items-center sm:justify-between">
                <Button 
                  onClick={handlePrimaryAction} 
                  variant={buttonVariant}
                  size="lg" 
                  className="w-full sm:w-auto sm:flex-grow-[2] order-1 sm:order-1"
                  aria-label={buttonText}
                  disabled={primaryButtonDisabled}
                >
                  <ButtonIconComponent className={`mr-2 h-5 w-5 ${iconAnimationClass}`} />
                  {buttonText}
                </Button>
                <div className="w-full sm:w-auto flex flex-row items-center gap-2 order-2 sm:order-2 sm:ml-auto">
                  <span className="text-sm font-medium bg-white text-black px-3 py-1 h-11 flex items-center justify-center rounded-md whitespace-nowrap">
                    {sessionCyclesLength} / {maxCycles} cyklusser
                  </span>
                  <Button
                    onClick={onResetSession}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto flex-grow sm:flex-grow-0"
                    aria-label="Nulstil Session"
                    disabled={isAnyAIProcessRunning || isRecording}
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Nulstil Session
                  </Button>
                </div>
              </div>
              <Textarea
                id="transcription"
                placeholder={
                  isRecording ? "Lytter... (optagelse aktiv)" : 
                  currentLoadingStateForControls && !isRecording ? `${currentLoadingStateForControls}... vent venligst.` :
                  !canStartNewCycle && !hasTextContentForAnalysis && !isRecording ? `Maksimalt antal (${maxCycles}) nye analysecyklusser er nået. Nulstil sessionen for at starte forfra.` :
                  "Start optagelse, skriv/indsæt samtaletransskription her, eller brug genererede indsigter..."
                }
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                className="min-h-[200px] resize-none text-base" 
                aria-label="Transskriptionsinputområde"
                readOnly={isRecording || (isAnyAIProcessRunning && !isRecording) || (!canStartNewCycle && !hasTextContentForAnalysis && !isRecording)}
                disabled={isRecording || (isAnyAIProcessRunning && !isRecording) || (!canStartNewCycle && !hasTextContentForAnalysis && !isRecording)}
              />
              {currentLoadingStateForControls && !isRecording && (
                <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentLoadingStateForControls}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
