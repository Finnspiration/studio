
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
  generatedImageDataUri: string | null;
  newInsights: string;
}

const MAX_CYCLES = 2;

export default function SynapseScribblePage() {
  // State for den aktive/igangværende cyklus
  const [activeTranscription, setActiveTranscription] = useState<string>("");
  const [activeSummary, setActiveSummary] = useState<string>("");
  const [activeIdentifiedThemes, setActiveIdentifiedThemes] = useState<string>("");
  const [activeWhiteboardContent, setActiveWhiteboardContent] = useState<string>("");
  const [activeGeneratedImageDataUri, setActiveGeneratedImageDataUri] = useState<string | null>(null);
  const [activeNewInsights, setActiveNewInsights] = useState<string>("");

  // State for alle afsluttede cyklusser
  const [sessionCycles, setSessionCycles] = useState<CycleData[]>([]);

  // Loading states for den aktive cyklus
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isProcessingSummaryAndThemes, setIsProcessingSummaryAndThemes] = useState<boolean>(false);
  const [isGeneratingWhiteboard, setIsGeneratingWhiteboard] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);

  const { toast } = useToast();

  const resetActiveCycleOutputs = (keepTranscription = false) => {
    if (!keepTranscription) {
      setActiveTranscription("");
    }
    setActiveSummary("");
    setActiveIdentifiedThemes("");
    setActiveWhiteboardContent("");
    setActiveGeneratedImageDataUri(null);
    setActiveNewInsights("");
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

  const handleNewCycleStart = (transcription: string, isFromInsights = false) => {
    if (!isFromInsights && sessionCycles.length >= MAX_CYCLES) {
      toast({ title: "Max cyklusser nået", description: `Du kan maksimalt have ${MAX_CYCLES} analysecyklusser.`, variant: "default" });
      return false;
    }
    resetActiveCycleOutputs(!isFromInsights); // Behold transskription hvis den kommer fra indsigter
    setActiveTranscription(transcription);
    return true;
  }

  const handleAudioTranscription = async (audioDataUri: string) => {
    if (!handleNewCycleStart("Optager lyd... Klik igen for at stoppe og starte AI-analyse.")) {
      setIsRecording(false); 
      return;
    }
    
    setIsTranscribing(true);
    // setActiveTranscription settes i handleNewCycleStart
    
    try {
      const input: TranscribeAudioInput = { audioDataUri };
      const result: TranscribeAudioOutput = await transcribeAudio(input);
      setActiveTranscription(result.transcription); 
      toast({ title: "Succes", description: "Automatisk transskription fuldført (simuleret)." });
      await processSummaryAndThemes(result.transcription);
    } catch (error) {
      console.error("Fejl under (simuleret) transskription:", error);
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke transskribere lyden (simuleret)");
      toast({ title: "Fejl ved transskription", description: userMessage, variant: "destructive" });
      setActiveTranscription(""); 
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

  const processSummaryAndThemes = async (transcriptionForAnalysis: string) => {
    if (!transcriptionForAnalysis.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke opsummere eller identificere temaer.", variant: "default" });
      return;
    }
    setIsProcessingSummaryAndThemes(true); 
    setActiveSummary(""); 
    setActiveIdentifiedThemes("");
    
    let summaryResultText = "";
    let themesResultText = "Generelle temaer"; 

    try {
      const summaryInput: SummarizeTranscriptionInput = { transcription: transcriptionForAnalysis };
      const summaryResult = await summarizeTranscription(summaryInput);

      if (summaryResult && typeof summaryResult.summary === 'string' && summaryResult.summary.trim() !== "") {
        summaryResultText = summaryResult.summary;
        setActiveSummary(summaryResultText);
        toast({ title: "Succes", description: "Transskription opsummeret." });

        try {
          const themesInput: IdentifyThemesInput = { textToAnalyze: summaryResult.summary };
          const themesResult = await identifyThemes(themesInput);
          if (themesResult && typeof themesResult.identifiedThemesText === 'string' && themesResult.identifiedThemesText.trim() !== "") {
            themesResultText = themesResult.identifiedThemesText;
            setActiveIdentifiedThemes(themesResultText);
            toast({ title: "Succes", description: "Temaer identificeret." });
          } else {
            setActiveIdentifiedThemes(themesResultText); 
            toast({ title: "Info", description: "Ingen specifikke temaer identificeret. Bruger generelle temaer.", variant: "default" });
          }
        } catch (themeError) {
          setActiveIdentifiedThemes(themesResultText);
          const userMessage = getAIUserErrorMessage(themeError, "Kunne ikke identificere temaer");
          toast({ title: "Fejl ved temaanalyse", description: userMessage, variant: "destructive" });
        }
      } else {
        summaryResultText = transcriptionForAnalysis; 
        setActiveSummary(summaryResultText);
        setActiveIdentifiedThemes(themesResultText);
        toast({ title: "Fejl", description: "Intet gyldigt resumé modtaget. Bruger fuld transskription.", variant: "destructive" });
      }
    } catch (summaryError) {
      summaryResultText = transcriptionForAnalysis; 
      setActiveSummary(summaryResultText);
      setActiveIdentifiedThemes(themesResultText);
      const userMessage = getAIUserErrorMessage(summaryError, "Kunne ikke opsummere transskription");
      toast({ title: "Fejl ved opsummering", description: userMessage, variant: "destructive" });
    } finally {
      setIsProcessingSummaryAndThemes(false);
      await processGenerateWhiteboardIdeas(transcriptionForAnalysis, themesResultText, summaryResultText);
    }
  };
  
  const processGenerateWhiteboardIdeas = async (transcriptionContext: string, themesContext: string, summaryContext: string) => {
    if (!transcriptionContext.trim()) {
      toast({ title: "Fejl", description: "Transskription er tom for idégenerering.", variant: "destructive" });
      await processGenerateImage(themesContext.trim() || summaryContext.substring(0,150).trim() || "abstrakt visualisering", summaryContext);
      return;
    }
    setIsGeneratingWhiteboard(true);
    setActiveWhiteboardContent("");
    
    try {
      const input: GenerateWhiteboardIdeasInput = {
        transcription: transcriptionContext,
        identifiedThemes: themesContext,
        currentWhiteboardContent: "",
      };
      const result = await generateWhiteboardIdeas(input);
      setActiveWhiteboardContent(result.refinedWhiteboardContent);
      toast({ title: "Succes", description: "Whiteboard-indhold opdateret." });
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere whiteboard-idéer");
      toast({ title: "Fejl ved idégenerering", description: userMessage, variant: "destructive" });
    } finally {
      setIsGeneratingWhiteboard(false);
      const imagePrompt = themesContext.trim() || summaryContext.substring(0,150).trim() || "abstrakt visualisering af diskussion";
      await processGenerateImage(imagePrompt, summaryContext);
    }
  };
  
  const processGenerateImage = async (promptForImage: string, contextForInsights: string) => {
    if (!promptForImage.trim()) {
      toast({ title: "Info", description: "Ingen prompt til billedgenerering. Fortsætter uden billede.", variant: "default" });
      await processGenerateInsights("", contextForInsights);
      return;
    }
    setIsGeneratingImage(true);
    setActiveGeneratedImageDataUri(null); 
    let imageDataUriForInsights = "";
    try {
      const styledPrompt = `Omsæt følgende koncepter til en **metaforisk og visuel whiteboard-tegning eller skitse**: ${promptForImage}. Billedet skal være i widescreen 16:9 format og have en minimalistisk stil, som en hurtig whiteboard-tegning med primært sort tusch på hvid baggrund, eventuelt med få accentfarver (blå/grøn). Undgå meget tekst; fokuser på at bruge **symboler, metaforer, diagrammer eller simple abstrakte illustrationer** til at repræsentere koncepterne på en tankevækkende måde.`;
      const input: GenerateImageInput = { prompt: styledPrompt };
      const result = await generateImage(input);
      imageDataUriForInsights = result.imageDataUri;
      setActiveGeneratedImageDataUri(result.imageDataUri);
      toast({ title: "Succes", description: "Billede genereret." });
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere billede");
      toast({ title: "Fejl ved billedgenerering", description: userMessage, variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
      await processGenerateInsights(imageDataUriForInsights, contextForInsights);
    }
  };

  const processGenerateInsights = async (imageDataUri: string, conversationContext: string) => {
    if (!conversationContext.trim()) { 
      toast({ title: "Info", description: "Manglende samtalekontekst. Kan ikke generere indsigter.", variant: "default" });
      saveCompletedCycle(imageDataUri || "", "Ingen indsigter genereret pga. manglende kontekst.");
      return;
    }
    setIsGeneratingInsights(true);
    setActiveNewInsights(""); 
    let insightsText = "Ingen indsigter genereret.";
    try {
      const input: GenerateInsightsInput = { 
        imageDataUri: imageDataUri || "",
        conversationContext 
      };
      const result = await generateInsights(input);
      insightsText = result.insightsText;
      setActiveNewInsights(insightsText);
      toast({ title: "Succes", description: "Nye AI-indsigter genereret." });
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Kunne ikke generere nye indsigter");
      toast({ title: "Fejl ved Indsigtsgenerering", description: userMessage, variant: "destructive" });
    } finally {
      setIsGeneratingInsights(false);
      saveCompletedCycle(imageDataUri || "", insightsText);
    }
  };

  const saveCompletedCycle = (finalImageDataUri: string, finalInsightsText: string) => {
    const newCycle: CycleData = {
      id: `${Date.now()}-${Math.random()}`, // Simpel unik ID
      transcription: activeTranscription,
      summary: activeSummary,
      identifiedThemes: activeIdentifiedThemes,
      whiteboardContent: activeWhiteboardContent,
      generatedImageDataUri: finalImageDataUri,
      newInsights: finalInsightsText,
    };
    setSessionCycles(prevCycles => {
        const updatedCycles = [...prevCycles, newCycle];
        // Nulstil kun aktive states her, efter cyklus er gemt, hvis det er sidste cyklus
        if (updatedCycles.length >= MAX_CYCLES) {
            // Gør klar til at vise "Max cyklusser nået" ved at rydde aktiv transskription
            // medmindre vi er i et "Brug Indsigter" flow.
            // Dette håndteres bedre af canStartNewCycle i ControlsPanel.
        }
        return updatedCycles;
    });
  };

  const handleUseInsightsForNewCycle = (insightsFromPreviousCycle: string) => {
    if (!handleNewCycleStart(insightsFromPreviousCycle, true)) return; // true for isFromInsights

    toast({ 
      title: "Ny Samtale Startet med Indsigter", 
      description: "Indsigter er indsat. Klik på 'Start AI Analyse med Tekst' i kontrolpanelet for at behandle." 
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
  
  // Data for whiteboard og billede skal være den seneste *afsluttede* cyklus,
  // ELLER den *aktive* hvis en proces kører.
  let wbContentToShow = activeWhiteboardContent;
  let imgUriToShow = activeGeneratedImageDataUri;

  if (!isAnyAIProcessRunning && sessionCycles.length > 0) {
    const lastCompletedCycle = sessionCycles[sessionCycles.length - 1];
    wbContentToShow = lastCompletedCycle.whiteboardContent;
    imgUriToShow = lastCompletedCycle.generatedImageDataUri;
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <div className="flex flex-col gap-4 flex-grow">
          <div className="w-full flex flex-col">
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
          <div className="w-full flex flex-col">
            <WhiteboardPanel
              whiteboardContent={wbContentToShow}
              setWhiteboardContent={setActiveWhiteboardContent} 
              generatedImageDataUri={imgUriToShow}
              isGeneratingImage={isGeneratingImage && !activeGeneratedImageDataUri}
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
            isLoadingActiveSummaryAndThemes={isProcessingSummaryAndThemes && (!activeSummary || !activeIdentifiedThemes)}
            isLoadingActiveInsights={isGeneratingInsights && !activeNewInsights}
            onUseInsightsForNewCycle={handleUseInsightsForNewCycle}
            isAnyAIProcessRunning={isAnyAIProcessRunning || isRecording}
            canStartNewCycle={sessionCycles.length < MAX_CYCLES}
          />
        </div>
      </main>
    </div>
  );
}

    