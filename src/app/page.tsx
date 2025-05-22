
"use client";

import { useState } from 'react';
import { AppHeader } from "@/components/app-header";
import { InfoPanel } from "@/components/info-panel";
import { WhiteboardPanel } from "@/components/whiteboard-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { ResultsPanel } from "@/components/results-panel";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

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
import { generateSessionReport } from '@/ai/flows/generate-session-report-flow';
import type { GenerateSessionReportInput, GenerateSessionReportOutput, CycleDataForReport } from '@/ai/flows/generate-session-report-flow';


export interface CycleData {
  id: string;
  transcription: string;
  summary: string;
  identifiedThemes: string;
  whiteboardContent: string;
  generatedImageDataUri: string; 
  newInsights: string; 
}

const MAX_CYCLES = 5;
const FALLBACK_ERROR_MESSAGE = "En uventet AI-fejl opstod.";
const FALLBACK_EMPTY_TRANSCRIPTION = "Transskription utilgængelig";
const FALLBACK_EMPTY_SUMMARY = "Resumé utilgængeligt.";
const FALLBACK_EMPTY_THEMES = "Temaer utilgængelige.";
const FALLBACK_EMPTY_WHITEBOARD = "Whiteboard-indhold utilgængeligt.";
const FALLBACK_EMPTY_IMAGE = "Billedgenerering fejlede eller intet billede returneret.";
const FALLBACK_EMPTY_INSIGHTS = "Ingen specifikke nye indsigter kunne udledes.";


