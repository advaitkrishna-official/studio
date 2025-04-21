'use server';

/**
 * @fileOverview An AI agent that provides feedback on essays.
 *
 * - provideEssayFeedback - A function that provides feedback on an essay.
 * - ProvideEssayFeedbackInput - The input type for the provideEssayFeedback function.
 * - ProvideEssayFeedbackOutput - The return type for the provideEssayFeedback function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ProvideEssayFeedbackInputSchema = z.object({
  essay: z.string().describe('The essay to provide feedback on.'),
  topic: z.string().describe('The topic of the essay.'),
});
export type ProvideEssayFeedbackInput = z.infer<typeof ProvideEssayFeedbackInputSchema>;

const ProvideEssayFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Detailed feedback on the essay, including areas for improvement.'),
});
export type ProvideEssayFeedbackOutput = z.infer<typeof ProvideEssayFeedbackOutputSchema>;

export async function provideEssayFeedback(input: ProvideEssayFeedbackInput): Promise<ProvideEssayFeedbackOutput> {
  return provideEssayFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideEssayFeedbackPrompt',
  input: {
    schema: z.object({
      essay: z.string().describe('The essay to provide feedback on.'),
      topic: z.string().describe('The topic of the essay.'),
    }),
  },
  output: {
    schema: z.object({
      feedback: z.string().describe('Detailed feedback on the essay, including areas for improvement.'),
    }),
  },
  prompt: `You are an AI essay feedback tool. Review the essay below and provide detailed feedback on areas for improvement, including grammar, sentence structure, clarity, and argumentation.

Essay Topic: {{{topic}}}
Essay: {{{essay}}}

Feedback:
`,
});

const provideEssayFeedbackFlow = ai.defineFlow<
  typeof ProvideEssayFeedbackInputSchema,
  typeof ProvideEssayFeedbackOutputSchema
>({
  name: 'provideEssayFeedbackFlow',
  inputSchema: ProvideEssayFeedbackInputSchema,
  outputSchema: ProvideEssayFeedbackOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});