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
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Specific model for image generation
      prompt: input.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or did not return a valid image URL.');
    }
    
    // Gemini 2.0 Flash experimental returns an array of media items, even if only one is generated.
    // We'll take the first one.
    const imageUrl = Array.isArray(media) ? media[0]?.url : media.url;

    if (!imageUrl) {
         throw new Error('Image generation failed or did not return a valid image URL from media array.');
    }

    return { imageDataUri: imageUrl };
  }
);
