
"use client";

import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquarePlus, Download, Brain, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { CycleData } from '@/app/page'; 
import { Separator } from '@/components/ui/separator';

interface ResultsPanelProps {
  sessionCycles: CycleData[];
  activeCycleData: { 
    summary: string;
    identifiedThemes: string;
    newInsights: string;
  };
  isLoadingActiveSummaryAndThemes: boolean;
  isLoadingActiveInsights: boolean;
  onUseInsightsForNewCycle: (insights: string) => void;
  isAnyAIProcessRunning: boolean;
  canStartNewCycle: boolean;
  fallbacks: { 
    summary: string;
    themes: string;
    insights: string;
  };
}

// Helper function to add a text section to the PDF
const addTextSectionToPdf = (
  doc: jsPDF,
  title: string,
  content: string | null | undefined,
  currentY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  isPreformatted = false,
  fallbacks: { summary: string, themes: string, insights: string }
): number => {
  let y = currentY;
  if (y + 10 > pageHeight - margin) { 
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 7;
  doc.setFontSize(11);
  
  const fallbackContent = title.includes("Resumé") ? fallbacks.summary : 
                         title.includes("Temaer") ? fallbacks.themes :
                         title.includes("Indsigter") ? fallbacks.insights :
                         "Intet indhold genereret eller tilgængeligt.";

  if (content && content.trim() && !content.startsWith("Fejl") && !content.startsWith("Kunne ikke") && !content.startsWith("Ingen specifikke") && content !== fallbackContent) {
    const lines = doc.splitTextToSize(content, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      if (y + (isPreformatted ? 5 : 6) > pageHeight - margin) { 
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += (isPreformatted ? 5 : 6); 
    });
  } else {
    if (y + 6 > pageHeight - margin) {
        doc.addPage();
        y = margin;
    }
    doc.setTextColor(150);
    doc.text(content && content.trim() ? content : fallbackContent, margin, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 5; 
  return y;
};

// Helper function to add an image section to the PDF
const addImageSectionToPdf = (
  doc: jsPDF,
  title: string,
  imageDataUri: string | null | undefined,
  currentY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  fallbackImageText: string
): number => {
  let y = currentY;
  if (y + 10 > pageHeight - margin) { 
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 7;

  if (imageDataUri && imageDataUri.startsWith('data:image')) {
    if (y + 80 > pageHeight - margin) { // Approximate height for image section
      doc.addPage();
      y = margin;
      // Re-add title on new page if needed
      doc.setFontSize(14);
      doc.text(title, margin, y);
      y += 7;
    }
    try {
      const imgProps = doc.getImageProperties(imageDataUri);
      const aspectRatio = imgProps.width / imgProps.height;
      let imgWidth = (pageWidth - margin * 2) * 0.75; 
      let imgHeight = imgWidth / aspectRatio;
      const maxHeight = pageHeight - y - margin - 5; 
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      if (imgWidth > (pageWidth - margin * 2)) {
        imgWidth = (pageWidth - margin * 2);
        imgHeight = imgWidth / aspectRatio;
      }

      const x = (pageWidth - imgWidth) / 2; 
      doc.addImage(imageDataUri, imgProps.fileType, x, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    } catch (e) {
      console.error("Fejl ved tilføjelse af billede til PDF:", e);
      if (y + 10 > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.setTextColor(150);
      doc.text("Fejl: Kunne ikke indlæse billede i PDF.", margin, y);
      doc.setTextColor(0);
      y += 10;
    }
  } else {
     if (y + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin;
        // Re-add title on new page if needed
        doc.setFontSize(14);
        doc.text(title, margin, y);
        y += 7;
      }
    doc.setFontSize(11);
    doc.setTextColor(150);
    doc.text(imageDataUri && (imageDataUri.includes("Fejl") || imageDataUri.includes("Ugyldig prompt") || imageDataUri === fallbackImageText) ? imageDataUri : fallbackImageText, margin, y);
    doc.setTextColor(0);
    y += 10;
  }
  return y;
};


export function ResultsPanel({
  sessionCycles,
  activeCycleData,
  isLoadingActiveSummaryAndThemes,
  isLoadingActiveInsights,
  onUseInsightsForNewCycle,
  isAnyAIProcessRunning,
  canStartNewCycle,
  fallbacks,
}: ResultsPanelProps) {
  const { toast } = useToast();

  const generatePdfForCycles = (cyclesToPrint: CycleData[], isForAllCycles: boolean) => {
    if (cyclesToPrint.length === 0) {
      toast({title: "Info", description: "Ingen data at generere PDF fra.", variant: "default"});
      return;
    }
    
    if (isForAllCycles && cyclesToPrint.every(c => 
        c.summary === fallbacks.summary && 
        c.identifiedThemes === fallbacks.themes &&
        c.newInsights === fallbacks.insights &&
        c.whiteboardContent === fallbacks.themes && 
        c.generatedImageDataUri === fallbacks.themes 
    )) {
        toast({title: "Info", description: "Ingen meningsfulde data i nogen cyklus at generere PDF fra.", variant: "default"});
        return;
    }
     if (!isForAllCycles && cyclesToPrint.length === 1 &&
        cyclesToPrint[0].summary === fallbacks.summary && 
        cyclesToPrint[0].identifiedThemes === fallbacks.themes &&
        cyclesToPrint[0].newInsights === fallbacks.insights &&
        cyclesToPrint[0].whiteboardContent === fallbacks.themes &&
        cyclesToPrint[0].generatedImageDataUri === fallbacks.themes
       ) {
        toast({title: "Info", description: "Ingen meningsfulde data i seneste afsluttede cyklus at generere PDF fra.", variant: "default"});
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

      const now = new Date();
      doc.setFontSize(18);
      const pdfTitle = isForAllCycles 
        ? `FraimeWorks Lite - Alle Resultater (${cyclesToPrint.length} Cyklusser)` 
        : `FraimeWorks Lite - Resultater (Cyklus ${sessionCycles.indexOf(cyclesToPrint[0]) + 1})`;
      doc.text(pdfTitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      doc.setFontSize(10);
      doc.text(`Genereret: ${now.toLocaleString('da-DK')}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      cyclesToPrint.forEach((cycleData, index) => {
        if (index > 0) { // Add page break before new cycle, except for the first one
          doc.addPage();
          currentY = margin;
        }
        
        if (isForAllCycles) {
            doc.setFontSize(16);
            doc.text(`Cyklus ${sessionCycles.indexOf(cycleData) + 1}`, margin, currentY);
            currentY += 10;
        }

        currentY = addTextSectionToPdf(doc, "Transskription", cycleData.transcription, currentY, pageWidth, pageHeight, margin, false, fallbacks);
        currentY = addTextSectionToPdf(doc, "Resumé af Samtale", cycleData.summary, currentY, pageWidth, pageHeight, margin, false, fallbacks);
        const themesText = (cycleData.identifiedThemes && cycleData.identifiedThemes !== fallbacks.themes && !cycleData.identifiedThemes.startsWith("Fejl") && !cycleData.identifiedThemes.startsWith("Kunne ikke") && !cycleData.identifiedThemes.startsWith("Ingen specifikke temaer")) 
            ? cycleData.identifiedThemes.split(',').map(t => `- ${t.trim()}`).join('\n') 
            : cycleData.identifiedThemes;
        currentY = addTextSectionToPdf(doc, "Identificerede Temaer", themesText, currentY, pageWidth, pageHeight, margin, true, fallbacks);
        currentY = addTextSectionToPdf(doc, "Whiteboard Indhold", cycleData.whiteboardContent, currentY, pageWidth, pageHeight, margin, true, fallbacks);
        currentY = addImageSectionToPdf(doc, "AI Genereret Billede", cycleData.generatedImageDataUri, currentY, pageWidth, pageHeight, margin, fallbacks.themes); // Using themes fallback as a generic "not available" text
        currentY = addTextSectionToPdf(doc, "Nye AI Indsigter", cycleData.newInsights, currentY, pageWidth, pageHeight, margin, false, fallbacks);
      });
      
      const filename = isForAllCycles
        ? `FraimeWorksLite_Alle_Cyklusser_${now.toISOString().split('T')[0]}.pdf`
        : `FraimeWorksLite_Resultater_Cyklus_${sessionCycles.indexOf(cyclesToPrint[0]) + 1}_${now.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast({ title: "Succes", description: "PDF genereret og download startet." });

    } catch (error) {
      console.error("Fejl ved PDF-generering:", error);
      toast({ title: "Fejl", description: `Kunne ikke generere PDF: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
  };

  const handleGenerateLatestCyclePdf = () => {
    const latestCompletedCycle = sessionCycles.length > 0 ? sessionCycles[sessionCycles.length - 1] : null;
    if (latestCompletedCycle) {
      generatePdfForCycles([latestCompletedCycle], false);
    } else {
      toast({title: "Info", description: "Ingen afsluttede cyklusser at generere PDF fra.", variant: "default"});
    }
  };

  const handleGenerateAllCyclesPdf = () => {
    if (sessionCycles.length > 0) {
      generatePdfForCycles(sessionCycles, true);
    } else {
      toast({title: "Info", description: "Ingen afsluttede cyklusser at generere PDF fra.", variant: "default"});
    }
  };


  const reversedCycles = [...sessionCycles].reverse();
  
  const noActiveDataToShow = 
    activeCycleData.summary === fallbacks.summary &&
    activeCycleData.identifiedThemes === fallbacks.themes &&
    activeCycleData.newInsights === fallbacks.insights;

  const isDisplayingActiveData = isAnyAIProcessRunning || !noActiveDataToShow;


  const ActiveCycleDisplay = () => (
    <div className={`mb-8 p-4 border border-border rounded-lg shadow-sm bg-card ${isAnyAIProcessRunning ? 'border-primary animate-pulse' : ''}`}>
      <h3 className="text-xl font-semibold mb-3 text-primary">Igangværende Cyklus {sessionCycles.length + 1}</h3>
      <div>
        <h4 className="text-lg font-semibold mb-1 text-foreground">Resumé af Samtale</h4>
        {isLoadingActiveSummaryAndThemes ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (activeCycleData.summary && activeCycleData.summary !== fallbacks.summary && !activeCycleData.summary.startsWith("Fejl") && !activeCycleData.summary.startsWith("Kunne ikke")) ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{activeCycleData.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {activeCycleData.summary === fallbacks.summary && isAnyAIProcessRunning ? "Bearbejder..." : activeCycleData.summary}
          </p>
        )}
      </div>
      <Separator className="my-3" />
      <div>
        <h4 className="text-lg font-semibold mb-1 text-foreground">Identificerede Temaer</h4>
        {isLoadingActiveSummaryAndThemes ? (
           <Skeleton className="h-8 w-full rounded-md mt-1" />
        ) : (activeCycleData.identifiedThemes && activeCycleData.identifiedThemes !== fallbacks.themes && !activeCycleData.identifiedThemes.startsWith("Fejl") && !activeCycleData.identifiedThemes.startsWith("Kunne ikke") && !activeCycleData.identifiedThemes.startsWith("Ingen specifikke temaer")) ? (
          <div className="flex flex-wrap gap-2">
            {activeCycleData.identifiedThemes.split(',').map((theme, index) => (
              <span key={index} className="inline-block bg-accent/80 text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                {theme.trim()}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {activeCycleData.identifiedThemes === fallbacks.themes && isAnyAIProcessRunning ? "Bearbejder..." : activeCycleData.identifiedThemes}
          </p>
        )}
      </div>
      <Separator className="my-3" />
      <div>
        <h4 className="text-lg font-semibold mb-1 text-foreground">Nye AI Indsigter</h4>
        {isLoadingActiveInsights ? (
          <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md mt-1">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer nye indsigter...
          </div>
        ) : (activeCycleData.newInsights && activeCycleData.newInsights !== fallbacks.insights && !activeCycleData.newInsights.startsWith("Fejl") && !activeCycleData.newInsights.startsWith("Kunne ikke") && !activeCycleData.newInsights.startsWith("Ingen specifikke")) ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{activeCycleData.newInsights}</p>
        ) : (
           <p className="text-sm text-muted-foreground italic">
             {activeCycleData.newInsights === fallbacks.insights && isAnyAIProcessRunning ? "Bearbejder..." : activeCycleData.newInsights}
           </p>
        )}
      </div>
       {(activeCycleData.newInsights && activeCycleData.newInsights !== fallbacks.insights && !activeCycleData.newInsights.startsWith("Fejl") && !activeCycleData.newInsights.startsWith("Kunne ikke") && !activeCycleData.newInsights.startsWith("Ingen specifikke") && !isAnyAIProcessRunning) && (
         <Button
            onClick={() => onUseInsightsForNewCycle(activeCycleData.newInsights)}
            variant="outline"
            className="w-full sm:w-auto mt-3"
            disabled={isAnyAIProcessRunning || !canStartNewCycle}
            aria-label={`Brug indsigter fra igangværende cyklus til ny samtale`}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Brug Indsigter fra Igangværende Cyklus
          </Button>
      )}
    </div>
  );

  return (
    <Card className="shadow-lg flex-1 flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> 
          AI Analyse Resultater
        </CardTitle>
        <CardDescription>
          Her vises resultater fra dine analysecyklusser. Du kan downloade resultater som PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1"> 
          <div className="space-y-0 p-6 pb-6">
            {isDisplayingActiveData && (
              <ActiveCycleDisplay />
            )}

            {reversedCycles.map((cycle, index) => (
              <div key={cycle.id} className="mb-8 p-4 border border-border rounded-lg shadow-sm bg-card">
                <h3 className="text-xl font-semibold mb-3 text-primary">Cyklus {sessionCycles.length - index}</h3>
                <div>
                  <h4 className="text-lg font-semibold mb-1 text-foreground">Resumé af Samtale</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {(cycle.summary && cycle.summary !== fallbacks.summary) ? cycle.summary : <span className="italic">{cycle.summary}</span>}
                  </p>
                </div>
                <Separator className="my-3" />
                <div>
                  <h4 className="text-lg font-semibold mb-1 text-foreground">Identificerede Temaer</h4>
                  {(cycle.identifiedThemes && cycle.identifiedThemes !== fallbacks.themes && !cycle.identifiedThemes.startsWith("Fejl") && !cycle.identifiedThemes.startsWith("Kunne ikke") && !cycle.identifiedThemes.startsWith("Ingen specifikke temaer")) ? (
                    <div className="flex flex-wrap gap-2">
                      {cycle.identifiedThemes.split(',').map((theme, idx) => (
                        <span key={idx} className="inline-block bg-accent/80 text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                          {theme.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{cycle.identifiedThemes}</p>
                  )}
                </div>
                <Separator className="my-3" />
                <div>
                  <h4 className="text-lg font-semibold mb-1 text-foreground">Nye AI Indsigter</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                     {(cycle.newInsights && cycle.newInsights !== fallbacks.insights) ? cycle.newInsights : <span className="italic">{cycle.newInsights}</span>}
                  </p>
                  {(cycle.newInsights && cycle.newInsights !== fallbacks.insights && !cycle.newInsights.startsWith("Fejl") && !cycle.newInsights.startsWith("Kunne ikke") && !cycle.newInsights.startsWith("Ingen specifikke")) && (
                     <Button
                        onClick={() => onUseInsightsForNewCycle(cycle.newInsights)}
                        variant="outline"
                        className="w-full sm:w-auto mt-2"
                        disabled={isAnyAIProcessRunning || !canStartNewCycle}
                        aria-label={`Brug indsigter fra cyklus ${sessionCycles.length - index} til ny samtale`}
                      >
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Brug Indsigter fra Cyklus {sessionCycles.length - index}
                      </Button>
                  )}
                </div>
                 {index < reversedCycles.length -1 && !(isDisplayingActiveData && index === 0 && reversedCycles.length > 1) && <Separator className="my-6 border-dashed" />}
              </div>
            ))}
            
            {sessionCycles.length === 0 && !isDisplayingActiveData && (
                <p className="text-sm text-muted-foreground text-center py-10">Ingen analysecyklusser er kørt endnu. Start en analyse i kontrolpanelet.</p>
            )}
          </div>
        </ScrollArea>
        
        <CardFooter className="p-6 pt-4 border-t border-border flex flex-wrap gap-2 sm:gap-4 justify-start">
          <Button 
            variant="default" 
            className="flex-1 sm:flex-none"
            onClick={handleGenerateLatestCyclePdf}
            disabled={sessionCycles.length === 0 || isAnyAIProcessRunning} 
            aria-label="Download resultater fra seneste afsluttede cyklus som PDF"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Seneste Cyklus (PDF)
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none"
            onClick={handleGenerateAllCyclesPdf}
            disabled={sessionCycles.length === 0 || isAnyAIProcessRunning} 
            aria-label="Download resultater fra alle afsluttede cyklusser som PDF"
          >
            <FileText className="mr-2 h-4 w-4" />
            Download Alle Cyklusser (PDF)
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}

    