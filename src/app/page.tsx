
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
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import type { GenerateInsightsInput } from '@/ai/flows/generate-insights-flow';


export default function SynapseScribblePage() {
  const [whiteboardContent, setWhiteboardContent] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [identifiedThemes, setIdentifiedThemes] = useState<string>("");
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState<boolean>(false);
  
  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const [newInsights, setNewInsights] = useState<string>("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);

  const { toast } = useToast();

  const resetAIOutputs = () => {
    setSummary("");
    setIdentifiedThemes("");
    setWhiteboardContent("");
    setGeneratedImageDataUri(null);
    setNewInsights("");
  };

  const handleAudioTranscription = async (audioDataUri: string) => {
    setIsTranscribing(true);
    setTranscription("Behandler lydoptagelse for transskription..."); // Initial placeholder
    resetAIOutputs(); 
    try {
      const input: TranscribeAudioInput = { audioDataUri };
      const result: TranscribeAudioOutput = await transcribeAudio(input);
      setTranscription(result.transcription); // Sæt den faktiske transskription
      toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
      await handleSummarize(result.transcription);
    } catch (error) {
      console.error("Fejl under (simuleret) transskription:", error);
      toast({ title: "Fejl", description: "Kunne ikke transskribere lyden (simuleret).", variant: "destructive" });
      setTranscription(""); // Ryd transskription ved fejl
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleStartAnalysisFromText = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke starte analyse.", variant: "default" });
      return;
    }
    // Nulstil tidligere AI resultater, før ny analyse starter
    resetAIOutputs(); 
    // Sikrer at transskriptionen er den brugeren ser, hvis de har redigeret den.
    setTranscription(currentTranscription); 
    toast({ title: "AI Analyse Startet", description: "Behandler den angivne tekst..." });
    await handleSummarize(currentTranscription);
  };

  const handleSummarize = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke opsummere.", variant: "default" });
      return;
    }
    setIsSummarizing(true);
    // Nulstil output fra tidligere kørsler, *undtagen* transskriptionen, hvis den er inputtet.
    // resetAIOutputs() er allerede kaldt hvis det er en ny cyklus. 
    // Her nulstiller vi specifikt det der kommer *efter* transskription.
    setSummary(""); 
    setIdentifiedThemes("");
    setWhiteboardContent("");
    setGeneratedImageDataUri(null);
    setNewInsights("");
    try {
      const input: SummarizeTranscriptionInput = { transcription: currentTranscription };
      const result = await summarizeTranscription(input);

      if (result && typeof result.summary === 'string' && result.summary.trim() !== "") {
        setSummary(result.summary);
        // Udled temaer fra resuméet
        const firstSentence = result.summary.split('. ')[0];
        let themes = "";
        if (firstSentence) {
          // Prøv at få fat i nøgleord, fjern småord og specialtegn
          themes = firstSentence.split(/[\s,]+/) 
            .map(t => t.replace(/[^\w\sæøåÆØÅ-]/gi, '').toLowerCase())
            .filter(t => t.length > 3 && !['det', 'er', 'en', 'og', 'den', 'til', 'som'].includes(t)) // Undgå meget generiske ord
            .slice(0, 5) // Tag max 5 temaer
            .join(', ');
        }
        if (!themes && result.summary.length > 0) { // Fallback hvis første sætning ikke gav gode temaer
            themes = result.summary.substring(0, Math.min(result.summary.length, 100)); // Tag op til 100 tegn af resuméet som temaer
        }
        setIdentifiedThemes(themes || "Generelle temaer");
        toast({ title: "Succes", description: "Transskription opsummeret." });
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
      toast({ title: "Fejl", description: "Transskription er tom for idégenerering.", variant: "destructive" });
      return;
    }
    if (!currentThemes.trim()) { 
        toast({ title: "Info", description: "Ingen temaer identificeret. Bruger fuld transskription til idéer.", variant: "default" });
    }
    setIsGeneratingIdeas(true);
    setWhiteboardContent(""); // Nulstil før generering
    setGeneratedImageDataUri(null);
    setNewInsights("");
    try {
      const input: GenerateWhiteboardIdeasInput = {
        transcription: currentTranscription,
        identifiedThemes: currentThemes, 
        currentWhiteboardContent: "", // Start altid med tomt whiteboard for nye idéer
      };
      const result = await generateWhiteboardIdeas(input);
      setWhiteboardContent(result.refinedWhiteboardContent);
      toast({ title: "Succes", description: "Whiteboard-indhold opdateret med AI-idéer." });
      
      // Forbered prompt til billedgenerering
      const imageGenPrompt = currentThemes.trim() || summary.substring(0, 150).trim() || "abstrakt visualisering af diskussion";
      await handleGenerateImage(imageGenPrompt, currentTranscription || summary);

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
  
  const handleGenerateImage = async (promptForImage: string, currentTranscriptionForInsights: string) => {
    if (!promptForImage.trim()) {
      toast({ title: "Info", description: "Ingen prompt til billedgenerering fundet. Skipper billedgenerering.", variant: "default" });
      // Selvom vi skipper billedgenerering, kan vi stadig forsøge at generere indsigter, hvis vi har transskriptionen.
      // Dog, flowet forventer imageDataUri. Vi kunne sende et tomt, eller simpelthen stoppe her.
      // For nu stopper vi, da indsigtsgenerering er tænkt at bygge på BÅDE billede OG tekst.
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageDataUri(null); // Nulstil før generering
    setNewInsights("");
    try {
      const styledPrompt = `En simpel whiteboard-tegning eller skitse der illustrerer: ${promptForImage}. Brug primært sort tusch på hvid baggrund, eventuelt med få accentfarver i blå eller grøn. Stilen skal være minimalistisk og ligne noget, der hurtigt er tegnet på et whiteboard under et møde.`;
      const input: GenerateImageInput = { prompt: styledPrompt };
      const result = await generateImage(input);
      setGeneratedImageDataUri(result.imageDataUri);
      toast({ title: "Succes", description: "Billede genereret." });
      // Kald generering af indsigter EFTER billedet er genereret
      await handleGenerateInsights(result.imageDataUri, currentTranscriptionForInsights);
    } catch (error) {
      console.error("Billedgenereringsfejl:", error);
      const errorMessage = error instanceof Error ? error.message : "En ukendt fejl opstod.";
      toast({
        title: "Fejl ved billedgenerering",
        description: `Kunne ikke generere billede: ${errorMessage}`,
        variant: "destructive"
      });
      setGeneratedImageDataUri(null); // Sørg for at rydde billedet ved fejl
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateInsights = async (imageDataUri: string, conversationContext: string) => {
    if (!imageDataUri || !conversationContext.trim()) {
      toast({ title: "Info", description: "Manglende billede eller samtale kontekst. Kan ikke generere indsigter.", variant: "default" });
      return;
    }
    setIsGeneratingInsights(true);
    setNewInsights(""); // Nulstil før generering
    try {
      const input: GenerateInsightsInput = { imageDataUri, conversationContext };
      const result = await generateInsights(input);
      setNewInsights(result.insightsText);
      toast({ title: "Succes", description: "Nye AI-indsigter genereret." });
    } catch (error) {
      console.error("Fejl ved generering af indsigter:", error);
      const errorMessage = error instanceof Error ? error.message : "En ukendt fejl opstod.";
      toast({
        title: "Fejl ved Indsigtsgenerering",
        description: `Kunne ikke generere nye indsigter: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Funktion til at bruge de genererede indsigter som ny transskription
  const handleUseInsights = (insights: string) => {
    setTranscription(insights); // Sæt indsigter som ny transskription
    resetAIOutputs(); // Nulstiller summary, themes, whiteboard, image, newInsights
    toast({ 
      title: "Ny Samtale Startet", 
      description: "Indsigter er indsat. Klik på 'Start AI Analyse med Tekst' for at behandle." 
    });
  };
  
  const currentLoadingState = () => {
    if (isRecording) return "Optager lyd...";
    if (isTranscribing) return "Transskriberer...";
    if (isSummarizing) return "Opsummerer...";
    if (isGeneratingIdeas) return "Genererer whiteboard-idéer...";
    if (isGeneratingImage) return "Genererer billede...";
    if (isGeneratingInsights) return "Genererer nye indsigter...";
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
            setTranscription={setTranscription}
            summary={summary}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onAudioTranscription={handleAudioTranscription}
            onStartAnalysisFromText={handleStartAnalysisFromText} // Ny prop
            isTranscribing={isTranscribing}
            isSummarizing={isSummarizing}
            isGeneratingIdeas={isGeneratingIdeas}
            isGeneratingImage={isGeneratingImage}
            currentLoadingStateForControls={currentLoadingState()}
            newInsights={newInsights}
            isGeneratingInsights={isGeneratingInsights}
            onUseInsights={handleUseInsights}
          />
        </div>
      </main>
    </div>
  );
}

    