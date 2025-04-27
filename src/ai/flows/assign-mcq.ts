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
  classId: z.string().describe('The ID of the class to assign the MCQs to.').optional(),
  mcqData: z.string().describe('The JSON string of the MCQs to assign.').optional(),
  grade: z.string().describe('The grade of the student.').nonempty(),
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
      classId: z.string().describe('The ID of the class to assign the MCQs to.').optional(),
      mcqData: z.string().describe('The JSON string of the MCQs to assign.').optional(),
      context: z.string().describe('The context for answering the MCQs questions.'),
    }),
  },
  output: {
    schema: z.object({
      success: z.boolean().describe('Whether the MCQs were successfully assigned or not.'),
      message: z.string().describe('A message indicating the status of the assignment.'),
    }),
  },
  prompt: `You are an AI assistant designed to help students answer multiple-choice questions (MCQs).
  Your task is to provide answers based on the context provided.
  The relevant course material is given as context.

  <CODE_BLOCK>
  Context:
  {{{context}}}
  </CODE_BLOCK>
  
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
    default: context = `The student is in an unspecified grade, please provide answer based on the best information you know.`; break;
  }

  const {output} = await prompt({
    classId: input.classId,
    mcqData: input.mcqData,
    context,
  });

  return output!;;
});
