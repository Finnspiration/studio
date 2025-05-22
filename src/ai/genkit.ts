import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// You can specify different Gemini models here for text generation.
// Examples:
// - 'googleai/gemini-1.5-flash-latest' (good balance of speed and capability)
// - 'googleai/gemini-1.5-pro-latest' (more powerful, potentially slower/more expensive)
// - 'googleai/gemini-2.0-flash' (another valid flash model option)
//
// For image generation, the 'googleai/gemini-2.0-flash-exp' model is
// typically specified directly in the image generation flow due to its
// experimental image generation capabilities.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
});
