'use server';

/**
 * @fileOverview AI flow to generate an overview of the student performance and recent activities.
 *
 * - generateOverview - A function that handles the overview generation.
 * - GenerateOverviewInput - The input type for the generateOverview function.
 * - GenerateOverviewOutput - The return type for the generateOverview function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateOverviewInputSchema = z.object({
  teacherId: z.string().describe('The ID of the teacher.'),
  studentData: z.string().describe('JSON string of the student data, including student IDs, activity history, and performance metrics.'),
});
export type GenerateOverviewInput = z.infer<typeof GenerateOverviewInputSchema>;

const GenerateOverviewOutputSchema = z.object({
  totalStudents: z.number().describe('The total number of students.'),
  recentActivities: z.array(z.string()).describe('A list of recent activities.'),
  performanceSummary: z.string().describe('A summary of the student performance.'),
  insights: z.string().describe('AI-generated insights about the data.')
});
export type GenerateOverviewOutput = z.infer<typeof GenerateOverviewOutputSchema>;

export async function generateOverview(input: GenerateOverviewInput): Promise<GenerateOverviewOutput> {
  return generateOverviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOverviewPrompt',
  input: {
    schema: z.object({
      teacherId: z.string().describe('The ID of the teacher.'),
      studentData: z.string().describe('JSON string of the student data, including student IDs, activity history, and performance metrics.'),
    }),
  },
  output: {
    schema: z.object({
      totalStudents: z.number().describe('The total number of students.'),
      recentActivities: z.array(z.string()).describe('A list of recent activities.'),
      performanceSummary: z.string().describe('A summary of the student performance.'),
      insights: z.string().describe('AI-generated insights about the data.')
    }),
  },
  prompt: `You are an AI assistant designed to provide an overview of student data for teachers.

You will be given the teacher ID and student data, and you will provide:
1.  The total number of students.
2.  A list of recent activities.
3.  A summary of the student performance.
4.  AI-generated insights about the data.

Teacher ID: {{{teacherId}}}
Student Data: {{{studentData}}}

Provide the output in JSON format.
`,
});

const generateOverviewFlow = ai.defineFlow<
  typeof GenerateOverviewInputSchema,
  typeof GenerateOverviewOutputSchema
>({
  name: 'generateOverviewFlow',
  inputSchema: GenerateOverviewInputSchema,
  outputSchema: GenerateOverviewOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});

