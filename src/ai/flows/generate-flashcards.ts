
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
  grade: z.string().describe('The grade of the student.').nonempty(),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
  front: z.string().describe('The question or term on the front of the flashcard.'),
  back: z.string().describe('The answer or definition on the back of the flashcard.'),
});

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of flashcards generated for the topic.'),
  progress: z.string().describe('A short summary of what was generated.'), // Keep progress field for potential future use
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
      context: z.string().describe('The context for generating flashcards.'),
    }),
  },
  output: {
    schema: z.object({
      flashcards: z.array(FlashcardSchema).describe('An array of flashcards generated for the topic.'),
    }),
  },
  prompt: `You are an AI flashcard generator. Generate a set of flashcards for the given topic based on the context provided.

  <CODE_BLOCK>
  Context:\n
  {{{context}}}\n
  Topic: {{{topic}}}\n
  </CODE_BLOCK>
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
    let context: string = '';

    switch (input.grade) {
      case 'grade-8':
        context = `Grade 8 Subjects:
      - Mathematics: Algebra, Geometry, Data Handling
      - Science: Physics (Forces, Motion), Chemistry (Elements, Compounds), Biology (Cells, Systems)
      - English: Literature, Grammar
      - History: Modern World History
    `;
        break;
      case 'grade-6':
        context = `Grade 6 Subjects:
      - Mathematics: Fractions, Decimals, Ratios
      - Science: Simple Machines, Living Things
      - English: Reading Comprehension, Creative Writing
      - Geography: Continents and Oceans
    `;
        break;
      case 'grade-4':
        context = `Grade 4 Subjects:
      - Mathematics: Addition, Subtraction, Introduction to Multiplication
      - Science: Animals, Plants, Environment
      - English: Vocabulary Building, Sentence Formation
      - Social Studies: Communities and Citizenship
    `;
        break;
      default: context = `The student is in an unspecified grade (Received: ${input.grade}). Please provide age-appropriate answers based on the topic: ${input.topic}.`;
    }
    try {
        const {output} = await prompt({...input, context});
        if (!output || !output.flashcards) {
            throw new Error("AI did not return valid flashcard data.");
        }
        return {
          flashcards: output.flashcards,
          progress: `Generated ${output.flashcards.length} flashcards on the topic of ${input.topic}.`, // Updated progress message
        };
    } catch (error: any) {
        console.error("Error in generateFlashcardsFlow:", error);
        // Handle quota errors specifically if needed, or re-throw
        if (error.message.includes('Quota')) {
             throw new Error('API quota limit reached. Please try again later.');
        }
        throw new Error(`Failed to generate flashcards: ${error.message}`);
    }
  }
);
