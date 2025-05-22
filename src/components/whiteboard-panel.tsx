
"use client";

import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Palette, ImageOff, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WhiteboardPanelProps {
  whiteboardContent: string;
  setWhiteboardContent: Dispatch<SetStateAction<string>>;
  generatedImageDataUri: string;
  isGeneratingImage: boolean;
  currentLoadingState: string | null;
  fallbackEmptyWhiteboard: string;
  fallbackEmptyImage: string;
}

export function WhiteboardPanel({
  whiteboardContent,
  setWhiteboardContent,
  generatedImageDataUri,
  isGeneratingImage,
  currentLoadingState,
  fallbackEmptyWhiteboard,
  fallbackEmptyImage,
}: WhiteboardPanelProps) {
  const isGeneratingActiveWhiteboard = !!currentLoadingState && currentLoadingState.includes("Genererer whiteboard-idéer");
  const isGeneratingActiveImage = !!currentLoadingState && currentLoadingState.includes("Genererer billede");
  const isLoadingAnyMedia = isGeneratingImage || isGeneratingActiveWhiteboard;

  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader className="px-4 pt-5 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Whiteboard
        </CardTitle>
        {currentLoadingState && !currentLoadingState.includes("Optager") && (isGeneratingActiveWhiteboard || isGeneratingActiveImage) && (
          <CardDescription className="flex items-center text-sm pt-1 text-primary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {currentLoadingState}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col flex-1 min-h-[120px]">
            <Label htmlFor="whiteboard" className="mb-2 text-sm font-medium">Whiteboard Indhold (AI genereret, kan redigeres)</Label>
            {isGeneratingActiveWhiteboard && whiteboardContent === fallbackEmptyWhiteboard ? (
              <div className="flex-1 space-y-2 mt-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : (
              <Textarea
                id="whiteboard"
                placeholder={
                  whiteboardContent === fallbackEmptyWhiteboard && !isGeneratingActiveWhiteboard 
                    ? "Whiteboard-indhold genereres automatisk af AI..." 
                    : whiteboardContent.startsWith("Genererer whiteboard-idéer...")
                    ? "Genererer whiteboard-idéer..."
                    : whiteboardContent
                }
                value={
                  whiteboardContent === fallbackEmptyWhiteboard && !isGeneratingActiveWhiteboard
                    ? ""
                    : whiteboardContent
                }
                onChange={(e) => setWhiteboardContent(e.target.value)}
                className="flex-1 resize-none text-base bg-card min-h-[120px]"
                aria-label="Whiteboard indholdsområde"
                disabled={isLoadingAnyMedia}
              />
            )}
          </div>

          <div className="flex-shrink-0">
            <Label className="mb-2 text-sm font-medium">AI Genereret Billede</Label>
            <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden border border-border relative">
              {isGeneratingImage && (generatedImageDataUri === fallbackEmptyImage || generatedImageDataUri.startsWith("Genererer billede...")) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="text-sm text-foreground">Genererer billede...</p>
                </div>
              ) : generatedImageDataUri && generatedImageDataUri !== fallbackEmptyImage && !generatedImageDataUri.startsWith("Fejl") && !generatedImageDataUri.startsWith("Ugyldig prompt") && !generatedImageDataUri.startsWith("Billedgenerering fejlede") && !generatedImageDataUri.startsWith("Billedgenerering sprunget over") ? (
                <Image
                  src={generatedImageDataUri}
                  alt="AI genereret billede"
                  fill
                  style={{ objectFit: 'contain' }}
                  data-ai-hint="generated art"
                  priority={true}
                />
              ) : (
                <div className="flex flex-col items-center text-center text-muted-foreground p-4">
                  <ImageOff className="h-12 w-12 mb-2 opacity-70" />
                  <p className="text-sm">
                    {generatedImageDataUri === fallbackEmptyImage && isGeneratingActiveImage ? "Genererer billede..." :
                     generatedImageDataUri === fallbackEmptyImage ? "Intet billede genereret endnu." :
                     generatedImageDataUri}
                  </p>
                  {(generatedImageDataUri === fallbackEmptyImage && !isGeneratingActiveImage) && <p className="text-xs mt-1">(Billede genereres automatisk baseret på samtalen)</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    