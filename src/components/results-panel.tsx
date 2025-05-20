
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, MessageSquarePlus, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ResultsPanelProps {
  summary: string;
  identifiedThemes: string;
  newInsights: string;
  isSummarizing: boolean;
  isGeneratingInsights: boolean;
  onUseInsights: (insights: string) => void;
  isAnyAIProcessRunning: boolean;
  // Props for PDF generation will be added later
}

export function ResultsPanel({
  summary,
  identifiedThemes,
  newInsights,
  isSummarizing,
  isGeneratingInsights,
  onUseInsights,
  isAnyAIProcessRunning,
}: ResultsPanelProps) {
  const isLoadingSummary = isSummarizing || (isAnyAIProcessRunning && !summary && !identifiedThemes);
  const isLoadingInsights = isGeneratingInsights || (isAnyAIProcessRunning && !newInsights && summary);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Analyse Resultater
        </CardTitle>
        <CardDescription>
          Her vises resumé, temaer og nye indsigter genereret af AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] pr-3"> {/* Justerbar max-højde */}
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

            {/* PDF Download Knap vil blive tilføjet her senere */}
            {/* 
            <div className="pt-4 border-t border-border">
              <Button 
                variant="default" 
                className="w-full sm:w-auto"
                // onClick={handleGeneratePdf} // Skal implementeres
                disabled={isAnyAIProcessRunning || (!summary && !whiteboardContent && !generatedImageDataUri)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Resultater som PDF
              </Button>
            </div>
            */}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
