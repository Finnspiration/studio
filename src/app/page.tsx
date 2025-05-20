
"use client";

import { useState } from 'react';
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

export default function SynapseScribblePage() {
  const [whiteboardContent, setWhiteboardContent] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [identifiedThemes, setIdentifiedThemes] = useState<string>("");
  const [voicePrompt, setVoicePrompt] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState<boolean>(false);
  
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!transcription.trim()) {
      toast({ title: "Fejl", description: "Transskription er tom. Indtast venligst tekst eller optag lyd først.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      const input: SummarizeTranscriptionInput = { transcription };
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
      } else {
        console.error("Opsummeringsfejl: Intet gyldigt resumé modtaget fra AI.", result);
        toast({ title: "Fejl", description: "Intet gyldigt resumé modtaget fra AI. Prøv venligst igen.", variant: "destructive" });
        setSummary("");
        setIdentifiedThemes("");
      }
    } catch (error) {
      console.error("Opsummeringsfejl (catch block):", error);
      const errorMessage = error instanceof Error ? error.message : "En ukendt fejl opstod under opsummering.";
      toast({ 
        title: "Fejl ved opsummering", 
        description: `Kunne ikke opsummere transskription: ${errorMessage}`, 
        variant: "destructive" 
      });
      setSummary("");
      setIdentifiedThemes("");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!voicePrompt.trim()) {
      toast({ title: "Fejl", description: "Stemmebesked er tom.", variant: "destructive" });
      return;
    }
    if (!summary.trim()) { 
        toast({ title: "Fejl", description: "Opsummer venligst transskription først for at identificere temaer.", variant: "destructive" });
        return;
    }
    setIsGeneratingIdeas(true);
    try {
      const input: GenerateWhiteboardIdeasInput = {
        voicePrompt,
        identifiedThemes: identifiedThemes || summary, 
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

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({ title: "Fejl", description: "Billedprompt er tom.", variant: "destructive" });
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageDataUri(null); // Ryd tidligere billede
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
          />
        </div>
        <div className="md:w-1/2 lg:w-2/5 h-full flex flex-col">
          <ControlsPanel
            transcription={transcription}
            setTranscription={setTranscription}
            summary={summary}
            voicePrompt={voicePrompt}
            setVoicePrompt={setVoicePrompt}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            isSummarizing={isSummarizing}
            isGeneratingIdeas={isGeneratingIdeas}
            onSummarize={handleSummarize}
            onGenerateIdeas={handleGenerateIdeas}
            imagePrompt={imagePrompt}
            setImagePrompt={setImagePrompt}
            onGenerateImage={handleGenerateImage}
            isGeneratingImage={isGeneratingImage}
          />
        </div>
      </main>
    </div>
  );
}
