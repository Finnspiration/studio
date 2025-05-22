
// src/ai/flows/generate-image-flow.ts
'use server';
/**
 * @fileOverview A flow for generating images based on text prompts.
 *
 * - generateImage - A function that handles the image generation process.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The fully constructed text prompt to generate an image from, including style instructions.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Or an error message if generation failed."
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    if (!input.prompt || input.prompt.trim() === '' || input.prompt.startsWith("Fejl") || input.prompt.startsWith("Kunne ikke") || input.prompt.startsWith("Ingen specifikke") || input.prompt.startsWith("Ugyldig KERNEL prompt")) {
      const errorMsg = `GenerateImageFlow: Ugyldig prompt for billedgenerering: "${input.prompt || 'Tom prompt'}". Kan ikke generere billede.`;
      console.warn(errorMsg);
      return { imageDataUri: errorMsg };
    }
    
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', 
        prompt: input.prompt, // Use the prompt directly
        config: {
          responseModalities: ['TEXT', 'IMAGE'], 
        },
      });

      let imageUrl: string | undefined;
      if (Array.isArray(media) && media.length > 0) {
        imageUrl = media[0]?.url;
      } else if (media && typeof media === 'object' && 'url' in media) {
        // This case might be for older models or different media types.
        // Ensuring it's handled if 'media' is a single object with a 'url'.
        imageUrl = (media as { url: string }).url;
      }
      
      if (!imageUrl) {
        let errorDetails = "Billedgenerering fejlede eller returnerede ikke en gyldig billed-URL.";
        if (media) {
          errorDetails += ` Modtaget media: ${JSON.stringify(media, null, 2)}`;
        }
        console.error("generateImageFlow error:", errorDetails);
        return { imageDataUri: errorDetails };
      }
      return { imageDataUri: imageUrl };

    } catch (error) {
      console.error("GenerateImageFlow: Fejl under ai.generate kald", error);
      return { imageDataUri: `Fejl under billedgenerering: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
);

    