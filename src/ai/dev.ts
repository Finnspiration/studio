
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-transcription.ts';
import '@/ai/flows/generate-whiteboard-ideas.ts';
import '@/ai/flows/transcribe-audio-flow.ts';
import '@/ai/flows/generate-image-flow.ts'; // Added new image generation flow
