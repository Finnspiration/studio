
"use client";

import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquarePlus, Download, Brain } from 'lucide-react';
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
  fallbacks: { // Add fallbacks as props
    summary: string;
    themes: string;
    insights: string;
  };
}

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

  const handleGeneratePdf = () => {
    const latestCompletedCycle = sessionCycles.length > 0 ? sessionCycles[sessionCycles.length - 1] : null;
    
    if (!latestCompletedCycle || 
        (latestCompletedCycle.summary === fallbacks.summary && 
         latestCompletedCycle.identifiedThemes === fallbacks.themes &&
         latestCompletedCycle.newInsights === fallbacks.insights &&
         latestCompletedCycle.whiteboardContent.startsWith("Whiteboard-indhold utilgængeligt") && // Simplified check for whiteboard
         latestCompletedCycle.generatedImageDataUri.includes("fejlede")) // Simplified check for image
       ) {
        toast({title: "Info", description: "Ingen meningsfulde data i seneste afsluttede cyklus at generere PDF fra.", variant: "default"});
        return;
    }
    
    const dataToUse = latestCompletedCycle;

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const maxLineWidth = pageWidth - margin * 2;
      let currentY = margin;

      doc.setFontSize(18);
      doc.text(`FraimeWorks Lite - Resultater (Cyklus ${sessionCycles.indexOf(dataToUse) + 1})`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      const now = new Date();
      doc.setFontSize(10);
      doc.text(`Genereret: ${now.toLocaleString('da-DK')}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      const addSection = (title: string, content: string | null | undefined, isPreformatted = false) => {
        if (currentY + 10 > pageHeight - margin) { 
          doc.addPage();
          currentY = margin;
        }
        doc.setFontSize(14);
        doc.text(title, margin, currentY);
        currentY += 7;
        doc.setFontSize(11);
        if (content && content.trim() && !content.startsWith("Fejl") && !content.startsWith("Kunne ikke") && !content.startsWith("Ingen specifikke") && content !== fallbacks.summary && content !== fallbacks.themes && content !== fallbacks.insights && !content.startsWith("Whiteboard-indhold utilgængeligt")) {
          const lines = doc.splitTextToSize(content, maxLineWidth);
          lines.forEach((line: string) => {
            if (currentY > pageHeight - margin - (isPreformatted ? 3 : 6)) { 
              doc.addPage();
              currentY = margin;
            }
            doc.text(line, margin, currentY);
            currentY += (isPreformatted ? 5 : 6); 
          });
        } else {
          doc.setTextColor(150);
          doc.text(content && content.trim() ? content : "Intet indhold genereret eller tilgængeligt.", margin, currentY);
          doc.setTextColor(0);
          currentY += 6;
        }
        currentY += 5; 
      };
      
      addSection("Transskription", dataToUse.transcription);
      addSection("Resumé af Samtale", dataToUse.summary);
      addSection("Identificerede Temaer", dataToUse.identifiedThemes && !dataToUse.identifiedThemes.startsWith("Fejl") && dataToUse.identifiedThemes !== fallbacks.themes && !dataToUse.identifiedThemes.startsWith("Ingen specifikke temaer") ? dataToUse.identifiedThemes.split(',').map(t => `- ${t.trim()}`).join('\n') : dataToUse.identifiedThemes);
      addSection("Whiteboard Indhold", dataToUse.whiteboardContent, true); 
      addSection("Nye AI Indsigter", dataToUse.newInsights);

      if (dataToUse.generatedImageDataUri && !dataToUse.generatedImageDataUri.startsWith("Fejl") && !dataToUse.generatedImageDataUri.startsWith("Ugyldig prompt") && !dataToUse.generatedImageDataUri.includes("fejlede")) {
        if (currentY + 80 > pageHeight - margin) { 
          doc.addPage();
          currentY = margin;
        }
        doc.setFontSize(14);
        doc.text("AI Genereret Billede", margin, currentY);
        currentY += 7;
        try {
          if (dataToUse.generatedImageDataUri.startsWith('data:image')) {
            const imgProps = doc.getImageProperties(dataToUse.generatedImageDataUri);
            const aspectRatio = imgProps.width / imgProps.height;
            let imgWidth = maxLineWidth * 0.75; 
            let imgHeight = imgWidth / aspectRatio;
            const maxHeight = pageHeight - currentY - margin - 5; 
            
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = imgHeight * aspectRatio;
            }
            if (imgWidth > maxLineWidth) {
              imgWidth = maxLineWidth;
              imgHeight = imgWidth / aspectRatio;
            }

            const x = (pageWidth - imgWidth) / 2; 
            doc.addImage(dataToUse.generatedImageDataUri, imgProps.fileType, x, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
          } else {
             doc.setTextColor(150);
             doc.text("Fejl: Ugyldigt billedformat for PDF.", margin, currentY);
             doc.setTextColor(0);
             currentY += 10;
          }
        } catch (e) {
          console.error("Fejl ved tilføjelse af billede til PDF:", e);
          doc.setTextColor(150);
          doc.text("Fejl: Kunne ikke indlæse billede i PDF.", margin, currentY);
          doc.setTextColor(0);
          currentY += 10;
        }
      } else {
         if (currentY + 10 > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
          }
        doc.setFontSize(14);
        doc.text("AI Genereret Billede", margin, currentY);
        currentY += 7;
        doc.setFontSize(11);
        doc.setTextColor(150);
        doc.text(dataToUse.generatedImageDataUri && (dataToUse.generatedImageDataUri.includes("Fejl") || dataToUse.generatedImageDataUri.includes("Ugyldig prompt") || dataToUse.generatedImageDataUri.includes("fejlede")) ? dataToUse.generatedImageDataUri : "Intet billede genereret eller tilgængeligt.", margin, currentY);
        doc.setTextColor(0);
        currentY += 10;
      }

      doc.save(`FraimeWorksLite_Resultater_Cyklus_${sessionCycles.indexOf(dataToUse) + 1}_${now.toISOString().split('T')[0]}.pdf`);
      toast({ title: "Succes", description: "PDF genereret og download startet." });
    } catch (error) {
      console.error("Fejl ved PDF-generering:", error);
      toast({ title: "Fejl", description: `Kunne ikke generere PDF: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
  };

  const reversedCycles = [...sessionCycles].reverse();
  const isProcessingAnyActiveData = isLoadingActiveSummaryAndThemes || isLoadingActiveInsights;

  const ActiveCycleDisplay = () => (
    <div className={`mb-8 p-4 border border-border rounded-lg shadow-sm bg-card ${(isAnyAIProcessRunning && !sessionCycles.find(c => c.summary === activeCycleData.summary && c.summary !== fallbacks.summary)) ? 'border-primary animate-pulse' : ''}`}>
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
            {activeCycleData.summary}
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
            {activeCycleData.identifiedThemes}
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
             {activeCycleData.newInsights}
           </p>
        )}
      </div>
    </div>
  );

  return (
    <Card className="shadow-lg flex-1 flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> 
          AI Analyse Resultater
        </CardTitle>
        <CardDescription>
          Her vises resultater fra dine analysecyklusser. Du kan downloade den seneste afsluttede cyklus som PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 max-h-[calc(100vh-500px)]"> 
          <div className="space-y-0 p-6 pb-6">
            {isAnyAIProcessRunning && (
              <ActiveCycleDisplay />
            )}

            {reversedCycles.map((cycle, index) => (
              <div key={cycle.id} className="mb-8 p-4 border border-border rounded-lg shadow-sm bg-card">
                <h3 className="text-xl font-semibold mb-3 text-primary">Cyklus {sessionCycles.length - index}</h3>
                <div>
                  <h4 className="text-lg font-semibold mb-1 text-foreground">Resumé af Samtale</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {cycle.summary}
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
                    {cycle.newInsights}
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
                 {index < reversedCycles.length -1 && !(isAnyAIProcessRunning && index === 0 && reversedCycles.length > 1) && <Separator className="my-6 border-dashed" />}
              </div>
            ))}
            
            {sessionCycles.length === 0 && !isAnyAIProcessRunning && (
                <p className="text-sm text-muted-foreground text-center py-10">Ingen analysecyklusser er kørt endnu. Start en analyse i kontrolpanelet.</p>
            )}
          </div>
        </ScrollArea>
        
        <CardFooter className="p-6 pt-4 border-t border-border">
          <Button 
            variant="default" 
            className="w-full sm:w-auto"
            onClick={handleGeneratePdf}
            disabled={sessionCycles.length === 0 || (isAnyAIProcessRunning && !sessionCycles.find(c => c.summary !== fallbacks.summary))} 
            aria-label="Download resultater fra seneste afsluttede cyklus som PDF"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Seneste Cyklus som PDF
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
