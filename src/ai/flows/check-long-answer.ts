'use server';

/**
 * @fileOverview AI flow to check the long answer of the student.
 *
 * - checkLongAnswer - A function that handles the long answer checking.
 * - CheckLongAnswerInput - The input type for the checkLongAnswer function.
 * - CheckLongAnswerOutput - The return type for the checkLongAnswer function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const CheckLongAnswerInputSchema = z.object({
  question: z.string().describe('The long answer question.'),
  studentAnswer: z.string().describe('The student\'s answer to the question.'),
  keyPoints: z.array(z.string()).describe('The key points that should be included in the answer.'),
});
export type CheckLongAnswerInput = z.infer<typeof CheckLongAnswerInputSchema>;

const CheckLongAnswerOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the student\'s answer is correct or not.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  feedback: z.string().describe('Feedback on the student\'s answer, including areas for improvement and mistakes.'),
});
export type CheckLongAnswerOutput = z.infer<typeof CheckLongAnswerOutputSchema>;

export async function checkLongAnswer(input: CheckLongAnswerInput): Promise<CheckLongAnswerOutput> {
  return checkLongAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checkLongAnswerPrompt',
  input: {
    schema: z.object({
      question: z.string().describe('The long answer question.'),
      studentAnswer: z.string().describe('The student\'s answer to the question.'),
      keyPoints: z.array(z.string()).describe('The key points that should be included in the answer.'),
    }),
  },
  output: {
    schema: z.object({
      isCorrect: z.boolean().describe('Whether the student\'s answer is correct or not.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
      feedback: z.string().describe('Feedback on the student\'s answer, including areas for improvement and mistakes.'),
    }),
  },
  prompt: `You are an AI tutor specializing in checking long answer questions.

You will be given a question, the student's answer, and the key points that should be included in the answer.
You will provide a detailed feedback on the student's answer, including whether the answer is correct, a correct answer, areas for improvement, and mistakes.

Question: {{{question}}}
Student's Answer: {{{studentAnswer}}}
Key Points: {{{keyPoints}}}

Provide the output in JSON format.
`,
});

const checkLongAnswerFlow = ai.defineFlow<
  typeof CheckLongAnswerInputSchema,
  typeof CheckLongAnswerOutputSchema
>({
  name: 'checkLongAnswerFlow',
  inputSchema: CheckLongAnswerInputSchema,
  outputSchema: CheckLongAnswerOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
