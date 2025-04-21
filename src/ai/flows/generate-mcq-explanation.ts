'use server';

/**
 * @fileOverview An AI agent that generates explanations for multiple choice question (MCQ) answers.
 *
 * - generateMcqExplanation - A function that handles the MCQ explanation generation process.
 * - GenerateMcqExplanationInput - The input type for the generateMcqExplanation function.
 * - GenerateMcqExplanationOutput - The return type for the generateMcqExplanation function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateMcqExplanationInputSchema = z.object({
  question: z.string().describe('The multiple choice question.'),
  options: z.array(z.string()).describe('The options for the question.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
});
export type GenerateMcqExplanationInput = z.infer<typeof GenerateMcqExplanationInputSchema>;

const GenerateMcqExplanationOutputSchema = z.object({
  explanation: z.string().describe('The explanation for the correct answer, including steps or reasoning.'),
});
export type GenerateMcqExplanationOutput = z.infer<typeof GenerateMcqExplanationOutputSchema>;

export async function generateMcqExplanation(
  input: GenerateMcqExplanationInput
): Promise<GenerateMcqExplanationOutput> {
  return generateMcqExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'mcqExplanationPrompt',
  input: {
    schema: z.object({
      question: z.string().describe('The multiple choice question.'),
      options: z.array(z.string()).describe('The options for the question.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    }),
  },
  output: {
    schema: z.object({
      explanation: z.string().describe('The explanation for the correct answer, including steps or reasoning.'),
    }),
  },
  prompt: `You are an AI assistant designed to provide clear and concise explanations for multiple choice questions.

  Given the question, its options, and the correct answer, provide a step-by-step explanation of why the correct answer is the right one.
  Also, briefly explain why the other options are incorrect.

  Question: {{{question}}}
  Options: {{{options}}}
  Correct Answer: {{{correctAnswer}}}

  Explanation:
  `,
});

const generateMcqExplanationFlow = ai.defineFlow<
  typeof GenerateMcqExplanationInputSchema,
  typeof GenerateMcqExplanationOutputSchema
>({
  name: 'generateMcqExplanationFlow',
  inputSchema: GenerateMcqExplanationInputSchema,
  outputSchema: GenerateMcqExplanationOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
