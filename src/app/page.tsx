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
  const [identifiedThemes, setIdentifiedThemes] = useState<string>(""); // Will be derived from summary
  const [voicePrompt, setVoicePrompt] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false); // Simulated
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState<boolean>(false);

  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!transcription.trim()) {
      toast({ title: "Error", description: "Transcription is empty.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      const input: SummarizeTranscriptionInput = { transcription };
      const result = await summarizeTranscription(input);
      setSummary(result.summary);
      // For now, use the first few comma-separated phrases from summary as themes if possible, or whole summary
      // A more robust approach would involve a dedicated theme extraction step or prompting the AI for themes.
      const themes = result.summary.split('. ')[0]?.split(',').slice(0, 5).join(', ') || result.summary;
      setIdentifiedThemes(themes);
      toast({ title: "Success", description: "Transcription summarized." });
    } catch (error) {
      console.error("Summarization error:", error);
      toast({ title: "Error", description: "Failed to summarize transcription.", variant: "destructive" });
      setSummary("");
      setIdentifiedThemes("");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!voicePrompt.trim()) {
      toast({ title: "Error", description: "Voice prompt is empty.", variant: "destructive" });
      return;
    }
    if (!summary.trim()) { // Use summary as proxy for identifiedThemes readiness
        toast({ title: "Error", description: "Please summarize transcription first to identify themes.", variant: "destructive" });
        return;
    }
    setIsGeneratingIdeas(true);
    try {
      const input: GenerateWhiteboardIdeasInput = {
        voicePrompt,
        identifiedThemes: identifiedThemes || summary, // Fallback to full summary if themes specific extraction is not robust
        currentWhiteboardContent: whiteboardContent,
      };
      const result = await generateWhiteboardIdeas(input);
      setWhiteboardContent(result.refinedWhiteboardContent);
      toast({ title: "Success", description: "Whiteboard content updated with AI ideas." });
    } catch (error) {
      console.error("Idea generation error:", error);
      toast({ title: "Error", description: "Failed to generate whiteboard ideas.", variant: "destructive" });
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
