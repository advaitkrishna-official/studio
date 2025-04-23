'use server';

/**
 * @fileOverview AI flow to assign a task to students.
 *
 * - assignTask - A function that handles the task assignment.
 * - AssignTaskInput - The input type for the assignTask function.
 * - AssignTaskOutput - The return type for the assignTask function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AssignTaskInputSchema = z.object({
  classId: z.string().describe('The ID of the class to assign the task to.'),
  taskDetails: z.string().describe('A JSON string containing the details of the task, including title, description, and due date.'),
});
export type AssignTaskInput = z.infer<typeof AssignTaskInputSchema>;

const AssignTaskOutputSchema = z.object({
  success: z.boolean().describe('Whether the task was successfully assigned or not.'),
  message: z.string().describe('A message indicating the status of the assignment.'),
});
export type AssignTaskOutput = z.infer<typeof AssignTaskOutputSchema>;

export async function assignTask(input: AssignTaskInput): Promise<AssignTaskOutput> {
  return assignTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assignTaskPrompt',
  input: {
    schema: z.object({
      classId: z.string().describe('The ID of the class to assign the task to.'),
      taskDetails: z.string().describe('A JSON string containing the details of the task, including title, description, and due date.'),
    }),
  },
  output: {
    schema: z.object({
      success: z.boolean().describe('Whether the task was successfully assigned or not.'),
      message: z.string().describe('A message indicating the status of the assignment.'),
    }),
  },
  prompt: `You are an AI assistant designed to assign tasks to students.
  You will be given the class ID and the task details.
  You will assign the task to the students in the class.

  Class ID: {{{classId}}}
  Task Details: {{{taskDetails}}}

  Provide the output in JSON format.
  `,
});

const assignTaskFlow = ai.defineFlow<
  typeof AssignTaskInputSchema,
  typeof AssignTaskOutputSchema
>({
  name: 'assignTaskFlow',
  inputSchema: AssignTaskInputSchema,
  outputSchema: AssignTaskOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
