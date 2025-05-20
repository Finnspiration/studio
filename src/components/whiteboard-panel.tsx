
"use client";

import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Palette, ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WhiteboardPanelProps {
  whiteboardContent: string;
  setWhiteboardContent: Dispatch<SetStateAction<string>>;
  identifiedThemes: string;
  generatedImageDataUri: string | null;
  isGeneratingImage: boolean;
}

export function WhiteboardPanel({ whiteboardContent, setWhiteboardContent, identifiedThemes, generatedImageDataUri, isGeneratingImage }: WhiteboardPanelProps) {
  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Visuelt Whiteboard & Medier
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
        <div className="flex-1 flex flex-col min-h-[200px]"> {/* Sikrer minimumshøjde for whiteboard */}
          <Label htmlFor="whiteboard" className="mb-2 text-sm font-medium">Whiteboard Indhold (Redigerbart)</Label>
          <Textarea
            id="whiteboard"
            placeholder="Tegn og skitser idéer her... (AI-forfinet indhold vises her)"
            value={whiteboardContent}
            onChange={(e) => setWhiteboardContent(e.target.value)}
            className="flex-1 resize-none text-base"
            aria-label="Whiteboard indholdsområde"
          />
        </div>
        {identifiedThemes && (
          <div className="mt-4">
            <Label className="mb-2 text-sm font-medium">Identificerede Temaer</Label>
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground break-words max-h-32 overflow-y-auto">
              {identifiedThemes.split(',').map((theme, index) => (
                <span key={index} className="inline-block bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold mr-2 mb-2">
                  {theme.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4">
          <Label className="mb-2 text-sm font-medium">Genereret Billede</Label>
          <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden border border-border">
            {isGeneratingImage ? (
              <Skeleton className="h-full w-full" />
            ) : generatedImageDataUri ? (
              <Image 
                src={generatedImageDataUri} 
                alt="Genereret billede" 
                width={400} 
                height={225} 
                className="object-contain max-h-full max-w-full"
                data-ai-hint="generated art"
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageOff className="h-16 w-16 mb-2" />
                <p>Intet billede genereret endnu.</p>
                <p className="text-xs">Indtast en prompt og klik "Generer Billede".</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
