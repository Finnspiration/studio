
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lightbulb } from 'lucide-react';

export function InfoPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');

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
          Du kan køre flere analysecyklusser per session og downloade resultaterne som PDF.
          <br /><br />
          Indtast gerne dine oplysninger nedenfor (valgfrit):
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Navn</Label>
          <Input id="name" placeholder="Dit navn" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Din email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization">Organisation</Label>
          <Input id="organization" placeholder="Din organisation" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
