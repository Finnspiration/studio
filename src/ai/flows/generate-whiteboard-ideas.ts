// src/ai/flows/generate-whiteboard-ideas.ts
'use server';
/**
 * @fileOverview A flow for generating and refining whiteboard content based on voice prompts and identified themes.
 *
 * - generateWhiteboardIdeas - A function that handles the generation and refinement of whiteboard ideas.
 * - GenerateWhiteboardIdeasInput - The input type for the generateWhiteboardIdeas function.
 * - GenerateWhiteboardIdeasOutput - The return type for the generateWhiteboardIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWhiteboardIdeasInputSchema = z.object({
  voicePrompt: z
    .string()
    .describe('The voice prompt recorded from the user, as a string.'),
  identifiedThemes: z
    .string()
    .describe('The identified themes from the conversation analysis.'),
  currentWhiteboardContent: z
    .string()
    .optional()
    .describe('The current content on the whiteboard, if any.'),
});
export type GenerateWhiteboardIdeasInput = z.infer<typeof GenerateWhiteboardIdeasInputSchema>;

const GenerateWhiteboardIdeasOutputSchema = z.object({
  refinedWhiteboardContent: z
    .string()
    .describe('The refined content for the whiteboard, incorporating new ideas and themes.'),
});
export type GenerateWhiteboardIdeasOutput = z.infer<typeof GenerateWhiteboardIdeasOutputSchema>;

export async function generateWhiteboardIdeas(input: GenerateWhiteboardIdeasInput): Promise<GenerateWhiteboardIdeasOutput> {
  return generateWhiteboardIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWhiteboardIdeasPrompt',
  input: {schema: GenerateWhiteboardIdeasInputSchema},
  output: {schema: GenerateWhiteboardIdeasOutputSchema},
  prompt: `You are an AI assistant that helps refine and generate new ideas for a digital whiteboard.

  The whiteboard is currently themed around the following topics: {{{identifiedThemes}}}.
  The user has given the following voice prompt: {{{voicePrompt}}}.

  Refine the current whiteboard content (if any) and incorporate new ideas based on the identified themes and voice prompt. Keep the whiteboard content concise and visually appealing.

  Current whiteboard content: {{{currentWhiteboardContent}}}

  Refined whiteboard content:`,
});

const generateWhiteboardIdeasFlow = ai.defineFlow(
  {
    name: 'generateWhiteboardIdeasFlow',
    inputSchema: GenerateWhiteboardIdeasInputSchema,
    outputSchema: GenerateWhiteboardIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
