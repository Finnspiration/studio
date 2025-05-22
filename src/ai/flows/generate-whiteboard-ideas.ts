
// src/ai/flows/generate-whiteboard-ideas.ts
'use server';
/**
 * @fileOverview A flow for generating and refining whiteboard content based on a full transcription and identified themes.
 *
 * - generateWhiteboardIdeas - A function that handles the generation and refinement of whiteboard ideas.
 * - GenerateWhiteboardIdeasInput - The input type for the generateWhiteboardIdeas function.
 * - GenerateWhiteboardIdeasOutput - The return type for the generateWhiteboardIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWhiteboardIdeasInputSchema = z.object({
  transcription: z 
    .string()
    .describe('Den fulde transskription af samtalen.'),
  identifiedThemes: z
    .string()
    .describe('De identificerede temaer fra samtaleanalysen (opsummeringen).'),
  currentWhiteboardContent: z
    .string()
    .optional()
    .describe('Det nuværende indhold på whiteboardet, hvis nogen.'),
});
export type GenerateWhiteboardIdeasInput = z.infer<typeof GenerateWhiteboardIdeasInputSchema>;

const GenerateWhiteboardIdeasOutputSchema = z.object({
  refinedWhiteboardContent: z
    .string()
    .describe('Det forfinede indhold til whiteboardet, der inkorporerer nye idéer baseret på transskriptionen og temaerne. Svar på dansk.'),
});
export type GenerateWhiteboardIdeasOutput = z.infer<typeof GenerateWhiteboardIdeasOutputSchema>;

export async function generateWhiteboardIdeas(input: GenerateWhiteboardIdeasInput): Promise<GenerateWhiteboardIdeasOutput> {
  return generateWhiteboardIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWhiteboardIdeasPrompt',
  input: {schema: GenerateWhiteboardIdeasInputSchema},
  output: {schema: GenerateWhiteboardIdeasOutputSchema},
  prompt: `Du er en AI-assistent, der hjælper med at generere og forfine idéer til et digitalt whiteboard baseret på en samtale. Svar altid på dansk.

  Den fulde transskription af samtalen er:
  {{{transcription}}}

  De overordnede temaer identificeret fra samtalen er: {{{identifiedThemes}}}.
  
  Brug transskriptionen som den primære kilde og temaerne som vejledning til at generere nye, relevante idéer eller uddybe eksisterende koncepter.
  Sigt efter at skabe et whiteboard, der er kortfattet, handlingsorienteret og visuelt tiltalende i sin struktur (brug f.eks. punktopstillinger, korte sætninger).
  Generer mindst 3-5 punkter eller en kort opsummerende tekst til whiteboardet.
  Hvis inputtet (transskription/temaer) ikke giver grundlag for meningsfulde whiteboard-idéer, svar da med: "Ingen specifikke whiteboard-idéer kunne udledes fra samtalen."

  Nuværende whiteboard-indhold (kan være tomt, du skal generere nyt baseret på transskription og temaer): 
  {{{currentWhiteboardContent}}}

  Generer det forfinede whiteboard-indhold (på dansk) baseret på transskriptionen og temaerne:`,
});

const generateWhiteboardIdeasFlow = ai.defineFlow(
  {
    name: 'generateWhiteboardIdeasFlow',
    inputSchema: GenerateWhiteboardIdeasInputSchema,
    outputSchema: GenerateWhiteboardIdeasOutputSchema,
  },
  async input => {
    if (!input.transcription || input.transcription.trim() === '' || input.transcription.startsWith("Fejl") || input.transcription.startsWith("Kunne ikke")) {
      console.warn("GenerateWhiteboardIdeasFlow: Ugyldig transskription for idégenerering.");
      return { refinedWhiteboardContent: "Kan ikke generere whiteboard-idéer uden gyldig transskription." };
    }
     if (!input.identifiedThemes || input.identifiedThemes.trim() === '' || input.identifiedThemes.startsWith("Fejl") || input.identifiedThemes.startsWith("Kunne ikke") || input.identifiedThemes.startsWith("Ingen specifikke temaer")) {
      console.warn("GenerateWhiteboardIdeasFlow: Ugyldige temaer for idégenerering. Bruger kun transskription.");
      // Overvej at have en prompt-variant der kun bruger transskription, eller gør identifiedThemes helt valgfri i prompten
    }
    try {
      const {output} = await prompt(input);
      if (!output || typeof output.refinedWhiteboardContent !== 'string' || output.refinedWhiteboardContent.trim() === "") {
        console.error("GenerateWhiteboardIdeasFlow: Output fra prompt var ugyldigt eller manglede indhold.", output);
        return { refinedWhiteboardContent: "Kunne ikke generere whiteboard-indhold." };
      }
      return output;
    } catch (error) {
      console.error("GenerateWhiteboardIdeasFlow: Fejl under prompt-kald", error);
      return { refinedWhiteboardContent: "Fejl under generering af whiteboard-idéer." };
    }
  }
);
