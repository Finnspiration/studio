
"use client";

import { useEffect, useState } from 'react';
import { AppHeader } from "@/components/app-header";
import { WhiteboardPanel } from "@/components/whiteboard-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { useToast } from "@/hooks/use-toast";
import { summarizeTranscription } from '@/ai/flows/summarize-transcription';
import type { SummarizeTranscriptionInput } from '@/ai/flows/summarize-transcription';
import { generateWhiteboardIdeas } from '@/ai/flows/generate-whiteboard-ideas';
import type { GenerateWhiteboardIdeasInput } from '@/ai/flows/generate-whiteboard-ideas';
import { generateImage } from '@/ai/flows/generate-image-flow';
import type { GenerateImageInput } from '@/ai/flows/generate-image-flow';
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';
import type { TranscribeAudioInput, TranscribeAudioOutput } from '@/ai/flows/transcribe-audio-flow';


export default function SynapseScribblePage() {
  const [whiteboardContent, setWhiteboardContent] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [identifiedThemes, setIdentifiedThemes] = useState<string>("");
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState<boolean>(false);
  
  const [imagePrompt, setImagePrompt] = useState<string>(""); // Beholder for nu, men UI for input fjernes
  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const { toast } = useToast();

  const handleAudioTranscription = async (audioDataUri: string) => {
    setIsTranscribing(true);
    setTranscription("Behandler lydoptagelse for transskription...");
    try {
      const input: TranscribeAudioInput = { audioDataUri };
      const result: TranscribeAudioOutput = await transcribeAudio(input);
      setTranscription(result.transcription);
      toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
      // Automatisk start opsummering
      await handleSummarize(result.transcription);
    } catch (error) {
      console.error("Fejl under (simuleret) transskription:", error);
      toast({ title: "Fejl", description: "Kunne ikke transskribere lyden (simuleret).", variant: "destructive" });
      setTranscription(""); // Nulstil hvis fejl
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSummarize = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke opsummere.", variant: "default" });
      return;
    }
    setIsSummarizing(true);
    setSummary(""); // Nulstil tidligere resumé
    setIdentifiedThemes(""); // Nulstil tidligere temaer
    try {
      const input: SummarizeTranscriptionInput = { transcription: currentTranscription };
      const result = await summarizeTranscription(input);

      if (result && typeof result.summary === 'string' && result.summary.trim() !== "") {
        setSummary(result.summary);
        const firstSentence = result.summary.split('. ')[0];
        let themes = "";
        if (firstSentence) {
          themes = firstSentence.split(',').slice(0, 5).map(t => t.trim()).filter(t => t).join(', ');
        }
        if (!themes) {
            themes = firstSentence || result.summary;
        }
        setIdentifiedThemes(themes);
        toast({ title: "Succes", description: "Transskription opsummeret." });
        // Automatisk start idégenerering
        await handleGenerateIdeas(currentTranscription, themes || result.summary);
      } else {
        console.error("Opsummeringsfejl: Intet gyldigt resumé modtaget fra AI.", result);
        toast({ title: "Fejl", description: "Intet gyldigt resumé modtaget fra AI. Prøv venligst igen.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Opsummeringsfejl (catch block):", error);
      const errorMessage = error instanceof Error ? error.message : "En ukendt fejl opstod under opsummering.";
      toast({ 
        title: "Fejl ved opsummering", 
        description: `Kunne ikke opsummere transskription: ${errorMessage}`, 
        variant: "destructive" 
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateIdeas = async (currentTranscription: string, currentThemes: string) => {
    if (!currentTranscription.trim()) {
      // Dette bør ikke ske hvis flowet følges, men som en sikkerhedsforanstaltning
      toast({ title: "Fejl", description: "Transskription er tom for idégenerering.", variant: "destructive" });
      return;
    }
    if (!currentThemes.trim()) { 
        toast({ title: "Info", description: "Ingen temaer identificeret. Bruger fuld transskription til idéer.", variant: "default" });
    }
    setIsGeneratingIdeas(true);
    try {
      const input: GenerateWhiteboardIdeasInput = {
        transcription: currentTranscription, // Bruger den fulde transskription
        identifiedThemes: currentThemes, 
        currentWhiteboardContent: whiteboardContent,
      };
      const result = await generateWhiteboardIdeas(input);
      setWhiteboardContent(result.refinedWhiteboardContent);
      toast({ title: "Succes", description: "Whiteboard-indhold opdateret med AI-idéer." });
    } catch (error) {
      console.error("Idégenereringsfejl:", error);
      const errorMessage = error instanceof Error ? error.message : "En ukendt fejl opstod.";
      toast({ 
        title: "Fejl ved idégenerering", 
        description: `Kunne ikke generere whiteboard-idéer: ${errorMessage}`, 
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  // Billedgenerering holdes separat for nu, da prompten ikke er automatiseret endnu
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) { // Bruger stadig imagePrompt state, men UI for input er fjernet
      toast({ title: "Fejl", description: "Billedprompt er tom. (Skal automatiseres)", variant: "destructive" });
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageDataUri(null);
    try {
      const input: GenerateImageInput = { prompt: imagePrompt };
      const result = await generateImage(input);
      setGeneratedImageDataUri(result.imageDataUri);
      toast({ title: "Succes", description: "Billede genereret." });
    } catch (error) {
      console.error("Billedgenereringsfejl:", error);
      const errorMessage = error instanceof Error ? error.message : "En ukendt fejl opstod.";
      toast({
        title: "Fejl ved billedgenerering",
        description: `Kunne ikke generere billede: ${errorMessage}`,
        variant: "destructive"
      });
      setGeneratedImageDataUri(null);
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  const currentLoadingState = () => {
    if (isRecording) return "Optager lyd...";
    if (isTranscribing) return "Transskriberer...";
    if (isSummarizing) return "Opsummerer...";
    if (isGeneratingIdeas) return "Genererer idéer...";
    if (isGeneratingImage) return "Genererer billede...";
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 container mx-auto overflow-hidden">
        <div className="md:w-1/2 lg:w-3/5 h-full flex flex-col">
          <WhiteboardPanel
            whiteboardContent={whiteboardContent}
            setWhiteboardContent={setWhiteboardContent}
            identifiedThemes={identifiedThemes}
            generatedImageDataUri={generatedImageDataUri}
            isGeneratingImage={isGeneratingImage}
            currentLoadingState={currentLoadingState()}
          />
        </div>
        <div className="md:w-1/2 lg:w-2/5 h-full flex flex-col">
          <ControlsPanel
            transcription={transcription}
            setTranscription={setTranscription} // Stadig nødvendig for manuel redigering hvis ønsket
            summary={summary}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onAudioTranscription={handleAudioTranscription}
            isTranscribing={isTranscribing}
            isSummarizing={isSummarizing}
            isGeneratingIdeas={isGeneratingIdeas}
            isGeneratingImage={isGeneratingImage} // Til at deaktivere knapper
            // Fjerner props for manuelle AI handlinger og prompts
            // onSummarize, onGenerateIdeas, imagePrompt, setImagePrompt, onGenerateImage
          />
        </div>
      </main>
    </div>
  );
}

    