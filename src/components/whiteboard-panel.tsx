"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Palette } from 'lucide-react';

interface WhiteboardPanelProps {
  whiteboardContent: string;
  setWhiteboardContent: Dispatch<SetStateAction<string>>;
  identifiedThemes: string;
}

export function WhiteboardPanel({ whiteboardContent, setWhiteboardContent, identifiedThemes }: WhiteboardPanelProps) {
  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Visuelt Whiteboard
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex-1 flex flex-col">
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
          <div>
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
      </CardContent>
    </Card>
  );
}
