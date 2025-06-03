
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
    // More robust check for invalid or insufficient prompts
    const invalidPromptIndicators = [
      "Fejl", "Kunne ikke", "Ingen specifikke", "Ugyldig KERNEL prompt", 
      "Billedgenerering sprunget over", "Resumé utilgængeligt.", "Temaer utilgængelige.",
      "GenerateImageFlow: Ugyldig prompt"
    ];

    const isInvalidPrompt = !input.prompt || 
                            input.prompt.trim() === '' || 
                            invalidPromptIndicators.some(indicator => input.prompt.includes(indicator));

    if (isInvalidPrompt) {
      const errorMsg = `GenerateImageFlow: Ugyldig eller utilstrækkelig prompt for billedgenerering: "${input.prompt || 'Tom prompt'}". Billedgenerering springes over.`;
      console.warn(errorMsg);
      return { imageDataUri: errorMsg };
    }
    
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', 
        prompt: input.prompt, 
        config: {
          responseModalities: ['TEXT', 'IMAGE'], 
        },
      });

      let imageUrl: string | undefined;
      if (Array.isArray(media) && media.length > 0) {
        imageUrl = media[0]?.url;
      } else if (media && typeof media === 'object' && 'url' in media) {
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

    } catch (error: any) {
      let errorMessage = `Fejl under billedgenerering: ${error?.message || String(error)}`;
      if (error?.message && error.message.includes("Image generation is not available in your country")) {
        errorMessage = "Billedgenerering er desværre ikke tilgængelig i din region.";
        console.warn(`GenerateImageFlow: ${errorMessage} (Oprindelig fejl: ${error.message})`);
      } else {
        console.error("GenerateImageFlow: Fejl under ai.generate kald", error);
      }
      return { imageDataUri: errorMessage };
    }
  }
);
