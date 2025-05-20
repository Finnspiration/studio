
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, BookText, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleRecordToggle = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // For nu gør vi ikke noget aktivt med audioBlob, men den er optaget.
          // I en fremtidig version kunne den sendes til en tale-til-tekst service.
          console.log("Optaget audio blob:", audioBlob);
          audioChunksRef.current = [];
          setTranscription(""); // Ryd "Optager lyd..." og gør klar til manuel indtastning
          toast({ title: "Succes", description: "Lydoptagelse afsluttet." });
          // Stop alle spor for at frigive mikrofonen
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setTranscription("Optager lyd..."); // Indikerer optagelse i tekstfeltet
      } catch (error) {
        console.error("Fejl ved adgang til mikrofon:", error);
        toast({ title: "Fejl", description: "Kunne ikke starte optagelse. Tjek mikrofontilladelser.", variant: "destructive" });
        setIsRecording(false);
      }
    }
  };

  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Optag lyd, transskriber (manuelt), opsummer og forbedr whiteboard-indhold.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Lydoptagelse & Transskriptionssektion */}
        <div className="space-y-2">
          <Label htmlFor="transcription" className="text-sm font-medium">Samtale Transskription</Label>
          <div className="flex gap-2 mb-2">
            <Button onClick={handleRecordToggle} variant="outline" size="sm" aria-label={isRecording ? "Stop Optagelse" : "Start Optagelse"}>
              {isRecording ? <Square className="mr-2 h-4 w-4 animate-pulse text-red-500" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stopper Optagelse...' : 'Start Optagelse'}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder={isRecording ? "Lytter... (optagelse aktiv)" : "Start optagelse eller skriv/indsæt samtaletransskription her..."}
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            className="min-h-[100px] resize-none text-base"
            aria-label="Transskriptionsinputområde"
            readOnly={isRecording}
          />
        </div>

        {/* AI Opsummeringssektion */}
        <div className="space-y-2">
          <Button onClick={onSummarize} disabled={isSummarizing || !transcription.trim() || isRecording} className="w-full sm:w-auto" aria-label="Opsummer Transskription">
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
            disabled={isRecording}
          />
          <Button onClick={onGenerateIdeas} disabled={isGeneratingIdeas || !voicePrompt.trim() || !summary.trim() || isRecording} className="w-full sm:w-auto" aria-label="Generer Whiteboard-idéer">
            {isGeneratingIdeas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generer Whiteboard-idéer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
