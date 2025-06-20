// src/ai/flows/summarize-transcription.ts
/**
 * @fileOverview Summarizes a transcription of a conversation.
 *
 * - summarizeTranscription - A function that summarizes the transcription.
 * - SummarizeTranscriptionInput - The input type for the summarizeTranscription function.
 * - SummarizeTranscriptionOutput - The return type for the summarizeTranscription function.
 */

'use server';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTranscriptionInputSchema = z.object({
  transcription: z.string().describe('Transskriptionen af samtalen.'),
});

export type SummarizeTranscriptionInput = z.infer<
  typeof SummarizeTranscriptionInputSchema
>;

const SummarizeTranscriptionOutputSchema = z.object({
  summary: z.string().describe('Resuméet af samtalen. Svar på dansk.'),
});

export type SummarizeTranscriptionOutput = z.infer<
  typeof SummarizeTranscriptionOutputSchema
>;

export async function summarizeTranscription(
  input: SummarizeTranscriptionInput
): Promise<SummarizeTranscriptionOutput> {
  return summarizeTranscriptionFlow(input);
}

const summarizeTranscriptionPrompt = ai.definePrompt({
  name: 'summarizeTranscriptionPrompt',
  input: {schema: SummarizeTranscriptionInputSchema},
  output: {schema: SummarizeTranscriptionOutputSchema},
  prompt: `Opsummer følgende transskription af en samtale. Identificer nøglepunkterne og handlingspunkterne, der blev diskuteret. Svar på dansk.\n\nTransskription: {{{transcription}}}`,
});

const summarizeTranscriptionFlow = ai.defineFlow(
  {
    name: 'summarizeTranscriptionFlow',
    inputSchema: SummarizeTranscriptionInputSchema,
    outputSchema: SummarizeTranscriptionOutputSchema,
  },
  async input => {
    if (!input.transcription || input.transcription.trim() === '') {
      console.warn("SummarizeTranscriptionFlow: Ingen transskription at opsummere.");
      return { summary: "Ingen transskription at opsummere." };
    }
    try {
      const {output} = await summarizeTranscriptionPrompt(input);
      if (!output || typeof output.summary !== 'string' || output.summary.trim() === '') {
        console.error("SummarizeTranscriptionFlow: Output fra prompt var ugyldigt eller manglede resumé.", output);
        return { summary: "Kunne ikke generere et gyldigt resumé." };
      }
      return output;
    } catch (error) {
      console.error("SummarizeTranscriptionFlow: Fejl under prompt-kald", error);
      return { summary: "Fejl under generering af resumé." };
    }
  }
);
