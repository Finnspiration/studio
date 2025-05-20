"use client";

import { useState } from 'react';
import { AppHeader } from "@/components/app-header";
import { WhiteboardPanel } from "@/components/whiteboard-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { useToast } from "@/hooks/use-toast";
import { summarizeTranscription } from '@/ai/flows/summarize-transcription';
import type { SummarizeTranscriptionInput } from '@/ai/flows/summarize-transcription';
import { generateWhiteboardIdeas } from '@/ai/flows/generate-whiteboard-ideas';
import type { GenerateWhiteboardIdeasInput } from '@/ai/flows/generate-whiteboard-ideas';

export default function SynapseScribblePage() {
  const [whiteboardContent, setWhiteboardContent] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [identifiedThemes, setIdentifiedThemes] = useState<string>(""); // Udledes fra resume
  const [voicePrompt, setVoicePrompt] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false); // Simuleret
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState<boolean>(false);

  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!transcription.trim()) {
      toast({ title: "Fejl", description: "Transskription er tom.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      const input: SummarizeTranscriptionInput = { transcription };
      const result = await summarizeTranscription(input);
      setSummary(result.summary);
      // Indtil videre, brug de første par komma-separerede sætninger fra resumeet som temaer hvis muligt, eller hele resumeet
      // En mere robust tilgang ville involvere et dedikeret temaekstraktionstrin eller at bede AI'en om temaer.
      const themes = result.summary.split('. ')[0]?.split(',').slice(0, 5).join(', ') || result.summary;
      setIdentifiedThemes(themes);
      toast({ title: "Succes", description: "Transskription opsummeret." });
    } catch (error) {
      console.error("Opsummeringsfejl:", error);
      toast({ title: "Fejl", description: "Kunne ikke opsummere transskription.", variant: "destructive" });
      setSummary("");
      setIdentifiedThemes("");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!voicePrompt.trim()) {
      toast({ title: "Fejl", description: "Stemmebesked er tom.", variant: "destructive" });
      return;
    }
    if (!summary.trim()) { // Brug resume som proxy for identificerede temaers parathed
        toast({ title: "Fejl", description: "Opsummer venligst transskription først for at identificere temaer.", variant: "destructive" });
        return;
    }
    setIsGeneratingIdeas(true);
    try {
      const input: GenerateWhiteboardIdeasInput = {
        voicePrompt,
        identifiedThemes: identifiedThemes || summary, // Fallback til fuldt resume hvis tema-specifik ekstraktion ikke er robust
        currentWhiteboardContent: whiteboardContent,
      };
      const result = await generateWhiteboardIdeas(input);
      setWhiteboardContent(result.refinedWhiteboardContent);
      toast({ title: "Succes", description: "Whiteboard-indhold opdateret med AI-idéer." });
    } catch (error) {
      console.error("Idégenereringsfejl:", error);
      toast({ title: "Fejl", description: "Kunne ikke generere whiteboard-idéer.", variant: "destructive" });
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 container mx-auto overflow-hidden">
        <div className="md:w-1/2 lg:w-3/5 h-full flex flex-col">
          <WhiteboardPanel
            whiteboardContent={whiteboardContent}
            setWhiteboardContent={setWhiteboardContent}
            identifiedThemes={identifiedThemes}
          />
        </div>
        <div className="md:w-1/2 lg:w-2/5 h-full flex flex-col">
          <ControlsPanel
            transcription={transcription}
            setTranscription={setTranscription}
            summary={summary}
            voicePrompt={voicePrompt}
            setVoicePrompt={setVoicePrompt}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            isSummarizing={isSummarizing}
            isGeneratingIdeas={isGeneratingIdeas}
            onSummarize={handleSummarize}
            onGenerateIdeas={handleGenerateIdeas}
          />
        </div>
      </main>
    </div>
  );
}
