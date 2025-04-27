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
  grade: z.string().describe('The grade of the student.'),
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
      context: z.string().describe('The context for the mcq question.'),
    }),
  },
  output: {
    schema: z.object({
      explanation: z.string().describe('The explanation for the correct answer, including steps or reasoning.'),
    }),
  },
  prompt: `You are an AI assistant designed to provide clear and concise explanations for multiple choice questions.
  The context provided is as follows:\n
  <CODE_BLOCK>\n
  {{{context}}}\n
  </CODE_BLOCK>\n
  Given the question, its options, and the correct answer, provide a step-by-step explanation of why the correct answer is the right one.
  Also, briefly explain why the other options are incorrect.
  \n
  <CODE_BLOCK>
  Question: {{{question}}}\n
  </CODE_BLOCK>
  <CODE_BLOCK>
  Options: {{{options}}}\n
  </CODE_BLOCK>
  <CODE_BLOCK>
  Correct Answer: {{{correctAnswer}}}\n
  </CODE_BLOCK>

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
  let context = '';
  switch (input.grade) {
    case 'grade-8':
      context = `
      Grade 8 Subjects:
      - Mathematics: Algebra, Geometry, Data Handling
      - Science: Physics (Forces, Motion), Chemistry (Elements, Compounds), Biology (Cells, Systems)
      - English: Literature, Grammar
      - History: Modern World History
    `;
      break;
    case 'grade-6':
      context = `
      Grade 6 Subjects:
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
    default:
      context = `The student is in an unspecified grade, please provide answer based on the best information you know.`;
      break;
  }
  const {output} = await prompt({...input, context});
  return output!;
});
