
"use client";

import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquarePlus, Download, Brain, FileText, BarChartBig, FileDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { CycleData } from '@/app/page';
import { Separator } from '@/components/ui/separator';
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';

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
    whiteboard: string;
    image: string;
    transcription: string;
  };
  sessionReport: string;
  isGeneratingReport: boolean;
  onGenerateSessionReport: () => Promise<void>;
  onDownloadSessionReportAsMarkdown: () => void;
  onDownloadSessionReportAsPdf: () => void;
  userName: string;
  userEmail: string;
  userOrganization: string;
  maxCycles: number;
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
  fallbackText: string
): number => {
  let y = currentY;
  const lineHeight = isPreformatted ? 5 : 6;
  const titleLineHeight = 7;

  if (y + titleLineHeight + lineHeight > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += titleLineHeight;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const displayContent = (content && content.trim() && !content.startsWith("Fejl") && !content.startsWith("Kunne ikke") && !content.startsWith("Ingen specifikke") && content !== fallbackText)
    ? content
    : (content && content.trim() ? content : fallbackText);

  const lines = doc.splitTextToSize(displayContent, pageWidth - margin * 2);

  const isContentFallbackOrError = displayContent === fallbackText ||
                              (content && (content.startsWith("Fejl") ||
                                           content.startsWith("Kunne ikke") ||
                                           content.startsWith("Ingen specifikke")));

  lines.forEach((line: string) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    if (isContentFallbackOrError) {
        doc.setTextColor(150);
    }
    doc.text(line, margin, y);
    if (isContentFallbackOrError) {
        doc.setTextColor(0);
    }
    y += lineHeight;
  });
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
  const titleLineHeight = 7;
  const spaceAfterTitle = 3;
  const spaceAfterImage = 10;

  if (y + titleLineHeight + spaceAfterTitle > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += titleLineHeight + spaceAfterTitle;
  doc.setFont('helvetica', 'normal');

  if (imageDataUri && imageDataUri.startsWith('data:image')) {
    const imgHeightEstimate = 80; // Estimate, will be adjusted
    if (y + imgHeightEstimate > pageHeight - margin) {
      doc.addPage();
      y = margin;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y); // Repeat title on new page
      y += titleLineHeight + spaceAfterTitle;
      doc.setFont('helvetica', 'normal');
    }
    try {
      const imgProps = doc.getImageProperties(imageDataUri);
      const aspectRatio = imgProps.width / imgProps.height;
      let imgWidth = (pageWidth - margin * 2) * 0.75;
      let actualImgHeight = imgWidth / aspectRatio;
      const maxHeightForImage = pageHeight - y - margin - 5;

      if (actualImgHeight > maxHeightForImage) {
        actualImgHeight = maxHeightForImage;
        imgWidth = actualImgHeight * aspectRatio;
      }
      if (imgWidth > (pageWidth - margin * 2)) {
        imgWidth = (pageWidth - margin * 2);
        actualImgHeight = imgWidth / aspectRatio;
      }

      const x = (pageWidth - imgWidth) / 2;
      doc.addImage(imageDataUri, imgProps.fileType, x, y, imgWidth, actualImgHeight);
      y += actualImgHeight + spaceAfterImage;
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
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, y); // Repeat title on new page
        y += titleLineHeight + spaceAfterTitle;
        doc.setFont('helvetica', 'normal');
      }
    doc.setFontSize(11);
    doc.setTextColor(150);
    doc.text(imageDataUri && imageDataUri.trim() && !imageDataUri.startsWith("Billedgenerering sprunget over") ? imageDataUri : fallbackImageText, margin, y);
    doc.setTextColor(0);
    y += 10;
  }
  return y;
};

