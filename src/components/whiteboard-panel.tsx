
"use client";

import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Palette, ImageOff, Info, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WhiteboardPanelProps {
  whiteboardContent: string;
  setWhiteboardContent: Dispatch<SetStateAction<string>>;
  identifiedThemes: string;
  generatedImageDataUri: string | null;
  isGeneratingImage: boolean;
  currentLoadingState: string | null;
}

export function WhiteboardPanel({ 
  whiteboardContent, 
  setWhiteboardContent, 
  identifiedThemes, 
  generatedImageDataUri, 
  isGeneratingImage,
  currentLoadingState
}: WhiteboardPanelProps) {
  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Visuelt Whiteboard & Medier
        </CardTitle>
        {currentLoadingState && (
          <CardDescription className="flex items-center text-sm pt-2">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
            {currentLoadingState}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
        <div className="flex-1 flex flex-col min-h-[250px]"> {/* Øget minimumshøjde */}
          <Label htmlFor="whiteboard" className="mb-2 text-sm font-medium">Whiteboard Indhold (AI genereret, kan redigeres)</Label>
          <Textarea
            id="whiteboard"
            placeholder="Whiteboard-indhold genereret af AI vil vises her efter lydanalyse... Du kan også skrive direkte."
            value={whiteboardContent}
            onChange={(e) => setWhiteboardContent(e.target.value)}
            className="flex-1 resize-none text-base bg-card" // Sørg for at tekstområdet udvider sig
            aria-label="Whiteboard indholdsområde"
            disabled={!!currentLoadingState && currentLoadingState.includes("Genererer idéer")} // Deaktiver under idégenerering
          />
        </div>
        
        {identifiedThemes && !currentLoadingState?.includes("Opsummerer") && ( // Vis kun hvis der er temaer og vi ikke opsummerer
          <div className="mt-2">
            <Label className="mb-2 text-sm font-medium">AI Identificerede Temaer</Label>
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground break-words max-h-32 overflow-y-auto">
              {identifiedThemes.split(',').map((theme, index) => (
                <span key={index} className="inline-block bg-accent/80 text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold mr-2 mb-2 shadow-sm">
                  {theme.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Billedgenerering sektion - UI for prompt input er fjernet fra ControlsPanel */}
        <div className="mt-4">
          <Label className="mb-2 text-sm font-medium">AI Genereret Billede (Funktion under udvikling)</Label>
          <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden border border-border relative">
            {isGeneratingImage ? (
              <Skeleton className="h-full w-full" />
            ) : generatedImageDataUri ? (
              <Image 
                src={generatedImageDataUri} 
                alt="AI genereret billede" 
                layout="fill" // Brug fill for at billedet tilpasser sig containeren
                objectFit="contain" // Sørger for at hele billedet vises
                className="p-1" // Lidt padding så det ikke rammer kanten
                data-ai-hint="generated art"
              />
            ) : (
              <div className="flex flex-col items-center text-center text-muted-foreground p-4">
                <ImageOff className="h-12 w-12 mb-2 opacity-70" />
                <p className="text-sm">Intet billede genereret endnu.</p>
                <p className="text-xs mt-1">(Denne funktion vil senere kunne generere billeder automatisk baseret på samtalen)</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    