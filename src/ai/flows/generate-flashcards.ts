
'use server';
/**
 * @fileOverview Flashcard generation AI agent.
 *
 * - generateFlashcards - A function that handles the flashcard generation process.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate flashcards.'),
  numCards: z.number().min(1).max(20).default(10).describe('The number of flashcards to generate.'),
  grade: z.string().describe('The grade of the student.').nonempty(), // Ensure grade is non-empty
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({ front: z.string().describe('The question or term on the front of the flashcard.'), back: z.string().describe('The answer or definition on the back of the flashcard.') });

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of flashcards.'),
  progress: z.string().optional().describe('A short summary of what was generated.'), // Made optional
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {
    schema: z.object({
      topic: z.string().describe('The topic for which to generate flashcards.'),
      numCards: z.number().describe('The number of flashcards to generate.'),
      context: z.string().describe('The context (e.g., grade level) for generating flashcards.'),
    }),
  },
  output: {
    // Specify a more precise output schema for the prompt itself
    schema: z.object({
      flashcards: z.array(FlashcardSchema).describe('An array of flashcard objects, each with a "front" and "back" field.'),
    }),
  },
  prompt: `You are an AI assistant specialized in creating educational flashcards.
Generate exactly {{numCards}} flashcards for the topic "{{topic}}" suitable for the following context:
{{{context}}}

Each flashcard MUST have a clear question or term on the front and a concise, accurate answer or definition on the back.

Your response MUST be a valid JSON object containing ONLY a key named "flashcards".
The value of "flashcards" MUST be an array of JSON objects.
Each object in the array represents a single flashcard and MUST contain exactly two string fields: "front" and "back".

Example JSON output format:
{
  "flashcards": [
    {
      "front": "What is the powerhouse of the cell?",
      "back": "Mitochondria"
    },
    {
      "front": "Define 'photosynthesis'.",
      "back": "The process used by plants to convert light energy into chemical energy."
    }
  ]
}`,
});


const generateFlashcardsFlow = ai.defineFlow<
  typeof GenerateFlashcardsInputSchema,
  typeof GenerateFlashcardsOutputSchema
>(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async input => {
    let context: string = '';
    // Ensure grade is lowercase for consistent matching and handle potential null/undefined
    const gradeInput = input.grade || ''; // Default to empty string if undefined/null
    const gradeLower = gradeInput.toLowerCase().trim();

    console.log(`generateFlashcardsFlow: Received grade input: ${input.grade}, Processed as: ${gradeLower}`); // Debug log

    // Define grade contexts (ensure consistency)
     const gradeContexts: Record<string, string> = {
       'grade-1': `Grade 1 Subjects: Basic Phonics, Counting, Shapes, Colors, Simple Addition/Subtraction, Animals, Plants. Keep language extremely simple.`,
       'grade-2': `Grade 2 Subjects: Reading simple sentences, Basic Grammar, Addition/Subtraction (within 100), Telling Time, Money Basics, Life Cycles, Weather. Use simple vocabulary.`,
       'grade-3': `Grade 3 Subjects: Reading paragraphs, Multiplication/Division basics, Fractions intro, States of Matter, Solar System basics, Community Roles. Slightly more complex sentences.`,
       'grade-4': `Grade 4 Subjects: Reading comprehension, Multiplication/Division fluency, Fractions, Decimals intro, US Regions/States, Simple Machines, Ecosystems. Clear definitions needed.`,
       'grade-5': `Grade 5 Subjects: Analyzing text, Fractions operations, Decimals, Geometry basics (angles, shapes), US History (Colonial), Human Body Systems, Matter Properties. Explain concepts clearly.`,
       'grade-6': `Grade 6 Subjects: Ratios, Proportions, Percentages intro, Algebraic thinking intro, World Geography (Continents/Oceans), Earth Science (Rocks, Plate Tectonics), Ancient Civilizations. Define key terms.`,
       'grade-7': `Grade 7 Subjects: Pre-Algebra (variables, equations), Geometry (area, volume), Life Science (Cells, Classification), World History (Medieval), English Grammar rules. Use precise language.`,
       'grade-8': `Grade 8 Subjects: Algebra I (linear equations, inequalities), Physical Science (Forces, Motion, Energy), US History (Constitution, Civil War), English Literature analysis. Assume foundational knowledge.`,
       // Add more grades as needed
     };

    context = gradeContexts[gradeLower] || `The student is in an unspecified grade (Received: ${input.grade}). Please provide age-appropriate answers based on the topic: ${input.topic}. Ensure clarity and accuracy.`;

    console.log(`generateFlashcardsFlow: Using context for ${gradeLower}: ${context.substring(0, 100)}...`); // Log the context being used


    try {
        console.log(`generateFlashcardsFlow: Calling AI prompt with topic: ${input.topic}, numCards: ${input.numCards}`);
        const response = await prompt({
            topic: input.topic,
            numCards: input.numCards,
            context: context,
        });
        console.log("generateFlashcardsFlow: AI Response received:", response); // Log the raw response

        // Strict validation of the output structure
        if (!response || typeof response !== 'object' || !response.output || !response.output.flashcards || !Array.isArray(response.output.flashcards)) {
             console.error("generateFlashcardsFlow: AI did not return a valid { output: { flashcards: [...] } } structure:", response);
             throw new Error("AI returned an invalid response structure.");
        }

        const flashcardsArray = response.output.flashcards;

        // Validate individual flashcards
        if (flashcardsArray.some(card => typeof card.front !== 'string' || typeof card.back !== 'string')) {
            console.error("generateFlashcardsFlow: Received malformed flashcard objects:", flashcardsArray);
            throw new Error("Received malformed flashcard objects from AI.");
        }

        // Check if the expected number of cards was generated (optional, but good sanity check)
         if (flashcardsArray.length !== input.numCards) {
            console.warn(`generateFlashcardsFlow: AI generated ${flashcardsArray.length} cards, but ${input.numCards} were requested.`);
            // Decide how to handle this: proceed, throw error, or just log.
            // For now, let's proceed but log a warning.
         }

        return {
          flashcards: flashcardsArray,
          // Keep progress message optional or remove if not needed
          // progress: `Generated ${flashcardsArray.length} flashcards on the topic of ${input.topic}.`,
        };
    } catch (error: any) {
        console.error("generateFlashcardsFlow: Error during AI call or processing:", error);
        // Handle specific errors more granularly
        if (error.message.includes('Quota')) {
             throw new Error('API quota limit reached. Please try again later.');
        }
        if (error instanceof SyntaxError || error.message.toLowerCase().includes('json')) {
             // This catches errors if the AI response wasn't valid JSON
             console.error("generateFlashcardsFlow: Failed to parse JSON response from AI.");
             throw new Error('Failed to parse the response from the AI. Please try again.');
        }
         if (error.message.includes('invalid response structure') || error.message.includes('malformed flashcard objects')) {
            // Re-throw our custom validation errors
            throw error;
        }
        // Generic fallback error
        throw new Error(`Failed to generate flashcards: ${error.message}`);
    }
  }
);