// Helper function to add user info to PDF
const addUserInfoToPdf = (
  doc: jsPDF,
  currentY: number,
  pageWidth: number,
  margin: number,
  userName: string,
  userEmail: string,
  userOrganization: string
): number => {
  let y = currentY;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic'); // Italic for user info for better distinction
  
  const addUserDetail = (label: string, value: string) => {
    if (value && value.trim() !== "") {
      if (y + 7 > doc.internal.pageSize.height - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(`${label} ${value}`, margin, y);
      y += 7;
    }
  };

  addUserDetail("Navn:", userName);
  addUserDetail("Email:", userEmail);
  addUserDetail("Organisation/Projekt:", userOrganization);
  
  doc.setFont('helvetica', 'normal'); // Reset font
  y += 5; // Extra space after user info
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
  sessionReport,
  isGeneratingReport,
  onGenerateSessionReport,
  onDownloadSessionReportAsMarkdown,
  onDownloadSessionReportAsPdf,
  userName,
  userEmail,
  userOrganization,
  maxCycles,
}: ResultsPanelProps) {
  const { toast } = useToast();

  const generatePdfForCycles = (cyclesToPrint: CycleData[], isForAllCycles: boolean) => {
    if (cyclesToPrint.length === 0) {
      toast({title: "Info", description: "Ingen data at generere PDF fra.", variant: "default"});
      return;
    }

    const hasMeaningfulData = (cycle: CycleData) =>
        (cycle.summary && cycle.summary !== fallbacks.summary && !cycle.summary.startsWith("Fejl")) ||
        (cycle.identifiedThemes && cycle.identifiedThemes !== fallbacks.themes && !cycle.identifiedThemes.startsWith("Fejl")) ||
        (cycle.newInsights && cycle.newInsights !== fallbacks.insights && !cycle.newInsights.startsWith("Fejl")) ||
        (cycle.whiteboardContent && cycle.whiteboardContent !== fallbacks.whiteboard && !cycle.whiteboardContent.startsWith("Fejl")) ||
        (cycle.generatedImageDataUri && cycle.generatedImageDataUri !== fallbacks.image && !cycle.generatedImageDataUri.startsWith("Fejl") && !cycle.generatedImageDataUri.startsWith("Billedgenerering sprunget"));


    if (isForAllCycles && !cyclesToPrint.some(hasMeaningfulData)) {
        toast({title: "Info", description: "Ingen meningsfulde data i nogen cyklus at generere PDF fra.", variant: "default"});
        return;
    }
     if (!isForAllCycles && cyclesToPrint.length === 1 && !hasMeaningfulData(cyclesToPrint[0])) {
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
      doc.setFont('helvetica', 'bold');
      const pdfTitle = isForAllCycles
        ? `FraimeWorks Lite - Alle Resultater (${cyclesToPrint.length} Cyklusser)`
        : `FraimeWorks Lite - Resultater (Cyklus ${sessionCycles.findIndex(c => c.id === cyclesToPrint[0].id) + 1})`;
      doc.text(pdfTitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Genereret: ${now.toLocaleString('da-DK')}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;

      currentY = addUserInfoToPdf(doc, currentY, pageWidth, margin, userName, userEmail, userOrganization);


      cyclesToPrint.forEach((cycleData, index) => {
        if (index > 0 || currentY > margin + 20) { 
          doc.addPage();
          currentY = margin;
           if(isForAllCycles) currentY = addUserInfoToPdf(doc, currentY, pageWidth, margin, userName, userEmail, userOrganization); // Repeat user info on new page for multi-cycle report
        }

        if (isForAllCycles) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`Cyklus ${sessionCycles.findIndex(c => c.id === cycleData.id) + 1}`, margin, currentY);
            currentY += 10;
            doc.setFont('helvetica', 'normal');
        }

        currentY = addTextSectionToPdf(doc, "Transskription/Input:", cycleData.transcription, currentY, pageWidth, pageHeight, margin, false, fallbacks.transcription);
        currentY = addTextSectionToPdf(doc, "Resumé af Samtale:", cycleData.summary, currentY, pageWidth, pageHeight, margin, false, fallbacks.summary);
        const themesText = (cycleData.identifiedThemes && cycleData.identifiedThemes !== fallbacks.themes && !cycleData.identifiedThemes.startsWith("Fejl") && !cycleData.identifiedThemes.startsWith("Kunne ikke") && !cycleData.identifiedThemes.startsWith("Ingen specifikke temaer"))
            ? cycleData.identifiedThemes.split(',').map(t => `- ${t.trim()}`).join('\n')
            : cycleData.identifiedThemes;
        currentY = addTextSectionToPdf(doc, "Identificerede Temaer:", themesText, currentY, pageWidth, pageHeight, margin, true, fallbacks.themes);
        currentY = addImageSectionToPdf(doc, "AI Genereret Billede:", cycleData.generatedImageDataUri, currentY, pageWidth, pageHeight, margin, fallbacks.image);
        currentY = addTextSectionToPdf(doc, "Whiteboard Indhold:", cycleData.whiteboardContent, currentY, pageWidth, pageHeight, margin, true, fallbacks.whiteboard);
        currentY = addTextSectionToPdf(doc, "Nye AI Indsigter:", cycleData.newInsights, currentY, pageWidth, pageHeight, margin, false, fallbacks.insights);
      });

      const filename = isForAllCycles
        ? `FraimeWorksLite_Alle_Cyklusser_${now.toISOString().split('T')[0]}.pdf`
        : `FraimeWorksLite_Resultater_Cyklus_${sessionCycles.findIndex(c => c.id === cyclesToPrint[0].id) + 1}_${now.toISOString().split('T')[0]}.pdf`;
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

  const isDisplayingActiveData = (isAnyAIProcessRunning || !noActiveDataToShow) && sessionCycles.length < maxCycles;


  const ActiveCycleDisplay = () => (
    <div className={`mb-6 p-4 border border-border rounded-lg shadow-sm bg-card ${isAnyAIProcessRunning ? 'border-primary animate-pulse' : ''}`}>
      <h3 className="text-xl font-semibold mb-3 text-primary">Igangværende Cyklus {sessionCycles.length + 1}</h3>
      <div>
        <h4 className="text-lg font-semibold mb-1 text-foreground">Resumé af Samtale</h4>
        {isLoadingActiveSummaryAndThemes && activeCycleData.summary === fallbacks.summary ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (activeCycleData.summary && activeCycleData.summary !== fallbacks.summary && !activeCycleData.summary.startsWith("Fejl") && !activeCycleData.summary.startsWith("Kunne ikke") && !activeCycleData.summary.startsWith("Opsummerer...")) ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{activeCycleData.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {activeCycleData.summary === fallbacks.summary && isLoadingActiveSummaryAndThemes ? "Bearbejder..." : (activeCycleData.summary || fallbacks.summary)}
          </p>
        )}
      </div>
      <Separator className="my-3" />
      <div>
        <h4 className="text-lg font-semibold mb-1 text-foreground">Identificerede Temaer</h4>
        {isLoadingActiveSummaryAndThemes && activeCycleData.identifiedThemes === fallbacks.themes ? (
           <Skeleton className="h-8 w-full rounded-md mt-1" />
        ) : (activeCycleData.identifiedThemes && activeCycleData.identifiedThemes !== fallbacks.themes && !activeCycleData.identifiedThemes.startsWith("Fejl") && !activeCycleData.identifiedThemes.startsWith("Kunne ikke") && !activeCycleData.identifiedThemes.startsWith("Ingen specifikke temaer") && !activeCycleData.identifiedThemes.startsWith("Identificerer temaer...")) ? (
          <div className="flex flex-wrap gap-2">
            {activeCycleData.identifiedThemes.split(',').map((theme, index) => (
              <span key={index} className="inline-block bg-accent/80 text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                {theme.trim()}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {activeCycleData.identifiedThemes === fallbacks.themes && isLoadingActiveSummaryAndThemes ? "Bearbejder..." : (activeCycleData.identifiedThemes || fallbacks.themes)}
          </p>
        )}
      </div>
      <Separator className="my-3" />
      <div>
        <h4 className="text-lg font-semibold mb-1 text-foreground">Nye AI Indsigter</h4>
        {isLoadingActiveInsights && activeCycleData.newInsights === fallbacks.insights ? (
          <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md mt-1">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Genererer nye indsigter...
          </div>
        ) : (activeCycleData.newInsights && activeCycleData.newInsights !== fallbacks.insights && !activeCycleData.newInsights.startsWith("Fejl") && !activeCycleData.newInsights.startsWith("Kunne ikke") && !activeCycleData.newInsights.startsWith("Ingen specifikke") && !activeCycleData.newInsights.startsWith("Genererer nye indsigter...")) ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{activeCycleData.newInsights}</p>
        ) : (
           <p className="text-sm text-muted-foreground italic">
             {activeCycleData.newInsights === fallbacks.insights && isLoadingActiveInsights ? "Bearbejder..." : (activeCycleData.newInsights || fallbacks.insights)}
           </p>
        )}
      </div>
       {(activeCycleData.newInsights && activeCycleData.newInsights !== fallbacks.insights && !activeCycleData.newInsights.startsWith("Fejl") && !activeCycleData.newInsights.startsWith("Kunne ikke") && !activeCycleData.newInsights.startsWith("Ingen specifikke") && !activeCycleData.newInsights.startsWith("Genererer nye indsigter...") && !isAnyAIProcessRunning) && (
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
    <div className="flex flex-col h-full">
      <Card className="shadow-lg flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Analyse Resultater
          </CardTitle>
          <CardDescription>
            Her vises resultater fra dine analysecyklusser. Du kan downloade resultater som PDF eller en samlet rapport.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
           <div className="flex-1 flex flex-col overflow-hidden"> {/* Outer container for ScrollArea and Footer */}
            <ScrollArea className="flex-1 p-6 pb-0">
              <div className="space-y-0 pb-6"> {/* Added pb-6 here for bottom spacing within scroll area */}
                {isDisplayingActiveData && (
                  <ActiveCycleDisplay />
                )}

                {reversedCycles.map((cycle, index) => (
                  <div key={cycle.id} className="mb-6 p-4 border border-border rounded-lg shadow-sm bg-card">
                    <h3 className="text-xl font-semibold mb-3 text-primary">Cyklus {sessionCycles.length - index}</h3>
                    <div>
                      <h4 className="text-lg font-semibold mb-1 text-foreground">Resumé af Samtale</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {(cycle.summary && cycle.summary !== fallbacks.summary && !cycle.summary.startsWith("Fejl") && !cycle.summary.startsWith("Kunne ikke")) ? cycle.summary : <span className="italic">{cycle.summary || fallbacks.summary}</span>}
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
                        <p className="text-sm text-muted-foreground italic">{cycle.identifiedThemes || fallbacks.themes}</p>
                      )}
                    </div>
                    <Separator className="my-3" />
                    <div>
                      <h4 className="text-lg font-semibold mb-1 text-foreground">Nye AI Indsigter</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                         {(cycle.newInsights && cycle.newInsights !== fallbacks.insights && !cycle.newInsights.startsWith("Fejl") && !cycle.newInsights.startsWith("Kunne ikke") && !cycle.newInsights.startsWith("Ingen specifikke")) ? cycle.newInsights : <span className="italic">{cycle.newInsights || fallbacks.insights}</span>}
                      </p>
                      {(cycle.newInsights && cycle.newInsights !== fallbacks.insights && !cycle.newInsights.startsWith("Fejl") && !cycle.newInsights.startsWith("Kunne ikke") && !cycle.newInsights.startsWith("Ingen specifikke")) && (
                         <Button
                            onClick={() => onUseInsightsForNewCycle(cycle.newInsights)}
                            variant="outline"
                            className="w-full sm:w-auto mt-2"
                            disabled={isAnyAIProcessRunning || !canStartNewCycle || (sessionCycles.length >= maxCycles && cycle.id !== reversedCycles[0].id) }
                            aria-label={`Brug indsigter fra cyklus ${sessionCycles.length - index} til ny samtale`}
                          >
                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                            Brug Indsigter fra Cyklus {sessionCycles.length - index}
                          </Button>
                      )}
                    </div>
                     {index < reversedCycles.length -1 && !(isDisplayingActiveData && index === 0 && reversedCycles.length > 1) && <Separator className="my-4 border-dashed" />}
                  </div>
                ))}

                {sessionCycles.length === 0 && !isDisplayingActiveData && (
                    <p className="text-sm text-muted-foreground text-center py-10">Ingen analysecyklusser er kørt endnu. Start en analyse i kontrolpanelet.</p>
                )}
              </div>
            </ScrollArea>

            <CardFooter className="p-6 pt-4 border-t border-border flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 justify-start">
              <Button
                variant="default"
                className="flex-1 sm:flex-none min-w-[200px]"
                onClick={handleGenerateLatestCyclePdf}
                disabled={sessionCycles.length === 0 || isAnyAIProcessRunning || isGeneratingReport}
                aria-label="Download resultater fra seneste afsluttede cyklus som PDF"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Seneste Cyklus (PDF)
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none min-w-[200px]"
                onClick={handleGenerateAllCyclesPdf}
                disabled={sessionCycles.length === 0 || isAnyAIProcessRunning || isGeneratingReport}
                aria-label="Download resultater fra alle afsluttede cyklusser som PDF"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download Alle Cyklusser (PDF)
              </Button>
            </CardFooter>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg mt-4 flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartBig className="h-6 w-6 text-primary" />
            AI Genereret Session Rapport
          </CardTitle>
          <CardDescription>
            Generer en samlet rapport for alle gennemførte cyklusser i denne session.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="p-6 space-y-2 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start">
             <Button
              onClick={onGenerateSessionReport}
              disabled={isAnyAIProcessRunning || isGeneratingReport || sessionCycles.length === 0}
              className="w-full sm:w-auto"
            >
              {isGeneratingReport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChartBig className="mr-2 h-4 w-4" />
              )}
              {isGeneratingReport ? "Genererer Rapport..." : "Generer Session Rapport (AI)"}
            </Button>
            <Button
              onClick={onDownloadSessionReportAsMarkdown}
              disabled={isGeneratingReport || !sessionReport || sessionReport.startsWith("Fejl") || sessionReport.startsWith("Kunne ikke") || sessionReport.startsWith("Ingen cyklusdata")}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Download Rapport (MD)
            </Button>
             <Button
              onClick={onDownloadSessionReportAsPdf}
              disabled={isGeneratingReport || !sessionReport || sessionReport.startsWith("Fejl") || sessionReport.startsWith("Kunne ikke") || sessionReport.startsWith("Ingen cyklusdata")}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Download Rapport (PDF)
            </Button>
          </div>

          {(sessionReport || isGeneratingReport) && (
            <div className="flex-1 p-6 pt-0 flex flex-col overflow-hidden">
              <Label htmlFor="sessionReportArea" className="mb-2 text-sm font-medium">
                {isGeneratingReport && !sessionReport.startsWith("Genererer") ? "Genererer rapport..." : "Genereret Rapport (Markdown)"}
              </Label>
              <ScrollArea className="flex-1 border border-input rounded-md p-2 bg-muted/50">
                {isGeneratingReport && sessionReport.startsWith("Genererer") ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Textarea
                    id="sessionReportArea"
                    value={sessionReport}
                    readOnly
                    className="min-h-[300px] resize-none text-xs bg-muted/50 flex-1"
                    placeholder="Rapporten vil blive vist her..."
                  />
                )}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    