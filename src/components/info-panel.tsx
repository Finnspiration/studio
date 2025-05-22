
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lightbulb } from 'lucide-react';

interface InfoPanelProps {
  userName: string;
  setUserName: Dispatch<SetStateAction<string>>;
  userEmail: string;
  setUserEmail: Dispatch<SetStateAction<string>>;
  userOrganization: string;
  setUserOrganization: Dispatch<SetStateAction<string>>;
  maxCycles: number;
}

export function InfoPanel({
  userName, setUserName,
  userEmail, setUserEmail,
  userOrganization, setUserOrganization,
  maxCycles
}: InfoPanelProps) {
  return (
    <Card className="mb-4 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          Velkommen til FraimeWorks Lite
        </CardTitle>
        <CardDescription className="pt-2">
          Denne applikation hjælper dig med at omdanne samtaler til visuelle whiteboard-ideer og nye indsigter ved hjælp af AI.
          Optag en lydbesked eller indtast en transskription, og lad AI&apos;en analysere, opsummere, identificere temaer,
          generere whiteboard-indhold, skabe et metaforisk billede og foreslå nye, tankevækkende indsigter.
          Du kan køre op til {maxCycles} analysecyklusser per session og downloade resultaterne som PDF eller Markdown.
          <br /><br />
          Indtast gerne dine oplysninger nedenfor (valgfrit - bruges i rapporter):
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Navn</Label>
            <Input id="name" placeholder="Dit navn" value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Din email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Organisation/Projekt</Label>
            <Input id="organization" placeholder="Din organisation/projektnavn" value={userOrganization} onChange={(e) => setUserOrganization(e.target.value)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    