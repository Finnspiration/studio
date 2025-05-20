// 'use server';
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
  transcription: z.string().describe('The transcription of the conversation.'),
});

export type SummarizeTranscriptionInput = z.infer<
  typeof SummarizeTranscriptionInputSchema
>;

const SummarizeTranscriptionOutputSchema = z.object({
  summary: z.string().describe('The summary of the conversation.'),
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
  prompt: `Summarize the following transcription of a conversation. Identify the key points and action items discussed.\n\nTranscription: {{{transcription}}}`,
});

const summarizeTranscriptionFlow = ai.defineFlow(
  {
    name: 'summarizeTranscriptionFlow',
    inputSchema: SummarizeTranscriptionInputSchema,
    outputSchema: SummarizeTranscriptionOutputSchema,
  },
  async input => {
    const {output} = await summarizeTranscriptionPrompt(input);
    return output!;
  }
);
