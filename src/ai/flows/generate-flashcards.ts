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
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
  front: z.string().describe('The question or term on the front of the flashcard.'),
  back: z.string().describe('The answer or definition on the back of the flashcard.'),
});

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of flashcards generated for the topic.'),
  progress: z.string().describe('A short summary of what was generated.'),
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
    }),
  },
  output: {
    schema: z.object({
      flashcards: z.array(FlashcardSchema).describe('An array of flashcards generated for the topic.'),
    }),
  },
  prompt: `You are an AI flashcard generator. Generate a set of flashcards for the given topic.

Topic: {{{topic}}}
Number of flashcards: {{{numCards}}}

Each flashcard should have a clear question or term on the front and a concise answer or definition on the back.
Ensure that the flashcards are informative and helpful for studying the topic. Return a JSON array of flashcards.

Your output MUST be a JSON array of flashcard objects. Each flashcard object must have a \"front\" and \"back\" field.
Here is an example of what the output format should look like:

{
  \"flashcards\": [
    {
      \"front\": \"What is the capital of France?\",
      \"back\": \"Paris\"
    },
    {
      \"front\": \"What is the chemical symbol for water?\",
      \"back\": \"H2O\"
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
    const {output} = await prompt(input);
    return {
      flashcards: output!.flashcards,
      progress: `Generated ${input.numCards} flashcards on the topic of ${input.topic}.`,
    };
  }
);
