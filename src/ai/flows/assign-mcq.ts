'use server';

/**
 * @fileOverview AI flow to assign multiple choice questions (MCQs) to students.
 *
 * - assignMCQ - A function that handles the assignment of MCQs to students.
 * - AssignMCQInput - The input type for the assignMCQ function.
 * - AssignMCQOutput - The return type for the assignMCQ function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AssignMCQInputSchema = z.object({
  classId: z.string().describe('The ID of the class to assign the MCQs to.'),
  mcqData: z.string().describe('The JSON string of the MCQs to assign.'),
});
export type AssignMCQInput = z.infer<typeof AssignMCQInputSchema>;

const AssignMCQOutputSchema = z.object({
  success: z.boolean().describe('Whether the MCQs were successfully assigned or not.'),
  message: z.string().describe('A message indicating the status of the assignment.'),
});
export type AssignMCQOutput = z.infer<typeof AssignMCQOutputSchema>;

export async function assignMCQ(input: AssignMCQInput): Promise<AssignMCQOutput> {
  return assignMCQFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assignMCQPrompt',
  input: {
    schema: z.object({
      classId: z.string().describe('The ID of the class to assign the MCQs to.'),
      mcqData: z.string().describe('The JSON string of the MCQs to assign.'),
    }),
  },
  output: {
    schema: z.object({
      success: z.boolean().describe('Whether the MCQs were successfully assigned or not.'),
      message: z.string().describe('A message indicating the status of the assignment.'),
    }),
  },
  prompt: `You are an AI assistant designed to assign multiple choice questions (MCQs) to students.
  You will be given the class ID and the MCQs data.
  You will assign the MCQs to the students in the class.

  Class ID: {{{classId}}}
  MCQs Data: {{{mcqData}}}

  Provide the output in JSON format.
  `,
});

const assignMCQFlow = ai.defineFlow<
  typeof AssignMCQInputSchema,
  typeof AssignMCQOutputSchema
>({
  name: 'assignMCQFlow',
  inputSchema: AssignMCQInputSchema,
  outputSchema: AssignMCQOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
