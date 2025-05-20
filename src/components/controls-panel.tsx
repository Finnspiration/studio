
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, BookText, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';
import type { TranscribeAudioInput } from '@/ai/flows/transcribe-audio-flow';

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
  imagePrompt: string;
  setImagePrompt: Dispatch<SetStateAction<string>>;
  onGenerateImage: () => Promise<void>;
  isGeneratingImage: boolean;
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
  imagePrompt,
  setImagePrompt,
  onGenerateImage,
  isGeneratingImage,
}: ControlsPanelProps) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

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
          
          toast({ title: "Succes", description: "Lydoptagelse afsluttet. Starter transskription..." });
          setIsTranscribing(true);
          setTranscription("Behandler lydoptagelse for transskription...");

          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              const input: TranscribeAudioInput = { audioDataUri: base64Audio };
              const result = await transcribeAudio(input);
              setTranscription(result.transcription);
              toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
            };
          } catch (error) {
            console.error("Fejl under (simuleret) transskription:", error);
            toast({ title: "Fejl", description: "Kunne ikke transskribere lyden (simuleret). Prøv at indtaste manuelt.", variant: "destructive" });
            setTranscription("");
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setTranscription("Optager lyd..."); 
      } catch (error) {
        console.error("Fejl ved adgang til mikrofon:", error);
        toast({ title: "Fejl", description: "Kunne ikke starte optagelse. Tjek mikrofontilladelser.", variant: "destructive" });
        setIsRecording(false);
      }
    }
  };

  const isBusy = isRecording || isTranscribing || isSummarizing || isGeneratingIdeas || isGeneratingImage;

  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Kontrol & Analyse
        </CardTitle>
        <CardDescription>
          Optag lyd, transskriber (simuleret), opsummer, generer idéer og billeder.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Lydoptagelse & Transskriptionssektion */}
        <div className="space-y-2">
          <Label htmlFor="transcription" className="text-sm font-medium">Samtale Transskription</Label>
          <div className="flex gap-2 mb-2">
            <Button 
              onClick={handleRecordToggle} 
              variant="outline" 
              size="sm" 
              aria-label={isRecording ? "Stop Optagelse" : "Start Optagelse"}
              disabled={isBusy && !isRecording} // Allow stopping recording even if busy
            >
              {isRecording ? <Square className="mr-2 h-4 w-4 animate-pulse text-red-500" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stopper Optagelse...' : 'Start Optagelse'}
            </Button>
          </div>
          <Textarea
            id="transcription"
            placeholder={
              isRecording ? "Lytter... (optagelse aktiv)" : 
              isTranscribing ? "Transskriberer lyd... vent venligst." :
              "Start optagelse eller skriv/indsæt samtaletransskription her..."
            }
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            className="min-h-[100px] resize-none text-base"
            aria-label="Transskriptionsinputområde"
            readOnly={isRecording || isTranscribing}
            disabled={isBusy && !isRecording && !isTranscribing}
          />
           {isTranscribing && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Transskriberer...
            </div>
          )}
        </div>

        {/* AI Opsummeringssektion */}
        <div className="space-y-2">
          <Button 
            onClick={onSummarize} 
            disabled={isBusy || !transcription.trim()} 
            className="w-full sm:w-auto" 
            aria-label="Opsummer Transskription"
          >
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
            disabled={isBusy}
          />
          <Button 
            onClick={onGenerateIdeas} 
            disabled={isBusy || !voicePrompt.trim() || !summary.trim()} 
            className="w-full sm:w-auto" 
            aria-label="Generer Whiteboard-idéer"
          >
            {isGeneratingIdeas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generer Whiteboard-idéer
          </Button>
        </div>

        {/* Billedgenereringssektion */}
        <div className="space-y-2">
          <Label htmlFor="imagePrompt" className="text-sm font-medium">Prompt til Billedgenerering</Label>
          <Input
            id="imagePrompt"
            placeholder="Beskriv det billede, du vil generere (f.eks. 'En glad kat på en grøn mark')"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            className="text-base"
            aria-label="Prompt til billedgenerering"
            disabled={isBusy}
          />
          <Button 
            onClick={onGenerateImage} 
            disabled={isBusy || !imagePrompt.trim()} 
            className="w-full sm:w-auto" 
            aria-label="Generer Billede"
          >
            {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
            Generer Billede
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
