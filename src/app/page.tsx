
"use client";

import { useState } from 'react';
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
import type { GenerateWhiteboardIdeasInput, GenerateWhiteboardIdeasOutput } from '@/ai/flows/generate-whiteboard-ideas';
import { generateImage } from '@/ai/flows/generate-image-flow';
import type { GenerateImageInput, GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';
import type { TranscribeAudioInput, TranscribeAudioOutput } from '@/ai/flows/transcribe-audio-flow';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import type { GenerateInsightsInput, GenerateInsightsOutput } from '@/ai/flows/generate-insights-flow';

export interface CycleData {
  id: string;
  transcription: string;
  summary: string;
  identifiedThemes: string;
  whiteboardContent: string;
  generatedImageDataUri: string; 
  newInsights: string; 
}

const MAX_CYCLES = 2;
const FALLBACK_ERROR_MESSAGE = "En uventet AI-fejl opstod.";
const FALLBACK_EMPTY_TRANSCRIPTION = "Transskription utilgængelig";
const FALLBACK_EMPTY_SUMMARY = "Resumé utilgængeligt.";
const FALLBACK_EMPTY_THEMES = "Temaer utilgængelige.";
const FALLBACK_EMPTY_WHITEBOARD = "Whiteboard-indhold utilgængeligt.";
const FALLBACK_EMPTY_IMAGE = "Billedgenerering fejlede eller intet billede returneret.";
const FALLBACK_EMPTY_INSIGHTS = "Ingen specifikke nye indsigter kunne udledes.";


export default function SynapseScribblePage() {
  const [activeTranscription, setActiveTranscription] = useState<string>("");
  const [activeSummary, setActiveSummary] = useState<string>(FALLBACK_EMPTY_SUMMARY);
  const [activeIdentifiedThemes, setActiveIdentifiedThemes] = useState<string>(FALLBACK_EMPTY_THEMES);
  const [activeWhiteboardContent, setActiveWhiteboardContent] = useState<string>(FALLBACK_EMPTY_WHITEBOARD);
  const [activeGeneratedImageDataUri, setActiveGeneratedImageDataUri] = useState<string>(FALLBACK_EMPTY_IMAGE);
  const [activeNewInsights, setActiveNewInsights] = useState<string>(FALLBACK_EMPTY_INSIGHTS);
  
  const [sessionCycles, setSessionCycles] = useState<CycleData[]>([]);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isProcessingSummaryAndThemes, setIsProcessingSummaryAndThemes] = useState<boolean>(false);
  const [isGeneratingWhiteboard, setIsGeneratingWhiteboard] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);

  const { toast } = useToast();

  const resetActiveCycleOutputs = (keepTranscription = false) => {
    if (!keepTranscription) setActiveTranscription("");
    setActiveSummary(FALLBACK_EMPTY_SUMMARY);
    setActiveIdentifiedThemes(FALLBACK_EMPTY_THEMES);
    setActiveWhiteboardContent(FALLBACK_EMPTY_WHITEBOARD);
    setActiveGeneratedImageDataUri(FALLBACK_EMPTY_IMAGE);
    setActiveNewInsights(FALLBACK_EMPTY_INSIGHTS);
  };

  const getAIUserErrorMessage = (error: unknown, baseMessage: string): string => {
    let specificError = FALLBACK_ERROR_MESSAGE;
    if (error instanceof Error) {
      const errorMessageLowerCase = error.message.toLowerCase();
      if (error.message.includes("503") || 
          errorMessageLowerCase.includes("service unavailable") || 
          errorMessageLowerCase.includes("overloaded") ||
          errorMessageLowerCase.includes("model is overloaded") ||
          errorMessageLowerCase.includes("model is not available")) {
        specificError = "AI-tjenesten (Google) er midlertidigt overbelastet. Prøv igen senere.";
      } else if (error.message) {
        specificError = error.message;
      }
    }
    return `${baseMessage}: ${specificError}`;
  };

  const handleNewCycleStart = (transcription: string, isFromInsights = false): boolean => {
    if (!isFromInsights && sessionCycles.length >= MAX_CYCLES) {
      toast({ title: "Max cyklusser nået", description: `Du kan maksimalt have ${MAX_CYCLES} analysecyklusser. Start en ny session for flere.`, variant: "default" });
      return false;
    }
    resetActiveCycleOutputs(!isFromInsights); // Resets active outputs to their fallbacks
    setActiveTranscription(transcription);
    return true;
  }

  const handleAudioTranscription = async (audioDataUri: string) => {
    // Initial placeholder for transcription in UI
    if (!handleNewCycleStart("Optager lyd... Klik igen for at stoppe og starte AI-analyse.")) {
      setIsRecording(false); 
      return;
    }
    
    setIsTranscribing(true);
    let transcriptionResultText = FALLBACK_EMPTY_TRANSCRIPTION;
    try {
      const input: TranscribeAudioInput = { audioDataUri };
      const result: TranscribeAudioOutput = await transcribeAudio(input);
      if (!result || !result.transcription || result.transcription.trim() === "" || result.transcription.startsWith("Fejl") || result.transcription.startsWith("Kunne ikke")) {
        throw new Error(result?.transcription || "Transskription fejlede eller returnerede tomt resultat.");
      }
      transcriptionResultText = result.transcription;
      setActiveTranscription(transcriptionResultText); 
      toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
      await processSummaryAndThemes(transcriptionResultText);
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved transskription");
      toast({ title: "Fejl ved transskription", description: userMessage, variant: "destructive" });
      setActiveTranscription(userMessage); 
      transcriptionResultText = userMessage; 
      saveCompletedCycle(FALLBACK_EMPTY_IMAGE, FALLBACK_EMPTY_INSIGHTS); 
    } finally {
      setIsTranscribing(false);
      // If transcription failed, subsequent steps will use the error message or fallbacks
      if (transcriptionResultText.startsWith("Fejl") || transcriptionResultText === FALLBACK_EMPTY_TRANSCRIPTION) {
         await processSummaryAndThemes(transcriptionResultText); // Ensure chain continues with error state
      }
    }
  };
  
  const handleStartAnalysisFromText = async (currentTranscription: string) => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke starte analyse.", variant: "default" });
      return;
    }
    if (!handleNewCycleStart(currentTranscription)) return;
    toast({ title: "AI Analyse Startet", description: "Behandler den angivne tekst..." });
    await processSummaryAndThemes(currentTranscription);
  };

  const processSummaryAndThemes = async (transcriptionForAnalysis: string) => {
    if (!transcriptionForAnalysis || transcriptionForAnalysis.trim() === "" || transcriptionForAnalysis.startsWith("Fejl") || transcriptionForAnalysis === FALLBACK_EMPTY_TRANSCRIPTION) {
      toast({ title: "Info", description: "Ugyldig transskription. Kan ikke opsummere/identificere temaer.", variant: "default" });
      setActiveSummary(transcriptionForAnalysis.startsWith("Fejl") || transcriptionForAnalysis === FALLBACK_EMPTY_TRANSCRIPTION ? transcriptionForAnalysis : FALLBACK_EMPTY_SUMMARY);
      setActiveIdentifiedThemes(FALLBACK_EMPTY_THEMES);
      await processGenerateWhiteboardIdeas(transcriptionForAnalysis, FALLBACK_EMPTY_THEMES, activeSummary);
      return;
    }

    setIsProcessingSummaryAndThemes(true); 
    let summaryOutputText = FALLBACK_EMPTY_SUMMARY;
    let themesOutputText = FALLBACK_EMPTY_THEMES;

    try {
      const summaryInput: SummarizeTranscriptionInput = { transcription: transcriptionForAnalysis };
      const summaryResult = await summarizeTranscription(summaryInput);

      if (!summaryResult || !summaryResult.summary || summaryResult.summary.trim() === "" || summaryResult.summary.startsWith("Fejl") || summaryResult.summary.startsWith("Kunne ikke") || summaryResult.summary === FALLBACK_EMPTY_SUMMARY) {
        summaryOutputText = summaryResult?.summary || "Ugyldigt resumé modtaget";
        toast({ title: "Fejl ved opsummering", description: summaryOutputText, variant: "destructive" });
      } else {
        summaryOutputText = summaryResult.summary;
        toast({ title: "Succes", description: "Transskription opsummeret." });

        const themesInput: IdentifyThemesInput = { textToAnalyze: summaryOutputText };
        const themesResult = await identifyThemes(themesInput);
        if (!themesResult || !themesResult.identifiedThemesText || themesResult.identifiedThemesText.trim() === "" || themesResult.identifiedThemesText.startsWith("Fejl") || themesResult.identifiedThemesText.startsWith("Kunne ikke")|| themesResult.identifiedThemesText === FALLBACK_EMPTY_THEMES) {
          themesOutputText = themesResult?.identifiedThemesText || "Ugyldige temaer modtaget";
          toast({ title: "Fejl ved temaanalyse", description: themesOutputText, variant: "destructive" });
        } else {
          themesOutputText = themesResult.identifiedThemesText;
          toast({ title: "Succes", description: "Temaer identificeret." });
        }
      }
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl i opsummering/temaanalyse");
      toast({ title: "Fejl", description: userMessage, variant: "destructive" });
      summaryOutputText = userMessage; 
      themesOutputText = FALLBACK_EMPTY_THEMES; // Keep fallback if summary failed catastrophically
    } finally {
      setActiveSummary(summaryOutputText);
      setActiveIdentifiedThemes(themesOutputText);
      setIsProcessingSummaryAndThemes(false);
      await processGenerateWhiteboardIdeas(transcriptionForAnalysis, themesOutputText, summaryOutputText);
    }
  };
  
  const processGenerateWhiteboardIdeas = async (transcriptionCtx: string, themesCtx: string, summaryCtx: string) => {
    if (transcriptionCtx.startsWith("Fejl") || summaryCtx.startsWith("Fejl") || themesCtx.startsWith("Fejl") || summaryCtx === FALLBACK_EMPTY_SUMMARY || themesCtx === FALLBACK_EMPTY_THEMES) {
      toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere whiteboard-idéer.", variant: "default" });
      setActiveWhiteboardContent(FALLBACK_EMPTY_WHITEBOARD);
      const imagePromptInput = (themesCtx.startsWith("Fejl") || themesCtx === FALLBACK_EMPTY_THEMES || themesCtx.startsWith("Ingen specifikke")) ? summaryCtx : themesCtx;
      await processGenerateImage(imagePromptInput, summaryCtx); 
      return;
    }

    setIsGeneratingWhiteboard(true);
    let whiteboardOutputText = FALLBACK_EMPTY_WHITEBOARD;
    try {
      const input: GenerateWhiteboardIdeasInput = { transcription: transcriptionCtx, identifiedThemes: themesCtx };
      const result = await generateWhiteboardIdeas(input);
      if (!result || !result.refinedWhiteboardContent || result.refinedWhiteboardContent.trim() === "" || result.refinedWhiteboardContent.startsWith("Fejl") || result.refinedWhiteboardContent.startsWith("Kan ikke") || result.refinedWhiteboardContent === FALLBACK_EMPTY_WHITEBOARD) {
        whiteboardOutputText = result?.refinedWhiteboardContent || "Ugyldigt whiteboard-indhold modtaget";
        toast({ title: "Fejl ved idégenerering", description: whiteboardOutputText, variant: "destructive" });
      } else {
        whiteboardOutputText = result.refinedWhiteboardContent;
        toast({ title: "Succes", description: "Whiteboard-indhold opdateret." });
      }
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved generering af whiteboard-idéer");
      toast({ title: "Fejl", description: userMessage, variant: "destructive" });
      whiteboardOutputText = userMessage;
    } finally {
      setActiveWhiteboardContent(whiteboardOutputText);
      setIsGeneratingWhiteboard(false);
      const imagePromptInput = (themesCtx.startsWith("Fejl") || themesCtx === FALLBACK_EMPTY_THEMES || themesCtx.startsWith("Ingen specifikke")) ? summaryCtx : themesCtx;
      await processGenerateImage(imagePromptInput, summaryCtx);
    }
  };
  
  const processGenerateImage = async (promptForImage: string, contextForInsights: string) => {
    if (promptForImage.startsWith("Fejl") || promptForImage === FALLBACK_EMPTY_SUMMARY || promptForImage === FALLBACK_EMPTY_THEMES || promptForImage.startsWith("Kunne ikke") || contextForInsights.startsWith("Fejl") || contextForInsights === FALLBACK_EMPTY_SUMMARY) {
       toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere billede.", variant: "default" });
       setActiveGeneratedImageDataUri(FALLBACK_EMPTY_IMAGE);
       await processGenerateInsights(FALLBACK_EMPTY_IMAGE, contextForInsights);
       return;
    }
    setIsGeneratingImage(true);
    let imageOutputDataUri = FALLBACK_EMPTY_IMAGE;
    try {
      const styledPrompt = `Omsæt følgende koncepter til en **metaforisk og visuel whiteboard-tegning eller skitse**: ${promptForImage}. Billedet skal være i widescreen 16:9 format og have en minimalistisk stil, som en hurtig whiteboard-tegning med primært sort tusch på hvid baggrund, eventuelt med få accentfarver (blå/grøn). Undgå meget tekst; fokuser på at bruge **symboler, metaforer, diagrammer eller simple abstrakte illustrationer** til at repræsentere koncepterne på en tankevækkende måde.`;
      const input: GenerateImageInput = { prompt: styledPrompt };
      const result = await generateImage(input);
      if (!result || !result.imageDataUri || result.imageDataUri.trim() === "" || result.imageDataUri.startsWith("Fejl") || result.imageDataUri.startsWith("Ugyldig prompt") || result.imageDataUri === FALLBACK_EMPTY_IMAGE) {
        imageOutputDataUri = result?.imageDataUri || FALLBACK_EMPTY_IMAGE;
        toast({ title: "Fejl ved billedgenerering", description: imageOutputDataUri, variant: "destructive" });
      } else {
        imageOutputDataUri = result.imageDataUri;
        toast({ title: "Succes", description: "Billede genereret." });
      }
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved billedgenerering");
      toast({ title: "Fejl", description: userMessage, variant: "destructive" });
      imageOutputDataUri = userMessage;
    } finally {
      setActiveGeneratedImageDataUri(imageOutputDataUri);
      setIsGeneratingImage(false);
      await processGenerateInsights(imageOutputDataUri, contextForInsights);
    }
  };

  const processGenerateInsights = async (imageDataUri: string, conversationContext: string) => {
     if (imageDataUri.startsWith("Fejl") || imageDataUri === FALLBACK_EMPTY_IMAGE || imageDataUri.startsWith("Ugyldig prompt") || conversationContext.startsWith("Fejl") || conversationContext === FALLBACK_EMPTY_SUMMARY) {
       toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere indsigter.", variant: "default" });
       setActiveNewInsights(FALLBACK_EMPTY_INSIGHTS);
       saveCompletedCycle(imageDataUri, FALLBACK_EMPTY_INSIGHTS);
       return;
    }
    setIsGeneratingInsights(true);
    let insightsOutputText = FALLBACK_EMPTY_INSIGHTS;
    try {
      const input: GenerateInsightsInput = { imageDataUri, conversationContext };
      const result = await generateInsights(input);
       if (!result || !result.insightsText || result.insightsText.trim() === "" || result.insightsText.startsWith("Fejl") || result.insightsText.startsWith("Kunne ikke") || result.insightsText === FALLBACK_EMPTY_INSIGHTS) {
        insightsOutputText = result?.insightsText || FALLBACK_EMPTY_INSIGHTS;
        toast({ title: "Fejl ved Indsigtsgenerering", description: insightsOutputText, variant: "destructive" });
      } else {
        insightsOutputText = result.insightsText;
        toast({ title: "Succes", description: "Nye AI-indsigter genereret." });
      }
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved generering af nye indsigter");
      toast({ title: "Fejl", description: userMessage, variant: "destructive" });
      insightsOutputText = userMessage;
    } finally {
      setActiveNewInsights(insightsOutputText);
      setIsGeneratingInsights(false);
      saveCompletedCycle(imageDataUri, insightsOutputText);
    }
  };

  const saveCompletedCycle = (finalImageDataUri: string, finalInsightsText: string) => {
    const newCycle: CycleData = {
      id: `${Date.now()}-${Math.random()}`,
      transcription: activeTranscription, // Already FALLBACK_EMPTY_TRANSCRIPTION or actual
      summary: activeSummary,           // Already FALLBACK_EMPTY_SUMMARY or actual/error
      identifiedThemes: activeIdentifiedThemes, // Already FALLBACK_EMPTY_THEMES or actual/error
      whiteboardContent: activeWhiteboardContent, // Already FALLBACK_EMPTY_WHITEBOARD or actual/error
      generatedImageDataUri: finalImageDataUri, // Already FALLBACK_EMPTY_IMAGE or actual/error
      newInsights: finalInsightsText,         // Already FALLBACK_EMPTY_INSIGHTS or actual/error
    };
    setSessionCycles(prevCycles => [...prevCycles, newCycle]);
  };

  const handleUseInsightsForNewCycle = (insightsFromPreviousCycle: string) => {
    if (!handleNewCycleStart(insightsFromPreviousCycle, true)) return;
    toast({ 
      title: "Ny Samtale Startet med Indsigter", 
      description: "Indsigter er indsat. Klik på 'Start AI Analyse med Tekst' for at behandle." 
    });
  };
  
  const currentLoadingStateText = () => {
    if (isRecording) return "Optager lyd...";
    if (isTranscribing) return "Transskriberer...";
    if (isProcessingSummaryAndThemes) return "Opsummerer og identificerer temaer...";
    if (isGeneratingWhiteboard) return "Genererer whiteboard-idéer...";
    if (isGeneratingImage) return "Genererer billede...";
    if (isGeneratingInsights) return "Genererer nye indsigter...";
    return null;
  }

  const isAnyAIProcessRunning = isTranscribing || isProcessingSummaryAndThemes || isGeneratingWhiteboard || isGeneratingImage || isGeneratingInsights;
  
  let wbContentToShow = activeWhiteboardContent;
  let imgUriToShow = activeGeneratedImageDataUri;

  // Display last completed cycle's data if no AI process is running for a *new* cycle
  if (!isAnyAIProcessRunning && sessionCycles.length > 0 && activeTranscription === "") {
    const lastCompletedCycle = sessionCycles[sessionCycles.length - 1];
    wbContentToShow = lastCompletedCycle.whiteboardContent;
    imgUriToShow = lastCompletedCycle.generatedImageDataUri;
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 flex-grow">
          <div className="w-full lg:w-1/2 flex flex-col">
            <ControlsPanel
              transcription={activeTranscription} 
              setTranscription={setActiveTranscription} 
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              onAudioTranscription={handleAudioTranscription}
              onStartAnalysisFromText={handleStartAnalysisFromText}
              isAnyAIProcessRunning={isAnyAIProcessRunning || isRecording}
              currentLoadingStateForControls={currentLoadingStateText()}
              canStartNewCycle={sessionCycles.length < MAX_CYCLES}
            />
          </div>
          <div className="w-full lg:w-1/2 flex flex-col">
            <WhiteboardPanel
              whiteboardContent={wbContentToShow}
              setWhiteboardContent={setActiveWhiteboardContent} 
              generatedImageDataUri={imgUriToShow}
              isGeneratingImage={isGeneratingImage && activeGeneratedImageDataUri === FALLBACK_EMPTY_IMAGE}
              currentLoadingState={currentLoadingStateText()}
            />
          </div>
        </div>
        <div className="mt-4">
          <ResultsPanel
            sessionCycles={sessionCycles} 
            activeCycleData={{ 
              summary: activeSummary,
              identifiedThemes: activeIdentifiedThemes,
              newInsights: activeNewInsights,
            }}
            isLoadingActiveSummaryAndThemes={isProcessingSummaryAndThemes}
            isLoadingActiveInsights={isGeneratingInsights}
            onUseInsightsForNewCycle={handleUseInsightsForNewCycle}
            isAnyAIProcessRunning={isAnyAIProcessRunning || isRecording}
            canStartNewCycle={sessionCycles.length < MAX_CYCLES}
            fallbacks={{
              summary: FALLBACK_EMPTY_SUMMARY,
              themes: FALLBACK_EMPTY_THEMES,
              insights: FALLBACK_EMPTY_INSIGHTS,
            }}
          />
        </div>
      </main>
    </div>
  );
}
