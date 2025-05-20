
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input"; // Fjernet da billedprompt ikke længere manuelt indtastes her
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, Info } from 'lucide-react'; // Image-ikon fjernet for nu
import { useToast } from "@/hooks/use-toast";
// TranscribeAudio flow importeres ikke her, da det kaldes fra page.tsx

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
  isGeneratingImage: boolean; // Bruges til at deaktivere record knap
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
}: ControlsPanelProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Viser en samlet status for AI processer
  const [currentProcessMessage, setCurrentProcessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isTranscribing) {
      setCurrentProcessMessage("Transskriberer optagelse...");
    } else if (isSummarizing) {
      setCurrentProcessMessage("Opsummerer transskription...");
    } else if (isGeneratingIdeas) {
      setCurrentProcessMessage("Genererer whiteboard idéer...");
    } else if (isGeneratingImage) {
      setCurrentProcessMessage("Genererer billede..."); // Selvom UI for dette er skjult
    }
     else {
      setCurrentProcessMessage(null);
    }
  }, [isTranscribing, isSummarizing, isGeneratingIdeas, isGeneratingImage]);


  const handleRecordToggle = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
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
            await onAudioTranscription(base64Audio); // Kald prop for at starte transskription og resten af kæden
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
  // Knappen deaktiveres hvis en AI proces kører, UNDTAGEN hvis det er selve optagelsen der er i gang (så man kan stoppe den).
  const recordButtonDisabled = isAnyAIProcessRunning && !isRecording;


  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Start med at optage lyd. AI'en vil derefter automatisk transskribere, opsummere og generere whiteboard-idéer.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Lydoptagelse & Transskriptionssektion */}
        <div className="space-y-2">
          <Label htmlFor="transcription" className="text-sm font-medium">Samtale (Optag eller Indtast Manuelt)</Label>
          <div className="flex gap-2 mb-2">
            <Button 
              onClick={handleRecordToggle} 
              variant={isRecording ? "destructive" : "outline"}
              size="lg" 
              className="w-full"
              aria-label={isRecording ? "Stop Optagelse & Start Analyse" : "Start Lydoptagelse"}
              disabled={recordButtonDisabled}
            >
              {isRecording ? <Square className="mr-2 h-5 w-5 animate-pulse" /> : <Mic className="mr-2 h-5 w-5" />}
              {isRecording ? 'Stop Optagelse & Start AI' : 'Start Lydoptagelse'}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder={
              isRecording ? "Lytter... (optagelse aktiv)" : 
              isTranscribing ? "Transskriberer lyd... vent venligst." :
              "Start optagelse, eller skriv/indsæt samtaletransskription her og rediger efter behov..."
            }
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)} // Tillad stadig manuel redigering
            className="min-h-[150px] resize-none text-base"
            aria-label="Transskriptionsinputområde"
            readOnly={isRecording || isAnyAIProcessRunning} // Skrivebeskyttet under optagelse og AI processer
            disabled={isRecording || isAnyAIProcessRunning}
          />
           {currentProcessMessage && (
            <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {currentProcessMessage}
            </div>
          )}
        </div>

        {/* Opsummeringssektion (vises kun, ingen knap) */}
        {summary && !isSummarizing && ( // Vis kun hvis der er et summary og vi ikke aktivt opsummerer
          <div className="space-y-2">
            <Label className="text-sm font-medium mt-2 block">AI Resumé & Nøgletemaer</Label>
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {summary}
            </div>
          </div>
        )}
        
        {/* Ingen manuel knap til idégenerering eller billedgenerering */}
        {/* Billedgenereringssektion er fjernet fra UI for nu, da prompten skal automatiseres */}

      </CardContent>
    </Card>
  );
}

    