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
  prompt: z.string().describe('The text prompt to generate an image from.'),
  style: z.string().optional().describe('Optional: The desired artistic style for the image (e.g., "photorealistic", "cartoon").'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
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
    const styledPrompt = input.style ? `${input.prompt}, in a ${input.style} style` : input.prompt;

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Specific model for image generation
      prompt: styledPrompt, // Use the styled prompt
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both
      },
    });

    // Gemini 2.0 Flash experimental can return an array of media items.
    // We'll take the first one if it's an array.
    let imageUrl: string | undefined;
    if (Array.isArray(media) && media.length > 0) {
      imageUrl = media[0]?.url;
    } else if (media && typeof media === 'object' && 'url' in media) {
      // Handle cases where media might be a single object (though array is typical for gemini-2.0-flash-exp image)
      imageUrl = (media as { url: string }).url;
    }
    

    if (!imageUrl) {
      let errorDetails = "Image generation failed or did not return a valid image URL.";
      if (media) {
        errorDetails += ` Received media: ${JSON.stringify(media, null, 2)}`;
      }
      console.error("generateImageFlow error:", errorDetails);
      throw new Error(errorDetails);
    }

    return { imageDataUri: imageUrl };
  }
);
