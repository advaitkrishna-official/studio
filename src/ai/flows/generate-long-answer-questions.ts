'use server';

/**
 * @fileOverview A long answer question generator AI agent.
 *
 * - generateLongAnswerQuestions - A function that handles the long answer question generation process.
 * - GenerateLongAnswerQuestionsInput - The input type for the generateLongAnswerQuestions function.
 * - GenerateLongAnswerQuestionsOutput - The return type for the generateLongAnswerQuestions function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateLongAnswerQuestionsInputSchema = z.object({
  topic: z.string().describe('The topic to generate long answer questions for.'),
  numQuestions: z.number().describe('The number of questions to generate.').default(3),
});
export type GenerateLongAnswerQuestionsInput = z.infer<typeof GenerateLongAnswerQuestionsInputSchema>;

const GenerateLongAnswerQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('The generated long answer questions.'),
  keyPoints: z.array(z.string()).describe('Suggested key points to include in the answers.'),
});
export type GenerateLongAnswerQuestionsOutput = z.infer<typeof GenerateLongAnswerQuestionsOutputSchema>;

export async function generateLongAnswerQuestions(
  input: GenerateLongAnswerQuestionsInput
): Promise<GenerateLongAnswerQuestionsOutput> {
  return generateLongAnswerQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLongAnswerQuestionsPrompt',
  input: {
    schema: z.object({
      topic: z.string().describe('The topic to generate long answer questions for.'),
      numQuestions: z.number().describe('The number of questions to generate.'),
    }),
  },
  output: {
    schema: z.object({
      questions: z.array(z.string()).describe('The generated long answer questions.'),
      keyPoints: z.array(z.string()).describe('Suggested key points to include in the answers.'),
    }),
  },
  prompt: `You are an AI assistant designed to generate long answer questions on a given topic.
  Generate {{numQuestions}} long answer questions on the topic of {{{topic}}}.
  Also, suggest key points that should be included in the answers to these questions.
  Format the output as a JSON object with "questions" and "keyPoints" keys, each containing an array of strings.
  `,
});

const generateLongAnswerQuestionsFlow = ai.defineFlow<
  typeof GenerateLongAnswerQuestionsInputSchema,
  typeof GenerateLongAnswerQuestionsOutputSchema
>({
  name: 'generateLongAnswerQuestionsFlow',
  inputSchema: GenerateLongAnswerQuestionsInputSchema,
  outputSchema: GenerateLongAnswerQuestionsOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
