'use server';
/**
 * @fileOverview A flow for generating a comprehensive session report based on multiple AI analysis cycles.
 *
 * - generateSessionReport - A function that handles the session report generation process.
 * - GenerateSessionReportInput - The input type for the generateSessionReport function.
 * - GenerateSessionReportOutput - The return type for the generateSessionReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Original schema for the flow's input data
const CycleDataSchemaForReport = z.object({
  id: z.string(),
  transcription: z.string(),
  summary: z.string(),
  identifiedThemes: z.string(),
  whiteboardContent: z.string(),
  generatedImageDataUri: z.string().describe("Kan være en data URI eller en fejl/fallback-besked."),
  newInsights: z.string(),
});
export type CycleDataForReport = z.infer<typeof CycleDataSchemaForReport>;

const GenerateSessionReportInputSchema = z.object({
  sessionCycles: z.array(CycleDataSchemaForReport).describe('En array af alle gennemførte analysecyklusser i sessionen.'),
  reportTitle: z.string().optional().describe('Valgfri: En titel til rapporten.'),
  projectName: z.string().optional().describe('Valgfri: Projektnavn til rapporten.'),
  contactPersons: z.string().optional().describe('Valgfri: Kontaktpersoner til rapporten.'),
  userName: z.string().optional().describe('Valgfri: Brugerens navn.'),
  userEmail: z.string().optional().describe('Valgfri: Brugerens email.'),
  userOrganization: z.string().optional().describe('Valgfri: Brugerens organisation.'),
});
export type GenerateSessionReportInput = z.infer<typeof GenerateSessionReportInputSchema>;

// Schema for the data structure expected by the prompt template (after processing)
const ProcessedCycleDataSchemaForPrompt = CycleDataSchemaForReport.extend({
  displayIndex: z.number().describe('The 1-based index for display.'),
  processedGeneratedImageStatus: z.string().describe('The processed status string for the generated image.'),
});

const GenerateSessionReportInputSchemaForPrompt = z.object({
  sessionCycles: z.array(ProcessedCycleDataSchemaForPrompt),
  reportTitle: z.string().optional(),
  projectName: z.string().optional(),
  contactPersons: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  userOrganization: z.string().optional(),
});


const GenerateSessionReportOutputSchema = z.object({
  reportText: z.string().describe('Den genererede sessionsrapport som en Markdown-formateret streng.'),
});
export type GenerateSessionReportOutput = z.infer<typeof GenerateSessionReportOutputSchema>;

export async function generateSessionReport(input: GenerateSessionReportInput): Promise<GenerateSessionReportOutput> {
  return generateSessionReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSessionReportPrompt',
  input: {schema: GenerateSessionReportInputSchemaForPrompt}, // Uses the processed schema
  output: {schema: GenerateSessionReportOutputSchema},
  prompt: `Du er en AI-assistent, der har til opgave at generere en omfattende sessionsrapport baseret på en række AI-analysecyklusser.
Strukturer din output præcist som følger, og brug Markdown til formatering af overskrifter og lister. Sørg for, at alle sektioner adresseres.
Hvis data for et specifikt punkt i en cyklus er en fallback- eller fejlbesked (f.eks. 'Resumé utilgængeligt', 'Billedgenerering fejlede'), skal du bemærke dette passende i stedet for at forsøge at opfinde indhold. Svar på dansk.

{{#if reportTitle}}Rapportens titel: {{{reportTitle}}}{{/if}}
{{#if projectName}}Projektnavn: {{{projectName}}}{{/if}}
{{#if contactPersons}}Kontaktpersoner: {{{contactPersons}}}{{/if}}
{{#if userName}}Udarbejdet af (Navn): {{{userName}}}{{/if}}
{{#if userEmail}}Email: {{{userEmail}}}{{/if}}
{{#if userOrganization}}Organisation (Projekt): {{{userOrganization}}}{{/if}}
Antal cyklusser: {{sessionCycles.length}}

Her er rapportstrukturen, du skal følge:

# Rapporttitel: {{#if reportTitle}}{{reportTitle}}{{else}}AI Analyse Sessionsrapport{{/if}}
Version/Dato: (Indsæt dags dato automatisk)
{{#if projectName}}Kunde/Projektnavn: {{projectName}}{{else}}{{#if userOrganization}}Kunde/Projektnavn: {{userOrganization}}{{else}}Kunde/Projektnavn: (Ikke specificeret){{/if}}{{/if}}
{{#if contactPersons}}Kontaktpersoner: {{contactPersons}}{{else}}{{#if userName}}Kontaktpersoner: {{userName}} ({{userEmail}}){{else}}Kontaktpersoner: (Ikke specificeret){{/if}}{{/if}}


## Indholdsfortegnelse
(Generer en simpel liste over hovedsektionerne nedenfor)
1. Executive Summary
2. Metode &amp; Datagrundlag
3. Iterationsoverblik
4. Tværgående temaer &amp; mønstre
5. Visuelle fund
6. Strategiske implikationer
7. Anbefalinger &amp; næste handlinger
8. Appendiks

## 1. Executive Summary
*   Formål med analysen: (Opsummer formålet baseret på den overordnede kontekst af cyklusserne - typisk idéudvikling og indsigtgenerering fra samtaler)
*   Nøglefund og anbefalinger (3-5 bullets baseret på en samlet analyse af alle cyklusser):
    *   (Fund/anbefaling 1)
    *   (Fund/anbefaling 2)
    *   (Fund/anbefaling 3)

## 2. Metode &amp; Datagrundlag
### 2.1 Analyse­workflow
Processen har involveret analyse af inputtekst (transskriptioner/indsigter), generering af AI-billeder (hvis relevant), og efterfølgende billedanalyse for at udlede nye indsigter. Dette er gentaget i op til {{sessionCycles.length}} iterationer.
### 2.2 Inputkilder
De primære inputkilder har været de rå tekster fra hver cyklus (transskriptioner eller tidligere indsigter).
### 2.3 Brugte værktøjer og modeller
Analyserne og genereringen er foretaget ved hjælp af Gemini-modeller via Genkit.

## 3. Iterationsoverblik
{{#each sessionCycles}}
### Cyklus {{this.displayIndex}} – Formål
(Formålet med denne cyklus var typisk at analysere inputteksten: "{{this.transcription}}")

#### Proces &amp; prompt-ændringer
(I denne applikation er prompts typisk faste for hvert trin. Beskriv kort de generelle trin: transkription/input -> resumé -> temaer -> whiteboard -> billede -> indsigter)

#### AI-genererede billeder (miniaturer)
*   Billede genereret for cyklus {{this.displayIndex}}: {{this.processedGeneratedImageStatus}} (Bemærk: Miniature-visning er ikke mulig i tekstformat)

#### Primære indsigter fra cyklus {{this.displayIndex}}
{{#if this.newInsights}}{{this.newInsights}}{{else}}Ingen indsigter genereret for denne cyklus.{{/if}}

#### Nye spørgsmål / næste skridt fra cyklus {{this.displayIndex}}
(Baseret på indsigterne fra denne cyklus, hvilke nye spørgsmål eller næste skridt kunne opstå? - formuler 1-2)

#### Whiteboard-highlights / citater fra cyklus {{this.displayIndex}}
{{#if this.whiteboardContent}}{{this.whiteboardContent}}{{else}}Intet whiteboard-indhold genereret for denne cyklus.{{/if}}
---
{{/each}}

## 4. Tværgående temaer &amp; mønstre
*   Sammenfatning af tilbagevendende topics fra cyklusserne: (Analyser alle 'identifiedThemes' og 'newInsights' på tværs af cyklusserne. Identificer og opsummer 2-3 temaer eller mønstre, der går igen eller udvikler sig gennem iterationerne)
*   Klynger af relaterede idéer eller risikopunkter: (Baseret på ovenstående, er der klynger af idéer eller potentielle risici, der er blevet fremhævet?)

## 5. Visuelle fund
*   Illustrer, hvordan billed­generationen har beriget eller udfordret tekst-indsigterne: (Reflekter over, hvordan det genererede billede (hvis succesfuldt) i hver cyklus potentielt kunne have tilføjet en new dimension til forståelsen af teksten, eller hvordan det kunne have udfordret de oprindelige indsigter. Hvis billedgenerering ofte fejlede, bemærk dette.)

## 6. Strategiske implikationer
*   Hvad betyder indsigterne for forretnings­mål, produkt­roadmap og ressourcer?: (Baseret på de samlede indsigter, hvilke overordnede strategiske implikationer kan udledes?)
*   Trade-offs identificeret (fx tempo kontra dybde): (Er der identificeret nogle trade-offs gennem processen?)

## 7. Anbefalinger &amp; næste handlinger
*   Prioriteret to-trins plan (Quick Wins vs. Long-Term):
    *   Quick Wins: (Forslag 1-2)
    *   Long-Term: (Forslag 1-2)
*   KPI-forslag eller eksperiment­design til validering: (Forslag 1-2)

## 8. Appendiks
(Dette er en liste over, hvad et fuldt appendiks typisk ville indeholde. Den faktiske data er ikke inkluderet her.)
*   Fuld transskription af alle cyklusser
*   Whiteboard-skitser i høj opløsning (hvis relevant for applikationen)
*   Fuld-size AI-genererede billeder (som data URI'er eller referencer)
*   Tekniske parametre (prompt-historik, modelversioner) - (Bemærk: Ikke detaljeret sporet i denne applikation)

---
Generer rapporten baseret på de {{sessionCycles.length}} cyklusser.
Data for cyklusserne:
{{#each sessionCycles}}
--- Cyklus {{this.displayIndex}} Data ---
Transskription/Input: {{{this.transcription}}}
Resumé: {{{this.summary}}}
Identificerede Temaer: {{{this.identifiedThemes}}}
Whiteboard Indhold: {{{this.whiteboardContent}}}
Genereret Billede Status/Prompt: {{{this.processedGeneratedImageStatus}}}
Nye Indsigter: {{{this.newInsights}}}
--- Slut Cyklus {{this.displayIndex}} Data ---
{{/each}}
`,
});

const generateSessionReportFlow = ai.defineFlow(
  {
    name: 'generateSessionReportFlow',
    inputSchema: GenerateSessionReportInputSchema, 
    outputSchema: GenerateSessionReportOutputSchema,
  },
  async (input) => {
    if (!input.sessionCycles || input.sessionCycles.length === 0) {
      return { reportText: "Ingen cyklusdata at generere rapport fra." };
    }

    const processedSessionCycles = input.sessionCycles.map((cycle, index) => {
      let imageStatusMsg = "Ingen billeddata eller ukendt status.";
      if (cycle.generatedImageDataUri) {
        if (cycle.generatedImageDataUri.startsWith("data:image")) {
          imageStatusMsg = "Billede succesfuldt genereret.";
        } else if (cycle.generatedImageDataUri.startsWith("Fejl")) {
          imageStatusMsg = cycle.generatedImageDataUri;
        } else if (cycle.generatedImageDataUri.startsWith("Billedgenerering")) {
          imageStatusMsg = `Billedgenerering sprunget over eller fejlede: ${cycle.generatedImageDataUri}.`;
        } else if (cycle.generatedImageDataUri.trim() !== "" && !cycle.generatedImageDataUri.startsWith("Ugyldig KERNEL")) { 
            imageStatusMsg = cycle.generatedImageDataUri; 
        } else if (cycle.generatedImageDataUri.startsWith("Ugyldig KERNEL")) {
            imageStatusMsg = `Billedgenerering fejlede: ${cycle.generatedImageDataUri}`;
        }
      }

      return {
        ...cycle,
        displayIndex: index + 1,
        processedGeneratedImageStatus: imageStatusMsg,
      };
    });
    
    const today = new Date();
    const formattedDate = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;


    const promptInput = {
      ...input,
      sessionCycles: processedSessionCycles,
      reportTitle: input.reportTitle || `AI Analyse Sessionsrapport ${formattedDate}`,
      projectName: input.projectName || input.userOrganization || "(Ikke specificeret)",
      contactPersons: input.contactPersons || (input.userName ? `${input.userName} (${input.userEmail || 'N/A'})` : "(Ikke specificeret)"),
    };
    
    try {
      const {output} = await prompt(promptInput); 
      if (!output || typeof output.reportText !== 'string' || output.reportText.trim() === "") {
        console.error("GenerateSessionReportFlow: Output fra prompt var ugyldigt eller manglede rapporttekst.", output);
        return { reportText: "Kunne ikke generere sessionsrapport." };
      }
      // Inject current date into the report text if a placeholder like (Indsæt dags dato automatisk) is present
      let reportTextWithDate = output.reportText.replace(/\(Indsæt dags dato automatisk\)/g, formattedDate);
      
      return { reportText: reportTextWithDate };
    } catch (error: any) {
      console.error("GenerateSessionReportFlow: Fejl under prompt-kald. Fejl:", error.message || error, "Input til prompt:", JSON.stringify(promptInput, null, 2));
      return { reportText: `Fejl under generering af sessionsrapport: ${error.message || error}` };
    }
  }
);
