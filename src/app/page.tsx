
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

const MAX_CYCLES = 5; // Updated from 2 to 5
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
    resetActiveCycleOutputs(!isFromInsights); 
    setActiveTranscription(transcription);
    return true;
  }

  const handleAudioTranscription = async (audioDataUri: string) => {
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
        transcriptionResultText = result?.transcription || "Transskription fejlede eller returnerede tomt resultat.";
        throw new Error(transcriptionResultText);
      }
      transcriptionResultText = result.transcription;
      setActiveTranscription(transcriptionResultText); 
      toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
      // Kæden fortsætter herfra
      return await processSummaryAndThemes(transcriptionResultText); 
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved transskription");
      toast({ title: "Fejl ved transskription", description: userMessage, variant: "destructive" });
      setActiveTranscription(userMessage); 
      // Sikrer at kæden fortsætter med fejl-state, som gemmes i cyklussen
      return await processSummaryAndThemes(userMessage);
    } finally {
      setIsTranscribing(false);
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

  const processSummaryAndThemes = async (transcriptionForAnalysis: string): Promise<Omit<CycleData, 'id' | 'transcription' | 'whiteboardContent' | 'generatedImageDataUri' | 'newInsights'>> => {
    let currentSummary = FALLBACK_EMPTY_SUMMARY;
    let currentThemes = FALLBACK_EMPTY_THEMES;

    if (transcriptionForAnalysis.startsWith("Fejl") || transcriptionForAnalysis.startsWith("Transskription utilgængelig")) {
      toast({ title: "Info", description: "Ugyldig transskription. Kan ikke opsummere/identificere temaer.", variant: "default" });
      currentSummary = transcriptionForAnalysis; // Pass error message along
    } else {
      setIsProcessingSummaryAndThemes(true); 
      try {
        const summaryInput: SummarizeTranscriptionInput = { transcription: transcriptionForAnalysis };
        const summaryResult = await summarizeTranscription(summaryInput);

        if (!summaryResult || !summaryResult.summary || summaryResult.summary.trim() === "" || summaryResult.summary.startsWith("Fejl") || summaryResult.summary.startsWith("Kunne ikke")) {
          currentSummary = summaryResult?.summary || "Ugyldigt resumé modtaget";
          toast({ title: "Fejl ved opsummering", description: currentSummary, variant: "destructive" });
        } else {
          currentSummary = summaryResult.summary;
          toast({ title: "Succes", description: "Transskription opsummeret." });

          const themesInput: IdentifyThemesInput = { textToAnalyze: currentSummary };
          const themesResult = await identifyThemes(themesInput);
          if (!themesResult || !themesResult.identifiedThemesText || themesResult.identifiedThemesText.trim() === "" || themesResult.identifiedThemesText.startsWith("Fejl") || themesResult.identifiedThemesText.startsWith("Kunne ikke")) {
            currentThemes = themesResult?.identifiedThemesText || "Ugyldige temaer modtaget";
            toast({ title: "Fejl ved temaanalyse", description: currentThemes, variant: "destructive" });
          } else {
            currentThemes = themesResult.identifiedThemesText;
            toast({ title: "Succes", description: "Temaer identificeret." });
          }
        }
      } catch (error) {
        const userMessage = getAIUserErrorMessage(error, "Fejl i opsummering/temaanalyse");
        toast({ title: "Fejl", description: userMessage, variant: "destructive" });
        currentSummary = userMessage; 
      } finally {
        setIsProcessingSummaryAndThemes(false);
      }
    }
    setActiveSummary(currentSummary);
    setActiveIdentifiedThemes(currentThemes);
    // Returner resultaterne for det næste trin
    return await processGenerateWhiteboardIdeas(transcriptionForAnalysis, currentThemes, currentSummary);
  };
  
  const processGenerateWhiteboardIdeas = async (transcriptionCtx: string, themesCtx: string, summaryCtx: string): Promise<Omit<CycleData, 'id' | 'transcription' | 'summary' | 'identifiedThemes' | 'generatedImageDataUri' | 'newInsights'>> => {
    let currentWhiteboardContent = FALLBACK_EMPTY_WHITEBOARD;
    if (transcriptionCtx.startsWith("Fejl") || summaryCtx.startsWith("Fejl") || themesCtx.startsWith("Fejl")) {
      toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere whiteboard-idéer.", variant: "default" });
      currentWhiteboardContent = summaryCtx.startsWith("Fejl") ? summaryCtx : (themesCtx.startsWith("Fejl") ? themesCtx : "Whiteboard-generering sprunget over pga. tidligere fejl.");
    } else {
      setIsGeneratingWhiteboard(true);
      try {
        const input: GenerateWhiteboardIdeasInput = { transcription: transcriptionCtx, identifiedThemes: themesCtx };
        const result = await generateWhiteboardIdeas(input);
        if (!result || !result.refinedWhiteboardContent || result.refinedWhiteboardContent.trim() === "" || result.refinedWhiteboardContent.startsWith("Fejl") || result.refinedWhiteboardContent.startsWith("Kan ikke")) {
          currentWhiteboardContent = result?.refinedWhiteboardContent || "Ugyldigt whiteboard-indhold modtaget";
          toast({ title: "Fejl ved idégenerering", description: currentWhiteboardContent, variant: "destructive" });
        } else {
          currentWhiteboardContent = result.refinedWhiteboardContent;
          toast({ title: "Succes", description: "Whiteboard-indhold opdateret." });
        }
      } catch (error) {
        const userMessage = getAIUserErrorMessage(error, "Fejl ved generering af whiteboard-idéer");
        toast({ title: "Fejl", description: userMessage, variant: "destructive" });
        currentWhiteboardContent = userMessage;
      } finally {
        setIsGeneratingWhiteboard(false);
      }
    }
    setActiveWhiteboardContent(currentWhiteboardContent);
    const imagePromptInput = (themesCtx.startsWith("Fejl") || themesCtx === FALLBACK_EMPTY_THEMES || themesCtx.startsWith("Ingen specifikke temaer")) ? summaryCtx : themesCtx;
    const insightsContext = summaryCtx; // For nu, brug resuméet som kontekst for indsigter

    return await processGenerateImage(transcriptionCtx, summaryCtx, themesCtx, currentWhiteboardContent, imagePromptInput, insightsContext);
  };
  
  const processGenerateImage = async (
    transcriptionCtx: string,
    summaryCtx: string,
    themesCtx: string,
    whiteboardContentCtx: string,
    promptForImage: string, 
    contextForInsights: string
  ): Promise<Omit<CycleData, 'id' | 'transcription' | 'summary' | 'identifiedThemes' | 'whiteboardContent' | 'newInsights'>> => {
    let currentImageDataUri = FALLBACK_EMPTY_IMAGE;
    if (promptForImage.startsWith("Fejl") || contextForInsights.startsWith("Fejl")) {
       toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere billede.", variant: "default" });
       currentImageDataUri = promptForImage.startsWith("Fejl") ? promptForImage : "Billedgenerering sprunget over pga. tidligere fejl.";
    } else {
      setIsGeneratingImage(true);
      try {
        const styledPrompt = `Omsæt følgende koncepter til en **metaforisk og visuel whiteboard-tegning eller skitse**: ${promptForImage}. Billedet skal være i widescreen 16:9 format og have en minimalistisk stil, som en hurtig whiteboard-tegning med primært sort tusch på hvid baggrund, eventuelt med få accentfarver (blå/grøn). Undgå meget tekst; fokuser på at bruge **symboler, metaforer, diagrammer eller simple abstrakte illustrationer** til at repræsentere koncepterne på en tankevækkende måde.`;
        const input: GenerateImageInput = { prompt: styledPrompt };
        const result = await generateImage(input);
        if (!result || !result.imageDataUri || result.imageDataUri.trim() === "" || result.imageDataUri.startsWith("Fejl") || result.imageDataUri.startsWith("Ugyldig prompt")) {
          currentImageDataUri = result?.imageDataUri || FALLBACK_EMPTY_IMAGE;
          toast({ title: "Fejl ved billedgenerering", description: currentImageDataUri, variant: "destructive" });
        } else {
          currentImageDataUri = result.imageDataUri;
          toast({ title: "Succes", description: "Billede genereret." });
        }
      } catch (error) {
        const userMessage = getAIUserErrorMessage(error, "Fejl ved billedgenerering");
        toast({ title: "Fejl", description: userMessage, variant: "destructive" });
        currentImageDataUri = userMessage;
      } finally {
        setIsGeneratingImage(false);
      }
    }
    setActiveGeneratedImageDataUri(currentImageDataUri);
    return await processGenerateInsights(transcriptionCtx, summaryCtx, themesCtx, whiteboardContentCtx, currentImageDataUri, contextForInsights);
  };

  const processGenerateInsights = async (
    transcription: string,
    summary: string,
    themes: string,
    whiteboardContent: string,
    imageDataUri: string,
    conversationContext: string 
  ): Promise<Omit<CycleData, 'id'>> => {
    let currentNewInsights = FALLBACK_EMPTY_INSIGHTS;
     if (imageDataUri.startsWith("Fejl") || conversationContext.startsWith("Fejl")) {
       toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere indsigter.", variant: "default" });
       currentNewInsights = imageDataUri.startsWith("Fejl") ? imageDataUri : "Indsigtsgenerering sprunget over pga. tidligere fejl.";
    } else {
      setIsGeneratingInsights(true);
      try {
        const input: GenerateInsightsInput = { imageDataUri, conversationContext };
        const result = await generateInsights(input);
        if (!result || !result.insightsText || result.insightsText.trim() === "" || result.insightsText.startsWith("Fejl") || result.insightsText.startsWith("Kunne ikke")) {
          currentNewInsights = result?.insightsText || FALLBACK_EMPTY_INSIGHTS;
          toast({ title: "Fejl ved Indsigtsgenerering", description: currentNewInsights, variant: "destructive" });
        } else {
          currentNewInsights = result.insightsText;
          toast({ title: "Succes", description: "Nye AI-indsigter genereret." });
        }
      } catch (error) {
        const userMessage = getAIUserErrorMessage(error, "Fejl ved generering af nye indsigter");
        toast({ title: "Fejl", description: userMessage, variant: "destructive" });
        currentNewInsights = userMessage;
      } finally {
        setIsGeneratingInsights(false);
      }
    }
    setActiveNewInsights(currentNewInsights);
    // Alle data for cyklussen er nu samlet og klar til at blive gemt
    saveCompletedCycle({
      transcription,
      summary,
      identifiedThemes: themes,
      whiteboardContent,
      generatedImageDataUri: imageDataUri,
      newInsights: currentNewInsights,
    });
    // Returner all data for denne cyklus (eller Omit<CycleData, 'id'> for at matche)
    return {
        transcription,
        summary,
        identifiedThemes: themes,
        whiteboardContent,
        generatedImageDataUri: imageDataUri,
        newInsights: currentNewInsights,
    };
  };

  const saveCompletedCycle = (dataForCycle: Omit<CycleData, 'id'>) => {
    const newCycle: CycleData = {
      id: `${Date.now()}-${Math.random()}`,
      ...dataForCycle,
    };
    
    setSessionCycles(prevCycles => {
      const updatedCycles = [...prevCycles, newCycle];
      // Nulstil 'active' værdier kun hvis vi kan starte en ny cyklus
      if (updatedCycles.length < MAX_CYCLES) {
        setActiveSummary(FALLBACK_EMPTY_SUMMARY);
        setActiveIdentifiedThemes(FALLBACK_EMPTY_THEMES);
        setActiveNewInsights(FALLBACK_EMPTY_INSIGHTS);
        // activeTranscription, activeWhiteboardContent, activeGeneratedImageDataUri
        // nulstilles/styres af handleNewCycleStart eller forbliver som forrige cyklus' data
      } else {
        // Hvis max cyklusser er nået, nulstil alt for at vise en "ren" tilstand for den sidste cyklus
        resetActiveCycleOutputs(false); 
      }
      return updatedCycles;
    });
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

  // Denne betingelse sikrer, at vi ikke overskriver de 'aktive' data med den seneste
  // cyklus' data, hvis en ny cyklus er ved at blive forberedt (dvs. transskription er sat).
  const isPreparingNewCycle = activeTranscription !== "" && activeTranscription !== FALLBACK_EMPTY_TRANSCRIPTION &&
                               activeSummary === FALLBACK_EMPTY_SUMMARY && 
                               activeIdentifiedThemes === FALLBACK_EMPTY_THEMES;
  
  if (!isAnyAIProcessRunning && !isPreparingNewCycle && sessionCycles.length > 0) {
    const lastCompletedCycle = sessionCycles[sessionCycles.length - 1];
    if (lastCompletedCycle) {
        wbContentToShow = lastCompletedCycle.whiteboardContent;
        imgUriToShow = lastCompletedCycle.generatedImageDataUri;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <div className="flex flex-col gap-4">
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
          <WhiteboardPanel
            whiteboardContent={wbContentToShow}
            setWhiteboardContent={setActiveWhiteboardContent} 
            generatedImageDataUri={imgUriToShow}
            currentLoadingState={currentLoadingStateText()}
            fallbackEmptyWhiteboard={FALLBACK_EMPTY_WHITEBOARD}
            fallbackEmptyImage={FALLBACK_EMPTY_IMAGE}
          />
        </div>
        <div className="mt-4 flex-1 min-h-0">
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

    