
"use client";

import { useEffect, useState } from 'react';
import { AppHeader } from "@/components/app-header";
import { WhiteboardPanel } from "@/components/whiteboard-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { ResultsPanel } from "@/components/results-panel";
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

  const getAIUserErrorMessage = (error: unknown, baseMessage: string): string => {
    if (error instanceof Error) {
      const errorMessageLowerCase = error.message.toLowerCase();
      if (error.message.includes("503") || 
          errorMessageLowerCase.includes("service unavailable") || 
          errorMessageLowerCase.includes("overloaded") ||
          errorMessageLowerCase.includes("model is overloaded") ||
          errorMessageLowerCase.includes("model is not available")) {
        return "AI-tjenesten (Google) er midlertidigt overbelastet eller utilgængelig. Prøv venligst igen om et øjeblik.";
      }
      return `${baseMessage}: ${error.message}`;
    }
    return `${baseMessage}: En ukendt fejl opstod.`;
  };

  const handleAudioTranscription = async (audioDataUri: string) => {
    setIsTranscribing(true);
    setTranscription("Behandler lydoptagelse for transskription..."); 
    resetAIOutputs(); 
    try {
      const input: TranscribeAudioInput = { audioDataUri };
      const result: TranscribeAudioOutput = await transcribeAudio(input);
      setTranscription(result.transcription); 
      toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
      await handleSummarize(result.transcription);
    } catch (error) {
      console.error("Fejl under (simuleret) transskription:", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke transskribere lyden (simuleret)");
      toast({ title: "Fejl ved transskription", description: userMessage, variant: "destructive" });
      setTranscription(""); 
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleStartAnalysisFromText = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke starte analyse.", variant: "default" });
      return;
    }
    resetAIOutputs(); 
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
        const firstSentence = result.summary.split('. ')[0];
        let themes = "";
        if (firstSentence) {
          themes = firstSentence.split(/[\s,]+/) 
            .map(t => t.replace(/[^\w\sæøåÆØÅ-]/gi, '').toLowerCase())
            .filter(t => t.length > 3 && !['det', 'er', 'en', 'og', 'den', 'til', 'som'].includes(t)) 
            .slice(0, 5) 
            .join(', ');
        }
        if (!themes && result.summary.length > 0) { 
            themes = result.summary.substring(0, Math.min(result.summary.length, 100)); 
        }
        setIdentifiedThemes(themes || "Generelle temaer");
        toast({ title: "Succes", description: "Transskription opsummeret." });
        await handleGenerateIdeas(currentTranscription, themes || result.summary);
      } else {
        console.error("Opsummeringsfejl: Intet gyldigt resumé modtaget fra AI.", result);
        toast({ title: "Fejl", description: "Intet gyldigt resumé modtaget fra AI. Prøv venligst igen.", variant: "destructive" });
        await handleGenerateIdeas(currentTranscription, "Generelle temaer");
      }
    } catch (error) {
      console.error("Opsummeringsfejl (catch block):", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke opsummere transskription");
      toast({ 
        title: "Fejl ved opsummering", 
        description: userMessage, 
        variant: "destructive" 
      });
      await handleGenerateIdeas(currentTranscription, "Generelle temaer");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateIdeas = async (currentTranscription: string, currentThemes: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Fejl", description: "Transskription er tom for idégenerering.", variant: "destructive" });
      setIsGeneratingIdeas(false); 
      await handleGenerateImage(currentThemes.trim() || "abstrakt visualisering", currentTranscription || summary);
      return;
    }
    if (!currentThemes.trim()) { 
        toast({ title: "Info", description: "Ingen temaer identificeret. Bruger fuld transskription til idéer.", variant: "default" });
    }
    setIsGeneratingIdeas(true);
    setWhiteboardContent(""); 
    setGeneratedImageDataUri(null);
    setNewInsights("");
    let refinedWhiteboardContent = "";
    try {
      const input: GenerateWhiteboardIdeasInput = {
        transcription: currentTranscription,
        identifiedThemes: currentThemes, 
        currentWhiteboardContent: "", 
      };
      const result = await generateWhiteboardIdeas(input);
      refinedWhiteboardContent = result.refinedWhiteboardContent;
      setWhiteboardContent(refinedWhiteboardContent);
      toast({ title: "Succes", description: "Whiteboard-indhold opdateret med AI-idéer." });
      
      const imageGenPromptInput = currentThemes.trim() || summary.substring(0, 150).trim() || "abstrakt visualisering af diskussion";
      await handleGenerateImage(imageGenPromptInput, currentTranscription || summary);

    } catch (error) {
      console.error("Idégenereringsfejl:", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere whiteboard-idéer");
      toast({ 
        title: "Fejl ved idégenerering", 
        description: userMessage, 
        variant: "destructive" 
      });
      const imageGenPromptInput = currentThemes.trim() || summary.substring(0, 150).trim() || "abstrakt visualisering af diskussion";
      await handleGenerateImage(imageGenPromptInput, currentTranscription || summary);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };
  
  const handleGenerateImage = async (promptForImage: string, currentTranscriptionForInsights: string) => {
    if (!promptForImage.trim()) {
      toast({ title: "Info", description: "Ingen prompt til billedgenerering fundet. Fortsætter uden billede.", variant: "default" });
      await handleGenerateInsights("", currentTranscriptionForInsights || summary);
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageDataUri(null); 
    setNewInsights("");
    let imageDataUriForInsights = "";
    try {
      const styledPrompt = `En simpel whiteboard-tegning eller skitse der illustrerer: ${promptForImage}. Generer billedet i et widescreen 16:9 format. Brug primært sort tusch på hvid baggrund, eventuelt med få accentfarver i blå eller grøn. Stilen skal være minimalistisk og ligne noget, der hurtigt er tegnet på et whiteboard under et møde.`;
      const input: GenerateImageInput = { prompt: styledPrompt };
      const result = await generateImage(input);
      imageDataUriForInsights = result.imageDataUri;
      setGeneratedImageDataUri(result.imageDataUri);
      toast({ title: "Succes", description: "Billede genereret." });
    } catch (error) {
      console.error("Billedgenereringsfejl:", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere billede");
      toast({
        title: "Fejl ved billedgenerering",
        description: userMessage,
        variant: "destructive"
      });
      setGeneratedImageDataUri(null); 
    } finally {
      setIsGeneratingImage(false);
      await handleGenerateInsights(imageDataUriForInsights, currentTranscriptionForInsights || summary);
    }
  };

  const handleGenerateInsights = async (imageDataUri: string, conversationContext: string) => {
    if (!conversationContext.trim()) { 
      toast({ title: "Info", description: "Manglende samtalekontekst. Kan ikke generere indsigter.", variant: "default" });
      return;
    }
    setIsGeneratingInsights(true);
    setNewInsights(""); 
    try {
      const input: GenerateInsightsInput = { 
        imageDataUri: imageDataUri, 
        conversationContext 
      };
      const result = await generateInsights(input);
      setNewInsights(result.insightsText);
      toast({ title: "Succes", description: "Nye AI-indsigter genereret." });
    } catch (error) {
      console.error("Fejl ved generering af indsigter:", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere nye indsigter");
      toast({
        title: "Fejl ved Indsigtsgenerering",
        description: userMessage,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleUseInsights = (insights: string) => {
    setTranscription(insights); 
    resetAIOutputs(); 
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
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <div className="flex flex-col md:flex-row gap-4 flex-grow md:max-h-[calc(100vh-200px)]">
          <div className="md:w-1/2 lg:w-2/5 h-full flex flex-col">
            <ControlsPanel
              transcription={transcription}
              setTranscription={setTranscription}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              onAudioTranscription={handleAudioTranscription}
              onStartAnalysisFromText={handleStartAnalysisFromText}
              isAnyAIProcessRunning={isTranscribing || isSummarizing || isGeneratingIdeas || isGeneratingImage || isGeneratingInsights}
              currentLoadingStateForControls={currentLoadingState()}
            />
          </div>
          <div className="md:w-1/2 lg:w-3/5 h-full flex flex-col">
            <WhiteboardPanel
              whiteboardContent={whiteboardContent}
              setWhiteboardContent={setWhiteboardContent}
              identifiedThemes={identifiedThemes} // Pass themes to WhiteboardPanel
              generatedImageDataUri={generatedImageDataUri}
              isGeneratingImage={isGeneratingImage}
              currentLoadingState={currentLoadingState()}
            />
          </div>
        </div>
        <div className="mt-4">
          <ResultsPanel
            summary={summary}
            identifiedThemes={identifiedThemes}
            newInsights={newInsights}
            isSummarizing={isSummarizing}
            isGeneratingInsights={isGeneratingInsights}
            onUseInsights={handleUseInsights}
            isAnyAIProcessRunning={isTranscribing || isSummarizing || isGeneratingIdeas || isGeneratingImage || isGeneratingInsights || isRecording}
            whiteboardContent={whiteboardContent}
            generatedImageDataUri={generatedImageDataUri}
          />
        </div>
      </main>
    </div>
  );
}
    

    