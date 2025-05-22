
"use client";

import { useState, useEffect } from 'react';
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
  const [activeTranscription, setActiveTranscription] = useState<string>(FALLBACK_EMPTY_TRANSCRIPTION);
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
  
  useEffect(() => {
    const isAnyAIProcessRunningCheck = isTranscribing || isProcessingSummaryAndThemes || isGeneratingWhiteboard || isGeneratingImage || isGeneratingInsights;
    if (!isAnyAIProcessRunningCheck && activeTranscription === FALLBACK_EMPTY_TRANSCRIPTION) {
      if (activeSummary !== FALLBACK_EMPTY_SUMMARY || 
          activeIdentifiedThemes !== FALLBACK_EMPTY_THEMES ||
          activeWhiteboardContent !== FALLBACK_EMPTY_WHITEBOARD ||
          activeGeneratedImageDataUri !== FALLBACK_EMPTY_IMAGE ||
          activeNewInsights !== FALLBACK_EMPTY_INSIGHTS) {
        resetActiveCycleOutputs(true); 
      }
    }
  }, [isTranscribing, isProcessingSummaryAndThemes, isGeneratingWhiteboard, isGeneratingImage, isGeneratingInsights, activeTranscription, activeSummary, activeIdentifiedThemes, activeWhiteboardContent, activeGeneratedImageDataUri, activeNewInsights]);


  const resetActiveCycleOutputs = (keepTranscription = false) => {
    if (!keepTranscription) setActiveTranscription(FALLBACK_EMPTY_TRANSCRIPTION);
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

  const handleNewCycleStart = (transcriptionInput: string, isFromInsights = false): boolean => {
    if (!isFromInsights && sessionCycles.length >= MAX_CYCLES) {
      toast({ title: "Max cyklusser nået", description: `Du kan maksimalt have ${MAX_CYCLES} analysecyklusser. Start en ny session for flere.`, variant: "default" });
      return false;
    }
    resetActiveCycleOutputs(isFromInsights); 
    setActiveTranscription(transcriptionInput);
    return true;
  }

  const handleAudioTranscription = async (audioDataUri: string) => {
    if (!handleNewCycleStart(isRecording ? "Optager lyd... Klik igen for at stoppe og starte AI-analyse." : "Starter transskription...")) {
      setIsRecording(false);
      return;
    }

    setIsTranscribing(true);
    setActiveTranscription("Transskriberer..."); 
    let transcriptionResultText: string;
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
    } catch (error) {
      transcriptionResultText = getAIUserErrorMessage(error, "Fejl ved transskription");
      toast({ title: "Fejl ved transskription", description: transcriptionResultText, variant: "destructive" });
      setActiveTranscription(transcriptionResultText);
    } finally {
      setIsTranscribing(false);
    }
    await processSummaryAndThemes(transcriptionResultText);
  };

  const handleStartAnalysisFromText = async (currentTranscription: string) => {
    if (!currentTranscription.trim() || currentTranscription === FALLBACK_EMPTY_TRANSCRIPTION) {
      toast({ title: "Info", description: "Transskription er tom eller ugyldig. Kan ikke starte analyse.", variant: "default" });
      return;
    }
    if (!handleNewCycleStart(currentTranscription)) return;
    toast({ title: "AI Analyse Startet", description: "Behandler den angivne tekst..." });
    await processSummaryAndThemes(currentTranscription);
  };

  const processSummaryAndThemes = async (transcriptionForAnalysis: string) => {
    let summaryResultText = FALLBACK_EMPTY_SUMMARY;
    let themesResultText = FALLBACK_EMPTY_THEMES;

    if (transcriptionForAnalysis.startsWith("Fejl") || transcriptionForAnalysis === FALLBACK_EMPTY_TRANSCRIPTION) {
      toast({ title: "Info", description: "Ugyldig transskription. Kan ikke opsummere/identificere temaer.", variant: "default" });
      summaryResultText = transcriptionForAnalysis; 
      themesResultText = "Temaanalyse sprunget over pga. fejl i transskription.";
    } else {
      setIsProcessingSummaryAndThemes(true);
      setActiveSummary("Opsummerer...");
      setActiveIdentifiedThemes("Identificerer temaer...");
      try {
        const summaryInput: SummarizeTranscriptionInput = { transcription: transcriptionForAnalysis };
        const summaryOutput = await summarizeTranscription(summaryInput);

        if (!summaryOutput || !summaryOutput.summary || summaryOutput.summary.trim() === "" || summaryOutput.summary.startsWith("Fejl") || summaryOutput.summary.startsWith("Kunne ikke")) {
          summaryResultText = summaryOutput?.summary || "Ugyldigt resumé modtaget";
          toast({ title: "Fejl ved opsummering", description: summaryResultText, variant: "destructive" });
          themesResultText = "Temaanalyse sprunget over pga. fejl i opsummering.";
        } else {
          summaryResultText = summaryOutput.summary;
          toast({ title: "Succes", description: "Transskription opsummeret." });

          const themesInput: IdentifyThemesInput = { textToAnalyze: summaryResultText };
          const themesOutput = await identifyThemes(themesInput);
          if (!themesOutput || !themesOutput.identifiedThemesText || themesOutput.identifiedThemesText.trim() === "" || themesOutput.identifiedThemesText.startsWith("Fejl") || themesOutput.identifiedThemesText.startsWith("Kunne ikke")) {
            themesResultText = themesOutput?.identifiedThemesText || "Ugyldige temaer modtaget";
            toast({ title: "Fejl ved temaanalyse", description: themesResultText, variant: "destructive" });
          } else {
            themesResultText = themesOutput.identifiedThemesText;
            toast({ title: "Succes", description: "Temaer identificeret." });
          }
        }
      } catch (error) {
        const userMessage = getAIUserErrorMessage(error, "Fejl i opsummering/temaanalyse");
        toast({ title: "Fejl", description: userMessage, variant: "destructive" });
        summaryResultText = userMessage;
        themesResultText = "Temaanalyse sprunget over pga. generel fejl.";
      } finally {
        setIsProcessingSummaryAndThemes(false);
      }
    }
    setActiveSummary(summaryResultText);
    setActiveIdentifiedThemes(themesResultText);
    await processGenerateWhiteboardIdeas(transcriptionForAnalysis, summaryResultText, themesResultText);
  };

  const processGenerateWhiteboardIdeas = async (transcriptionCtx: string, summaryCtx: string, themesCtx: string) => {
    let whiteboardResultText = FALLBACK_EMPTY_WHITEBOARD;
    if (transcriptionCtx.startsWith("Fejl") || summaryCtx.startsWith("Fejl") || themesCtx.startsWith("Fejl")) {
      toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere whiteboard-idéer.", variant: "default" });
      whiteboardResultText = summaryCtx.startsWith("Fejl") ? summaryCtx : (themesCtx.startsWith("Fejl") ? themesCtx : "Whiteboard-generering sprunget over pga. tidligere fejl.");
    } else {
      setIsGeneratingWhiteboard(true);
      setActiveWhiteboardContent("Genererer whiteboard-idéer...");
      try {
        const input: GenerateWhiteboardIdeasInput = { transcription: transcriptionCtx, identifiedThemes: themesCtx };
        const result = await generateWhiteboardIdeas(input);
        if (!result || !result.refinedWhiteboardContent || result.refinedWhiteboardContent.trim() === "" || result.refinedWhiteboardContent.startsWith("Fejl") || result.refinedWhiteboardContent.startsWith("Kan ikke")) {
          whiteboardResultText = result?.refinedWhiteboardContent || "Ugyldigt whiteboard-indhold modtaget";
          toast({ title: "Fejl ved idégenerering", description: whiteboardResultText, variant: "destructive" });
        } else {
          whiteboardResultText = result.refinedWhiteboardContent;
          toast({ title: "Succes", description: "Whiteboard-indhold opdateret." });
        }
      } catch (error) {
        whiteboardResultText = getAIUserErrorMessage(error, "Fejl ved generering af whiteboard-idéer");
        toast({ title: "Fejl", description: whiteboardResultText, variant: "destructive" });
      } finally {
        setIsGeneratingWhiteboard(false);
      }
    }
    setActiveWhiteboardContent(whiteboardResultText);
    const imagePromptInput = (themesCtx.startsWith("Fejl") || themesCtx === FALLBACK_EMPTY_THEMES || themesCtx.startsWith("Ingen specifikke temaer"))
                             ? (summaryCtx.startsWith("Fejl") || summaryCtx === FALLBACK_EMPTY_SUMMARY ? FALLBACK_EMPTY_IMAGE : summaryCtx)
                             : themesCtx;
    await processGenerateImage(imagePromptInput, summaryCtx, transcriptionCtx, themesCtx, whiteboardResultText);
  };

  const processGenerateImage = async (promptForImage: string, summaryCtx: string, transcriptionCtx: string, themesCtx: string, whiteboardCtx: string) => {
    let imageResultDataUri = FALLBACK_EMPTY_IMAGE;
    if (promptForImage.startsWith("Fejl") || promptForImage === FALLBACK_EMPTY_IMAGE || summaryCtx.startsWith("Fejl")) {
       toast({ title: "Info", description: "Forrige trin fejlede eller ingen prompt til billede. Kan ikke generere billede.", variant: "default" });
       imageResultDataUri = promptForImage.startsWith("Fejl") ? promptForImage : "Billedgenerering sprunget over pga. tidligere fejl.";
    } else {
      setIsGeneratingImage(true);
      setActiveGeneratedImageDataUri("Genererer billede...");
      try {
        const styledPrompt = `Omsæt følgende koncepter til en **metaforisk og visuel whiteboard-tegning eller skitse**: ${promptForImage}. Billedet skal være i widescreen 16:9 format og have en minimalistisk stil, som en hurtig whiteboard-tegning med primært sort tusch på hvid baggrund, eventuelt med få accentfarver (blå/grøn). Undgå meget tekst; fokuser på at bruge **symboler, metaforer, diagrammer eller simple abstrakte illustrationer** til at repræsentere koncepterne på en tankevækkende måde.`;
        const input: GenerateImageInput = { prompt: styledPrompt };
        const result = await generateImage(input);
        if (!result || !result.imageDataUri || result.imageDataUri.trim() === "" || result.imageDataUri.startsWith("Fejl") || result.imageDataUri.startsWith("Ugyldig prompt")) {
          imageResultDataUri = result?.imageDataUri || FALLBACK_EMPTY_IMAGE;
          toast({ title: "Fejl ved billedgenerering", description: imageResultDataUri, variant: "destructive" });
        } else {
          imageResultDataUri = result.imageDataUri;
          toast({ title: "Succes", description: "Billede genereret." });
        }
      } catch (error) {
        imageResultDataUri = getAIUserErrorMessage(error, "Fejl ved billedgenerering");
        toast({ title: "Fejl", description: imageResultDataUri, variant: "destructive" });
      } finally {
        setIsGeneratingImage(false);
      }
    }
    setActiveGeneratedImageDataUri(imageResultDataUri);
    await processGenerateInsights(imageResultDataUri, summaryCtx, transcriptionCtx, themesCtx, whiteboardCtx);
  };

  const processGenerateInsights = async (imageDataUriCtx: string, summaryCtx: string, transcriptionCtx: string, themesCtx: string, whiteboardCtx: string) => {
    let insightsResultText = FALLBACK_EMPTY_INSIGHTS;
    const conversationContextForInsights = summaryCtx.startsWith("Fejl") || summaryCtx === FALLBACK_EMPTY_SUMMARY ? transcriptionCtx : summaryCtx;

     if (imageDataUriCtx.startsWith("Fejl") || conversationContextForInsights.startsWith("Fejl")) {
       toast({ title: "Info", description: "Forrige trin fejlede. Kan ikke generere indsigter.", variant: "default" });
       insightsResultText = imageDataUriCtx.startsWith("Fejl") ? imageDataUriCtx : "Indsigtsgenerering sprunget over pga. tidligere fejl.";
    } else {
      setIsGeneratingInsights(true);
      setActiveNewInsights("Genererer nye indsigter...");
      try {
        const input: GenerateInsightsInput = { imageDataUri: imageDataUriCtx, conversationContext: conversationContextForInsights };
        const result = await generateInsights(input);
        if (!result || !result.insightsText || result.insightsText.trim() === "" || result.insightsText.startsWith("Fejl") || result.insightsText.startsWith("Kunne ikke")) {
          insightsResultText = result?.insightsText || FALLBACK_EMPTY_INSIGHTS;
          toast({ title: "Fejl ved Indsigtsgenerering", description: insightsResultText, variant: "destructive" });
        } else {
          insightsResultText = result.insightsText;
          toast({ title: "Succes", description: "Nye AI-indsigter genereret." });
        }
      } catch (error) {
        insightsResultText = getAIUserErrorMessage(error, "Fejl ved generering af nye indsigter");
        toast({ title: "Fejl", description: insightsResultText, variant: "destructive" });
      } finally {
        setIsGeneratingInsights(false);
      }
    }
    setActiveNewInsights(insightsResultText); 
    saveCompletedCycle({
      transcription: transcriptionCtx,
      summary: summaryCtx,
      identifiedThemes: themesCtx,
      whiteboardContent: whiteboardCtx,
      generatedImageDataUri: imageDataUriCtx,
      newInsights: insightsResultText,
    });
  };

  const saveCompletedCycle = (cycleData: Omit<CycleData, 'id'>) => {
    const newCycle: CycleData = {
      id: `${Date.now()}-${Math.random()}`,
      ...cycleData,
    };
    const updatedCycles = [...sessionCycles, newCycle];
    setSessionCycles(updatedCycles);
  
    // After saving, reset active derived data if new cycles can be started.
    // Transcription, whiteboard content, and image URI for the "active" slot remain
    // as they were from the *just completed* cycle.
    // `handleNewCycleStart` will fully reset them when a *new audio recording* or
    // *new text analysis* is explicitly initiated.
    // `handleUseInsightsForNewCycle` also calls `handleNewCycleStart`.
    if (updatedCycles.length < MAX_CYCLES) {
      setActiveSummary(FALLBACK_EMPTY_SUMMARY);
      setActiveIdentifiedThemes(FALLBACK_EMPTY_THEMES);
      setActiveNewInsights(FALLBACK_EMPTY_INSIGHTS);
      // WhiteboardPanel is designed to show activeWhiteboardContent/Image if they are not fallbacks,
      // or the last completed cycle's media otherwise. So, keeping them as is from the
      // just-completed cycle is fine for its display logic until a new cycle truly starts.
    } else {
      // Max cycles reached, clear everything for the "active" slot.
      resetActiveCycleOutputs(false);
    }
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
  
  const isWaitingForNewCycleInput = !isAnyAIProcessRunning && 
                                   activeTranscription !== FALLBACK_EMPTY_TRANSCRIPTION &&
                                   activeSummary === FALLBACK_EMPTY_SUMMARY &&
                                   activeIdentifiedThemes === FALLBACK_EMPTY_THEMES &&
                                   activeNewInsights === FALLBACK_EMPTY_INSIGHTS;


  if (!isAnyAIProcessRunning && !isWaitingForNewCycleInput && sessionCycles.length > 0) {
     // Show last completed cycle's data if active slot is "empty" (all derived are fallbacks)
     // and transcription is also fallback (meaning we're not in a "limbo" state after using insights)
    if (activeTranscription === FALLBACK_EMPTY_TRANSCRIPTION &&
        activeSummary === FALLBACK_EMPTY_SUMMARY &&
        activeIdentifiedThemes === FALLBACK_EMPTY_THEMES &&
        activeWhiteboardContent === FALLBACK_EMPTY_WHITEBOARD &&
        activeGeneratedImageDataUri === FALLBACK_EMPTY_IMAGE &&
        activeNewInsights === FALLBACK_EMPTY_INSIGHTS) {
            const lastCompletedCycle = sessionCycles[sessionCycles.length - 1];
            if (lastCompletedCycle) {
                wbContentToShow = lastCompletedCycle.whiteboardContent;
                imgUriToShow = lastCompletedCycle.generatedImageDataUri;
            }
        }
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <div className="flex flex-col gap-4">
          <ControlsPanel
            transcription={activeTranscription === FALLBACK_EMPTY_TRANSCRIPTION && !isRecording && !isAnyAIProcessRunning ? "" : activeTranscription}
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
            isGeneratingImage={isGeneratingImage && activeGeneratedImageDataUri === FALLBACK_EMPTY_IMAGE}
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

    