export default function SynapseScribblePage() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userOrganization, setUserOrganization] = useState('');

  const [activeTranscription, setActiveTranscription] = useState<string>("");
  const [activeSummary, setActiveSummary] = useState<string>(FALLBACK_EMPTY_SUMMARY);
  const [activeIdentifiedThemes, setActiveIdentifiedThemes] = useState<string>(FALLBACK_EMPTY_THEMES);
  const [activeWhiteboardContent, setActiveWhiteboardContent] = useState<string>(FALLBACK_EMPTY_WHITEBOARD);
  const [activeGeneratedImageDataUri, setActiveGeneratedImageDataUri] = useState<string>(FALLBACK_EMPTY_IMAGE);
  const [activeNewInsights, setActiveNewInsights] = useState<string>(FALLBACK_EMPTY_INSIGHTS);
  
  const [sessionCycles, setSessionCycles] = useState<CycleData[]>([]);
  const [sessionReport, setSessionReport] = useState<string>("");
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);


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
      toast({ title: "Max cyklusser nået", description: `Du kan maksimalt have ${MAX_CYCLES} analysecyklusser. Nulstil sessionen for flere.`, variant: "default" });
      return false;
    }
    resetActiveCycleOutputs(!isFromInsights); 
    setActiveTranscription(transcription);
    return true;
  }

  const handleAudioTranscription = async (audioDataUri: string): Promise<Omit<CycleData, 'id' | 'whiteboardContent' | 'generatedImageDataUri' | 'newInsights'>> => {
    if (!handleNewCycleStart("Optager lyd... Klik igen for at stoppe og starte AI-analyse.")) {
      setIsRecording(false); 
      return { transcription: FALLBACK_EMPTY_TRANSCRIPTION, summary: FALLBACK_EMPTY_SUMMARY, identifiedThemes: FALLBACK_EMPTY_THEMES };
    }
    
    setIsTranscribing(true);
    setActiveTranscription("Transskriberer..."); // Show loading in active transcription
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
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved transskription");
      toast({ title: "Fejl ved transskription", description: userMessage, variant: "destructive" });
      transcriptionResultText = userMessage; 
      setActiveTranscription(transcriptionResultText); 
    } finally {
      setIsTranscribing(false);
    }
    return await processSummaryAndThemes(transcriptionResultText); 
  };
  
  const handleStartAnalysisFromText = async (currentTranscription: string): Promise<Omit<CycleData, 'id' | 'whiteboardContent' | 'generatedImageDataUri' | 'newInsights'>> => {
    if (!currentTranscription.trim()) {
      toast({ title: "Info", description: "Transskription er tom. Kan ikke starte analyse.", variant: "default" });
      return { transcription: currentTranscription, summary: FALLBACK_EMPTY_SUMMARY, identifiedThemes: FALLBACK_EMPTY_THEMES };
    }
    if (!handleNewCycleStart(currentTranscription)) {
      return { transcription: currentTranscription, summary: FALLBACK_EMPTY_SUMMARY, identifiedThemes: FALLBACK_EMPTY_THEMES };
    }
    toast({ title: "AI Analyse Startet", description: "Behandler den angivne tekst..." });
    return await processSummaryAndThemes(currentTranscription);
  };

  const processSummaryAndThemes = async (transcriptionForAnalysis: string): Promise<Omit<CycleData, 'id' | 'whiteboardContent' | 'generatedImageDataUri' | 'newInsights'>> => {
    let currentSummary = FALLBACK_EMPTY_SUMMARY;
    let currentThemes = FALLBACK_EMPTY_THEMES;
    setActiveSummary("Opsummerer..."); // Show loading in active summary
    setActiveIdentifiedThemes("Identificerer temaer..."); // Show loading for themes

    if (transcriptionForAnalysis.startsWith("Fejl") || transcriptionForAnalysis === FALLBACK_EMPTY_TRANSCRIPTION || transcriptionForAnalysis.trim() === "" || transcriptionForAnalysis.startsWith("Optager lyd...")) {
      toast({ title: "Info", description: "Ugyldig transskription. Kan ikke opsummere/identificere temaer.", variant: "default" });
      currentSummary = transcriptionForAnalysis; 
      currentThemes = "Temaanalyse sprunget over pga. ugyldig transskription.";
    } else {
      setIsProcessingSummaryAndThemes(true); 
      try {
        const summaryInput: SummarizeTranscriptionInput = { transcription: transcriptionForAnalysis };
        const summaryResult = await summarizeTranscription(summaryInput);

        if (!summaryResult || !summaryResult.summary || summaryResult.summary.trim() === "" || summaryResult.summary.startsWith("Fejl") || summaryResult.summary.startsWith("Kunne ikke")) {
          currentSummary = summaryResult?.summary || "Ugyldigt resumé modtaget";
          toast({ title: "Fejl ved opsummering", description: currentSummary, variant: "destructive" });
          currentThemes = "Temaanalyse sprunget over pga. fejl i opsummering.";
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
        currentThemes = "Temaanalyse fejlede.";
      } finally {
        setIsProcessingSummaryAndThemes(false);
      }
    }
    setActiveSummary(currentSummary); 
    setActiveIdentifiedThemes(currentThemes);
    return await processGenerateWhiteboardIdeas(transcriptionForAnalysis, currentThemes, currentSummary);
  };
  
  const processGenerateWhiteboardIdeas = async (transcriptionCtx: string, themesCtx: string, summaryCtx: string): Promise<Omit<CycleData, 'id' | 'generatedImageDataUri' | 'newInsights'>> => {
    let currentWhiteboardContent = FALLBACK_EMPTY_WHITEBOARD;
    setActiveWhiteboardContent("Genererer whiteboard-idéer..."); // Show loading
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
    
    let imagePromptForAI = FALLBACK_EMPTY_SUMMARY; 
    if (themesCtx && !themesCtx.startsWith("Fejl") && themesCtx !== FALLBACK_EMPTY_THEMES && !themesCtx.startsWith("Ingen specifikke temaer") && themesCtx.trim() !== "") {
      imagePromptForAI = themesCtx; 
    } else if (summaryCtx && !summaryCtx.startsWith("Fejl") && summaryCtx !== FALLBACK_EMPTY_SUMMARY && summaryCtx.trim() !== "") {
      imagePromptForAI = summaryCtx;
    }
    
    const insightsContext = summaryCtx; 

    return await processGenerateImage(transcriptionCtx, summaryCtx, themesCtx, currentWhiteboardContent, imagePromptForAI, insightsContext);
  };
  
  const processGenerateImage = async (
    transcriptionForChain: string,
    summaryForChain: string,
    themesForChain: string,
    whiteboardContentForChain: string,
    promptForImage: string, 
    contextForInsights: string
  ): Promise<Omit<CycleData, 'id' | 'newInsights'>> => {
    let currentImageDataUri = FALLBACK_EMPTY_IMAGE;
    setActiveGeneratedImageDataUri("Genererer billede..."); // Show loading
    let coreImagePrompt = promptForImage;
    let imageStyleInstruction = "metaforisk og visuel whiteboard-tegning eller skitse. Minimalistisk, som en hurtig whiteboard-tegning med primært sort tusch på hvid baggrund, eventuelt med få accentfarver (blå/grøn). Undgå meget tekst; fokuser på symboler, metaforer, diagrammer eller simple abstrakte illustrationer. Format: widescreen 16:9.";

    if (!coreImagePrompt || coreImagePrompt.trim() === '' || 
        coreImagePrompt.startsWith("Fejl") || 
        coreImagePrompt.startsWith("Kunne ikke") ||
        coreImagePrompt.startsWith("Ingen specifikke temaer") ||
        coreImagePrompt === FALLBACK_EMPTY_SUMMARY ||
        coreImagePrompt === FALLBACK_EMPTY_THEMES ||
        coreImagePrompt.startsWith("Ugyldig") ||
        coreImagePrompt.startsWith("Kan ikke") ||
        contextForInsights.startsWith("Fejl") || contextForInsights === FALLBACK_EMPTY_SUMMARY) {
       toast({ title: "Info", description: "Forrige trin fejlede eller manglede meningsfuldt input til billedprompt. Kan ikke generere billede.", variant: "default" });
       currentImageDataUri = "Billedgenerering sprunget over pga. tidligere fejl eller manglende meningsfuldt input til prompt.";
    } else {
      setIsGeneratingImage(true);
      try {        
        const input: GenerateImageInput = { prompt: coreImagePrompt, style: imageStyleInstruction };
        const result = await generateImage(input);
        if (!result || !result.imageDataUri || result.imageDataUri.trim() === "" || result.imageDataUri.startsWith("Fejl") || result.imageDataUri.startsWith("Ugyldig prompt") || result.imageDataUri.startsWith("Ugyldig KERNEL")) {
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
    return await processGenerateInsights(transcriptionForChain, summaryForChain, themesForChain, whiteboardContentForChain, currentImageDataUri, contextForInsights);
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
    setActiveNewInsights("Genererer nye indsigter..."); // Show loading
     if (imageDataUri.startsWith("Fejl") || imageDataUri === FALLBACK_EMPTY_IMAGE || imageDataUri.startsWith("Billedgenerering sprunget") ||
         conversationContext.startsWith("Fejl") || conversationContext === FALLBACK_EMPTY_SUMMARY) {
       toast({ title: "Info", description: "Forrige trin fejlede eller manglede input. Kan ikke generere indsigter.", variant: "default" });
       currentNewInsights = imageDataUri.startsWith("Fejl") ? imageDataUri : (conversationContext.startsWith("Fejl") ? conversationContext : "Indsigtsgenerering sprunget over pga. tidligere fejl eller manglende input.");
    } else {
      setIsGeneratingInsights(true);
      try {
        const input: GenerateInsightsInput = { imageDataUri, conversationContext };
        const result = await generateInsights(input);
        if (!result || !result.insightsText || result.insightsText.trim() === "" || result.insightsText.startsWith("Fejl") || result.insightsText.startsWith("Kunne ikke") || result.insightsText.startsWith("Ingen specifikke nye indsigter")) {
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
    
    saveCompletedCycle({
      transcription,
      summary,
      identifiedThemes: themes,
      whiteboardContent,
      generatedImageDataUri: imageDataUri,
      newInsights: currentNewInsights,
    });
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
      transcription: dataForCycle.transcription,
      summary: dataForCycle.summary,
      identifiedThemes: dataForCycle.identifiedThemes,
      whiteboardContent: dataForCycle.whiteboardContent,
      generatedImageDataUri: dataForCycle.generatedImageDataUri,
      newInsights: dataForCycle.newInsights,
    };
    
    setSessionCycles(prevCycles => {
      const updatedCycles = [...prevCycles, newCycle];
      if (updatedCycles.length < MAX_CYCLES) {
        setActiveSummary(FALLBACK_EMPTY_SUMMARY);
        setActiveIdentifiedThemes(FALLBACK_EMPTY_THEMES);
        setActiveNewInsights(FALLBACK_EMPTY_INSIGHTS);
        // Whiteboard and image are kept from the last cycle for display until a new one starts
      } else {
        // Max cycles reached, reset all active outputs except transcription if it was from insights
        resetActiveCycleOutputs(activeTranscription === dataForCycle.newInsights);
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
  
  const handleResetSession = () => {
    resetActiveCycleOutputs(false); // keepTranscription = false
    setSessionCycles([]);
    setSessionReport(""); // Also reset the generated report
    toast({ title: "Session Nulstillet", description: "Alle data er ryddet. Du kan starte forfra." });
  };

  const handleGenerateSessionReport = async () => {
    if (sessionCycles.length === 0) {
      toast({ title: "Ingen data", description: "Der er ingen gennemførte cyklusser at generere rapport fra.", variant: "default" });
      return;
    }
    setIsGeneratingReport(true);
    setSessionReport("Genererer rapport...");
    try {
      const cyclesForReport: CycleDataForReport[] = sessionCycles.map(cycle => ({
        id: cycle.id,
        transcription: cycle.transcription,
        summary: cycle.summary,
        identifiedThemes: cycle.identifiedThemes,
        whiteboardContent: cycle.whiteboardContent,
        generatedImageDataUri: cycle.generatedImageDataUri,
        newInsights: cycle.newInsights,
      }));

      const reportTitle = `AI Analyse Rapport - ${new Date().toLocaleDateString('da-DK')}`;
      
      const input: GenerateSessionReportInput = { 
        sessionCycles: cyclesForReport,
        reportTitle,
        projectName: userOrganization || "Ikke specificeret",
        contactPersons: `${userName || "N/A"} (${userEmail || "N/A"})`,
        userName: userName,
        userEmail: userEmail,
        userOrganization: userOrganization,
       };
      const result = await generateSessionReport(input);

      if (!result || !result.reportText || result.reportText.trim() === "" || result.reportText.startsWith("Fejl") || result.reportText.startsWith("Kunne ikke")) {
        const errorMsg = result?.reportText || "Sessionsrapporten kunne ikke genereres eller returnerede tomt resultat.";
        toast({ title: "Fejl ved Rapportgenerering", description: errorMsg, variant: "destructive" });
        setSessionReport(errorMsg);
      } else {
        setSessionReport(result.reportText);
        toast({ title: "Succes", description: "Sessionsrapport genereret." });
      }
    } catch (error) {
      const userMessage = getAIUserErrorMessage(error, "Fejl ved generering af sessionsrapport");
      toast({ title: "Fejl", description: userMessage, variant: "destructive" });
      setSessionReport(userMessage);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDownloadSessionReportAsMarkdown = () => {
    if (!sessionReport || sessionReport.trim() === "" || sessionReport.startsWith("Genererer") || sessionReport.startsWith("Fejl") || sessionReport.startsWith("Kunne ikke")) {
      toast({ title: "Ingen rapport", description: "Der er ingen rapport at downloade.", variant: "default" });
      return;
    }
    const blob = new Blob([sessionReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `FraimeWorksLite_SessionRapport_${timestamp}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Download Startet", description: "Sessionsrapport downloades som Markdown-fil." });
  };

  const handleDownloadSessionReportAsPdf = () => {
    if (!sessionReport || sessionReport.trim() === "" || sessionReport.startsWith("Genererer") || sessionReport.startsWith("Fejl") || sessionReport.startsWith("Kunne ikke")) {
      toast({ title: "Ingen rapport", description: "Der er ingen rapport at downloade som PDF.", variant: "default" });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      let currentY = margin;
      const lineHeight = 6; // Approximate line height in mm

      // Helper to add text and handle page breaks
      const addText = (text: string, size: number, style: string | string[] = 'normal', indent = 0) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style); // Use a standard font
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - indent);
        lines.forEach((line: string) => {
          if (currentY + lineHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
          }
          doc.text(line, margin + indent, currentY);
          currentY += lineHeight;
        });
      };
      
      const reportLines = sessionReport.split('\n');

      reportLines.forEach(line => {
        if (line.startsWith('# Rapporttitel:')) { // H1 for main title
            addText(line.substring(2), 18, 'bold');
            currentY += lineHeight / 2; // Extra space after main title
        } else if (line.startsWith('## ')) { // H2
          currentY += lineHeight / 2; // Space before H2
          addText(line.substring(3), 14, 'bold');
          currentY += lineHeight / 4;
        } else if (line.startsWith('### ')) { // H3
          currentY += lineHeight / 4; // Space before H3
          addText(line.substring(4), 12, 'bold');
        } else if (line.startsWith('*   ')) { // List item
          addText(`• ${line.substring(4)}`, 10, 'normal', 5); // Indent list items
        } else if (line.startsWith('-   ')) { // Alternative list item
          addText(`• ${line.substring(4)}`, 10, 'normal', 5);
        } else if (line.startsWith('---')) { // Separator
           if (currentY + 5 > pageHeight - margin) { doc.addPage(); currentY = margin; }
           doc.line(margin, currentY, pageWidth - margin, currentY);
           currentY += 5;
        } else {
          addText(line, 10);
        }
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`FraimeWorksLite_SessionRapport_${timestamp}.pdf`);
      toast({ title: "PDF Download Startet", description: "Sessionsrapport downloades som PDF-fil." });

    } catch (error) {
        console.error("Fejl ved PDF-generering af sessionsrapport:", error);
        const userMessage = getAIUserErrorMessage(error, "Fejl ved PDF-generering af sessionsrapport");
        toast({ title: "Fejl", description: userMessage, variant: "destructive" });
    }
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
  
  const isPreparingNewCycleViaText = activeTranscription !== "" && 
                                     !activeTranscription.startsWith("Fejl") && 
                                     !activeTranscription.startsWith("Optager lyd...") && 
                                     activeSummary === FALLBACK_EMPTY_SUMMARY && 
                                     activeIdentifiedThemes === FALLBACK_EMPTY_THEMES &&
                                     activeWhiteboardContent === FALLBACK_EMPTY_WHITEBOARD &&
                                     activeGeneratedImageDataUri === FALLBACK_EMPTY_IMAGE &&
                                     activeNewInsights === FALLBACK_EMPTY_INSIGHTS;
  
  if (!isAnyAIProcessRunning && !isPreparingNewCycleViaText && sessionCycles.length > 0 && activeTranscription === "" && activeSummary === FALLBACK_EMPTY_SUMMARY) {
    const lastCompletedCycle = sessionCycles[sessionCycles.length - 1];
    if (lastCompletedCycle) {
        if (wbContentToShow === FALLBACK_EMPTY_WHITEBOARD) wbContentToShow = lastCompletedCycle.whiteboardContent;
        if (imgUriToShow === FALLBACK_EMPTY_IMAGE) imgUriToShow = lastCompletedCycle.generatedImageDataUri;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col gap-4 p-4 container mx-auto">
        <InfoPanel 
            userName={userName} setUserName={setUserName}
            userEmail={userEmail} setUserEmail={setUserEmail}
            userOrganization={userOrganization} setUserOrganization={setUserOrganization}
            maxCycles={MAX_CYCLES}
        />
        <div className="flex flex-col gap-4">
          <ControlsPanel
            transcription={activeTranscription} 
            setTranscription={setActiveTranscription} 
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onAudioTranscription={handleAudioTranscription}
            onStartAnalysisFromText={handleStartAnalysisFromText}
            onResetSession={handleResetSession}
            isAnyAIProcessRunning={isAnyAIProcessRunning || isRecording}
            currentLoadingStateForControls={currentLoadingStateText()}
            canStartNewCycle={sessionCycles.length < MAX_CYCLES}
            sessionCyclesLength={sessionCycles.length}
            maxCycles={MAX_CYCLES}
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
              whiteboard: FALLBACK_EMPTY_WHITEBOARD, 
              image: FALLBACK_EMPTY_IMAGE,           
              transcription: FALLBACK_EMPTY_TRANSCRIPTION 
            }}
            sessionReport={sessionReport}
            isGeneratingReport={isGeneratingReport}
            onGenerateSessionReport={handleGenerateSessionReport}
            onDownloadSessionReportAsMarkdown={handleDownloadSessionReportAsMarkdown}
            onDownloadSessionReportAsPdf={handleDownloadSessionReportAsPdf}
            userName={userName}
            userEmail={userEmail}
            userOrganization={userOrganization}
            maxCycles={MAX_CYCLES}
          />
        </div>
      </main>
    </div>
  );
}

    