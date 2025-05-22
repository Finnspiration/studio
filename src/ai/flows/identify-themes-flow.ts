'use server';
/**
 * @fileOverview Et flow til at identificere nøgletemaer fra en given tekst.
 *
 * - identifyThemes - En funktion der håndterer temaidentifikationsprocessen.
 * - IdentifyThemesInput - Inputtypen for identifyThemes funktionen.
 * - IdentifyThemesOutput - Returtypen for identifyThemes funktionen.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyThemesInputSchema = z.object({
  textToAnalyze: z.string().describe('Teksten der skal analyseres for temaer (f.eks. et resumé eller en transskription).'),
});
export type IdentifyThemesInput = z.infer<typeof IdentifyThemesInputSchema>;

const IdentifyThemesOutputSchema = z.object({
  identifiedThemesText: z.string().describe('De identificerede temaer, formuleret som en kommasepareret liste eller en kort, sigende sætning. Svar på dansk.'),
});
export type IdentifyThemesOutput = z.infer<typeof IdentifyThemesOutputSchema>;

export async function identifyThemes(input: IdentifyThemesInput): Promise<IdentifyThemesOutput> {
  return identifyThemesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyThemesPrompt',
  input: {schema: IdentifyThemesInputSchema},
  output: {schema: IdentifyThemesOutputSchema},
  prompt: `Analyser følgende tekst og identificer 3-5 centrale temaer, nøglekoncepter eller gennemgående idéer.
Formuler temaerne som en kommasepareret liste af korte, præcise fraser. Svar på dansk.

Tekst til analyse:
{{{textToAnalyze}}}

Identificerede temaer (kommasepareret liste på dansk):`,
});

const identifyThemesFlow = ai.defineFlow(
  {
    name: 'identifyThemesFlow',
    inputSchema: IdentifyThemesInputSchema,
    outputSchema: IdentifyThemesOutputSchema,
  },
  async (input) => {
    if (!input.textToAnalyze || input.textToAnalyze.trim() === '') {
      console.warn("identifyThemesFlow: Ingen tekst at analysere. Returnerer tomme temaer.");
      return { identifiedThemesText: "Ingen temaer kunne identificeres fra den tomme tekst." };
    }
    const {output} = await prompt(input);
    if (!output || typeof output.identifiedThemesText !== 'string' || output.identifiedThemesText.trim() === '') {
      console.error("identifyThemesFlow: Output fra prompt var ugyldigt eller manglede identificerede temaer.", output);
      throw new Error("Kunne ikke identificere temaer fra AI'en.");
    }
    return output;
  }
);
