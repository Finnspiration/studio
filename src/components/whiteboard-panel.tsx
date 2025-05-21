
"use client";

import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Palette, ImageOff, Loader2 } from 'lucide-react';

interface WhiteboardPanelProps {
  whiteboardContent: string;
  setWhiteboardContent: Dispatch<SetStateAction<string>>;
  generatedImageDataUri: string | null;
  isGeneratingImage: boolean;
  currentLoadingState: string | null;
}

export function WhiteboardPanel({ 
  whiteboardContent, 
  setWhiteboardContent, 
  generatedImageDataUri, 
  isGeneratingImage,
  currentLoadingState
}: WhiteboardPanelProps) {
  const isGeneratingWhiteboard = !!currentLoadingState && currentLoadingState.includes("Genererer whiteboard-idéer");

  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Whiteboard
        </CardTitle>
        {currentLoadingState && !currentLoadingState.includes("Optager") && (
          <CardDescription className="flex items-center text-sm pt-2 text-primary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {currentLoadingState}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0"> {/* Changed: p-6 to p-0 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4"> {/* Added: wrapper div for padding and scroll */}
          {/* Section 1: Whiteboard Content */}
          <div className="flex flex-col flex-1"> {/* Added flex-1 to allow this section to grow */}
            <Label htmlFor="whiteboard" className="mb-2 text-sm font-medium">Whiteboard Indhold (AI genereret, kan redigeres)</Label>
            <Textarea
              id="whiteboard"
              placeholder={
                isGeneratingWhiteboard 
                  ? "Genererer whiteboard-idéer fra AI..." 
                  : "Whiteboard-indhold vil blive genereret her efter AI-analyse... Du kan også skrive direkte."
              }
              value={whiteboardContent}
              onChange={(e) => setWhiteboardContent(e.target.value)}
              className="flex-1 resize-none text-base bg-card min-h-[120px]" 
              aria-label="Whiteboard indholdsområde"
              disabled={isGeneratingWhiteboard || isGeneratingImage}
            />
          </div>
          
          {/* Section 3: Generated Image */}
          <div className="flex-shrink-0">
            <Label className="mb-2 text-sm font-medium">AI Genereret Billede</Label>
            <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden border border-border relative">
              {isGeneratingImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="text-sm text-foreground">Genererer billede...</p>
                </div>
              ) : generatedImageDataUri ? (
                <Image 
                  src={generatedImageDataUri} 
                  alt="AI genereret billede" 
                  fill 
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                  style={{ objectFit: 'contain' }}
                  data-ai-hint="generated art"
                />
              ) : (
                <div className="flex flex-col items-center text-center text-muted-foreground p-4">
                  <ImageOff className="h-12 w-12 mb-2 opacity-70" />
                  <p className="text-sm">Intet billede genereret endnu.</p>
                  <p className="text-xs mt-1">(Billede genereres automatisk baseret på samtalen)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
