
"use client";

import type { Dispatch, SetStateAction } from 'react';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, MessageSquarePlus, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';


interface ResultsPanelProps {
  summary: string;
  identifiedThemes: string;
  newInsights: string;
  isSummarizing: boolean;
  isGeneratingInsights: boolean;
  onUseInsights: (insights: string) => void;
  isAnyAIProcessRunning: boolean;
  whiteboardContent: string;
  generatedImageDataUri: string | null;
}

export function ResultsPanel({
  summary,
  identifiedThemes,
  newInsights,
  isSummarizing,
  isGeneratingInsights,
  onUseInsights,
  isAnyAIProcessRunning,
  whiteboardContent,
  generatedImageDataUri,
}: ResultsPanelProps) {
  const { toast } = useToast();
  const isLoadingSummary = isSummarizing || (isAnyAIProcessRunning && !summary && !identifiedThemes);
  const isLoadingInsights = isGeneratingInsights || (isAnyAIProcessRunning && !newInsights && summary);

  const handleGeneratePdf = () => {
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
      doc.text("FraimeWorks Lite - Analyse Resultater", pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      const now = new Date();
      doc.setFontSize(10);
      doc.text(`Genereret: ${now.toLocaleString('da-DK')}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      const addSection = (title: string, content: string | null | undefined, isPreformatted = false) => {
        if (currentY + 10 > pageHeight - margin) { // Check for new page before title
          doc.addPage();
          currentY = margin;
        }
        doc.setFontSize(14);
        doc.text(title, margin, currentY);
        currentY += 7;
        doc.setFontSize(11);
        if (content && content.trim()) {
          const lines = doc.splitTextToSize(content, maxLineWidth);
          lines.forEach((line: string) => {
            if (currentY > pageHeight - margin) {
              doc.addPage();
              currentY = margin;
            }
            doc.text(line, margin, currentY);
            currentY += (isPreformatted ? 5 : 6); // Slightly less line height for preformatted
          });
        } else {
          doc.setTextColor(150);
          doc.text("Intet indhold genereret.", margin, currentY);
          doc.setTextColor(0);
        }
        currentY += 5; // Extra space after section
      };
      
      addSection("Resumé af Samtale", summary);
      addSection("Identificerede Temaer", identifiedThemes ? identifiedThemes.split(',').map(t => `- ${t.trim()}`).join('\n') : "Ingen temaer identificeret.");
      addSection("Whiteboard Indhold", whiteboardContent, true); // True for preformatted-like spacing
      addSection("Nye AI Indsigter", newInsights);

      if (generatedImageDataUri) {
        if (currentY + 80 > pageHeight - margin) { // Approximate space for image
          doc.addPage();
          currentY = margin;
        }
        doc.setFontSize(14);
        doc.text("AI Genereret Billede", margin, currentY);
        currentY += 7;
        try {
          const imgProps = doc.getImageProperties(generatedImageDataUri);
          const aspectRatio = imgProps.width / imgProps.height;
          let imgWidth = maxLineWidth * 0.75; // Use 75% of content width
          let imgHeight = imgWidth / aspectRatio;
          const maxHeight = pageHeight - currentY - margin - 5; // Max height for image on current page
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * aspectRatio;
          }
           if (imgWidth > maxLineWidth) {
            imgWidth = maxLineWidth;
            imgHeight = imgWidth / aspectRatio;
          }


          const x = (pageWidth - imgWidth) / 2; // Center image
          doc.addImage(generatedImageDataUri, imgProps.fileType, x, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10;
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
        doc.text("Intet billede genereret.", margin, currentY);
        doc.setTextColor(0);
        currentY += 10;
      }

      doc.save(`FraimeWorksLite_Resultater_${now.toISOString().split('T')[0]}.pdf`);
      toast({ title: "Succes", description: "PDF genereret og download startet." });
    } catch (error) {
      console.error("Fejl ved PDF-generering:", error);
      toast({ title: "Fejl", description: `Kunne ikke generere PDF: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Analyse Resultater
        </CardTitle>
        <CardDescription>
          Her vises resumé, temaer og nye indsigter genereret af AI. Du kan downloade resultaterne som PDF.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] pr-3"> 
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Resumé af Samtale</h3>
              {isLoadingSummary ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ) : summary ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Intet resumé genereret endnu.</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Identificerede Temaer</h3>
              {isLoadingSummary ? (
                 <Skeleton className="h-10 w-full rounded-md" />
              ) : identifiedThemes ? (
                <div className="flex flex-wrap gap-2">
                  {identifiedThemes.split(',').map((theme, index) => (
                    <span key={index} className="inline-block bg-accent/80 text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                      {theme.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Ingen temaer identificeret endnu.</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Nye AI Indsigter</h3>
              {isLoadingInsights ? (
                <div className="flex items-center text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Genererer nye indsigter...
                </div>
              ) : newInsights ? (
                <>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mb-3">
                    {newInsights}
                  </p>
                  <Button
                    onClick={() => onUseInsights(newInsights)}
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={isAnyAIProcessRunning}
                  >
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Brug Indsigter til Ny Samtale
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Ingen nye indsigter genereret endnu.</p>
              )}
            </div>

            
            <div className="pt-4 border-t border-border">
              <Button 
                variant="default" 
                className="w-full sm:w-auto"
                onClick={handleGeneratePdf}
                disabled={isAnyAIProcessRunning} // Changed this line
              >
                <Download className="mr-2 h-4 w-4" />
                Download Resultater som PDF
              </Button>
            </div>
            
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

