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
    .describe('Stemmebeskeden optaget fra brugeren, som en streng.'),
  identifiedThemes: z
    .string()
    .describe('De identificerede temaer fra samtaleanalysen.'),
  currentWhiteboardContent: z
    .string()
    .optional()
    .describe('Det nuværende indhold på whiteboardet, hvis nogen.'),
});
export type GenerateWhiteboardIdeasInput = z.infer<typeof GenerateWhiteboardIdeasInputSchema>;

const GenerateWhiteboardIdeasOutputSchema = z.object({
  refinedWhiteboardContent: z
    .string()
    .describe('Det forfinede indhold til whiteboardet, der inkorporerer nye idéer og temaer. Svar på dansk.'),
});
export type GenerateWhiteboardIdeasOutput = z.infer<typeof GenerateWhiteboardIdeasOutputSchema>;

export async function generateWhiteboardIdeas(input: GenerateWhiteboardIdeasInput): Promise<GenerateWhiteboardIdeasOutput> {
  return generateWhiteboardIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWhiteboardIdeasPrompt',
  input: {schema: GenerateWhiteboardIdeasInputSchema},
  output: {schema: GenerateWhiteboardIdeasOutputSchema},
  prompt: `Du er en AI-assistent, der hjælper med at forfine og generere nye idéer til et digitalt whiteboard. Svar altid på dansk.

  Whiteboardet er i øjeblikket tematiseret omkring følgende emner: {{{identifiedThemes}}}.
  Brugeren har givet følgende stemmebesked: {{{voicePrompt}}}.

  Forfin det nuværende whiteboard-indhold (hvis nogen) og inkorporer nye idéer baseret på de identificerede temaer og stemmebeskeden. Hold whiteboard-indholdet kortfattet og visuelt tiltalende.

  Nuværende whiteboard-indhold: {{{currentWhiteboardContent}}}

  Forfinet whiteboard-indhold (på dansk):`,
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
