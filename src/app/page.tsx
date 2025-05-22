
"use client";

import { useEffect, useState } from 'react';
import { AppHeader } from "@/components/app-header";
import { WhiteboardPanel } from "@/components/whiteboard-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { ResultsPanel } from "@/components/results-panel";
import { useToast } from "@/hooks/use-toast";

import { summarizeTranscription } from '@/ai/flows/summarize-transcription';
import type { SummarizeTranscriptionInput, SummarizeTranscriptionOutput } from '@/ai/flows/summarize-transcription';
import { identifyThemes } from '@/ai/flows/identify-themes-flow';
import type { IdentifyThemesInput, IdentifyThemesOutput } from '@/ai/flows/identify-themes-flow';
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
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false); // Covers summarization and theme identification
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
      await handleSummarizeAndIdentifyThemes(result.transcription);
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
    await handleSummarizeAndIdentifyThemes(currentTranscription);
  };

  const handleSummarizeAndIdentifyThemes = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke opsummere eller identificere temaer.", variant: "default" });
      return;
    }
    setIsSummarizing(true); // This state now covers both summary and theme identification
    setSummary(""); 
    setIdentifiedThemes("");
    // Keep whiteboardContent, generatedImageDataUri, newInsights as they are handled by subsequent steps
    
    let summaryResultText = "";
    let themesResultText = "Generelle temaer"; // Fallback

    try {
      // Step 1: Summarize
      const summaryInput: SummarizeTranscriptionInput = { transcription: currentTranscription };
      const summaryResult = await summarizeTranscription(summaryInput);

      if (summaryResult && typeof summaryResult.summary === 'string' && summaryResult.summary.trim() !== "") {
        setSummary(summaryResult.summary);
        summaryResultText = summaryResult.summary;
        toast({ title: "Succes", description: "Transskription opsummeret." });

        // Step 2: Identify Themes from the summary
        try {
          const themesInput: IdentifyThemesInput = { textToAnalyze: summaryResult.summary };
          const themesResult = await identifyThemes(themesInput);
          if (themesResult && typeof themesResult.identifiedThemesText === 'string' && themesResult.identifiedThemesText.trim() !== "") {
            setIdentifiedThemes(themesResult.identifiedThemesText);
            themesResultText = themesResult.identifiedThemesText;
            toast({ title: "Succes", description: "Temaer identificeret." });
          } else {
            console.warn("Temaidentifikationsfejl: Intet gyldigt tematekst modtaget fra AI.", themesResult);
            toast({ title: "Info", description: "Ingen specifikke temaer identificeret af AI. Bruger generelle temaer.", variant: "default" });
            setIdentifiedThemes(themesResultText); // Use fallback
          }
        } catch (themeError) {
          console.error("Temaidentifikationsfejl (catch block):", themeError);
          const userMessage = getAIUserErrorMessage(themeError, "Kunne ikke identificere temaer");
          toast({ title: "Fejl ved temaanalyse", description: userMessage, variant: "destructive" });
          setIdentifiedThemes(themesResultText); // Use fallback
        }
      } else {
        console.error("Opsummeringsfejl: Intet gyldigt resumé modtaget fra AI.", summaryResult);
        toast({ title: "Fejl", description: "Intet gyldigt resumé modtaget fra AI. Prøv venligst igen.", variant: "destructive" });
        summaryResultText = currentTranscription; // Fallback to full transcription for ideas/image if summary fails
        setIdentifiedThemes(themesResultText); // Use fallback themes
      }
    } catch (summaryError) {
      console.error("Opsummeringsfejl (catch block):", summaryError);
      const userMessage = getAIUserErrorMessage(summaryError, "Kunne ikke opsummere transskription");
      toast({ title: "Fejl ved opsummering", description: userMessage, variant: "destructive" });
      summaryResultText = currentTranscription; // Fallback
      setIdentifiedThemes(themesResultText); // Use fallback themes
    } finally {
      setIsSummarizing(false);
      // Proceed to generate ideas with the best available summary/themes
      await handleGenerateIdeas(currentTranscription, themesResultText, summaryResultText || currentTranscription);
    }
  };
  
  const handleGenerateIdeas = async (currentTranscription: string, currentThemes: string, contextForImage: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Fejl", description: "Transskription er tom for idégenerering.", variant: "destructive" });
      setIsGeneratingIdeas(false);
      await handleGenerateImage(currentThemes.trim() || "abstrakt visualisering", contextForImage || summary);
      return;
    }
    if (!currentThemes.trim()) {
        toast({ title: "Info", description: "Ingen temaer identificeret. Bruger fuld transskription/resumé til idéer.", variant: "default" });
    }
    setIsGeneratingIdeas(true);
    setWhiteboardContent("");
    setGeneratedImageDataUri(null);
    setNewInsights("");
    
    try {
      const input: GenerateWhiteboardIdeasInput = {
        transcription: currentTranscription,
        identifiedThemes: currentThemes,
        currentWhiteboardContent: "",
      };
      const result = await generateWhiteboardIdeas(input);
      setWhiteboardContent(result.refinedWhiteboardContent);
      toast({ title: "Succes", description: "Whiteboard-indhold opdateret med AI-idéer." });
      
      const imageGenPromptInput = currentThemes.trim() || contextForImage.substring(0, 150).trim() || "abstrakt visualisering af diskussion";
      await handleGenerateImage(imageGenPromptInput, contextForImage || summary);

    } catch (error) {
      console.error("Idégenereringsfejl:", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere whiteboard-idéer");
      toast({ title: "Fejl ved idégenerering", description: userMessage, variant: "destructive" });
      const imageGenPromptInput = currentThemes.trim() || contextForImage.substring(0, 150).trim() || "abstrakt visualisering af diskussion";
      await handleGenerateImage(imageGenPromptInput, contextForImage || summary);
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
      const styledPrompt = `Omsæt følgende koncepter til en **metaforisk og visuel whiteboard-tegning eller skitse**: ${promptForImage}. Billedet skal være i widescreen 16:9 format og have en minimalistisk stil, som en hurtig whiteboard-tegning med primært sort tusch på hvid baggrund, eventuelt med få accentfarver (blå/grøn). Undgå meget tekst; fokuser på at bruge **symboler, metaforer, diagrammer eller simple abstrakte illustrationer** til at repræsentere koncepterne på en tankevækkende måde.`;
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
        imageDataUri: imageDataUri || "", // Send empty string if null/undefined
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
    // resetAIOutputs(); // Keep this commented to retain insights until new analysis starts
    toast({ 
      title: "Ny Samtale Startet", 
      description: "Indsigter er indsat. Klik på 'Start AI Analyse med Tekst' for at behandle." 
    });
  };
  
  const currentLoadingState = () => {
    if (isRecording) return "Optager lyd...";
    if (isTranscribing) return "Transskriberer...";
    if (isSummarizing) return "Opsummerer og identificerer temaer..."; // Updated text
    if (isGeneratingIdeas) return "Genererer whiteboard-idéer...";
    if (isGeneratingImage) return "Genererer billede...";
    if (isGeneratingInsights) return "Genererer nye indsigter...";
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <div className="flex flex-col gap-4 flex-grow">
          <div className="w-full flex flex-col">
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
          <div className="w-full flex flex-col">
            <WhiteboardPanel
              whiteboardContent={whiteboardContent}
              setWhiteboardContent={setWhiteboardContent}
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
            isSummarizing={isSummarizing} // This state covers summary & themes
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
