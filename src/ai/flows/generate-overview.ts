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
  grade: z.string().describe('The grade of the students.').optional(),
});
export type GenerateOverviewInput = z.infer<typeof GenerateOverviewInputSchema>;

const GenerateOverviewOutputSchema = z.object({
  totalStudents: z.number().describe('The total number of students.'),
  recentActivities: z.array(z.string()).describe('A list of recent activities.'),
  performanceSummary: z.string().describe('A summary of the student performance.'),
  insights: z.string().describe('AI-generated insights about the data.'),
  suggestedActivities: z.array(z.string()).describe('A list of suggested activities.')
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
      context: z.string().describe('The context for understanding the student performance.'),
    }),
  },
  output: {
    schema: z.object({
      totalStudents: z.number().describe('The total number of students.'),
      recentActivities: z.array(z.string()).describe('A list of recent activities.'),
      performanceSummary: z.string().describe('A summary of the student performance.'),
      insights: z.string().describe('AI-generated insights about the data.'),
      suggestedActivities: z.array(z.string()).describe('A list of suggested activities.')
    }),
  },
  prompt: `You are an AI assistant designed to provide an overview of student data for teachers.

You will be given the teacher ID and student data, and you will provide:
You are provided with some context to help you understand the grade level for these students.
1.  The total number of students.
2.  A list of recent activities.
3.  A summary of the student performance.
4.  AI-generated insights about the data.
5.  A list of suggested activities for the teacher to implement.

Here is some sample student data:
[
    {
        "id": "student1",
        "email": "student1@example.com",
        "studentNumber": "1001",
        "class": "Grade 8",
        "progress": 75,
        "role": "student"
    },
    {
        "id": "student2",
        "email": "student2@example.com",
        "studentNumber": "1002",
        "class": "Grade 8",
        "progress": 50,
        "role": "student"
    }
]

<CODE_BLOCK>
  Context:
  {{{context}}}
</CODE_BLOCK>

<CODE_BLOCK>
  Teacher ID: {{{teacherId}}}
  Student Data: {{{studentData}}}
</CODE_BLOCK>

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
    let context: string = '';
  
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
      context =`
      Grade 4 Subjects:
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
