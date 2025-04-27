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
  classId: z.string().describe('The ID of the class to assign the task to').optional(),
  taskDetails: z.string().describe('A JSON string containing the details of the task, including title, description, and due date.').nonempty(),
  grade: z.string().describe('The grade of the students.').nonempty(),
  studentIds: z.array(z.string()).optional().describe('List of student IDs to assign the task to'),
  assignmentTitle: z.string().describe('The title of the assignment').nonempty(),
  teacherId: z.string().describe('The Id of the teacher that created the assignment').nonempty(),
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
      classId: z.string().describe('The ID of the class to assign the task to.').optional(),
      taskDetails: z.string().describe('A JSON string containing the details of the task, including title, description, and due date.').nonempty(),
      context: z.string().describe('The context for assigning the task.'),
      studentIds: z.array(z.string()).optional().describe('List of student IDs to assign the task to'),
      assignmentTitle: z.string().describe('The title of the assignment').nonempty(),
      teacherId: z.string().describe('The Id of the teacher that created the assignment').nonempty(),
    }),
 },
  output: {
    schema: z.object({
      success: z.boolean().describe('Whether the task was successfully assigned or not.'),
      message: z.string().describe('A message indicating the status of the assignment.'),
    }),
  },
  prompt: `You are an AI assistant designed to assign tasks to students.
  You will be given the class ID, the title of the assignment, and the task details.
  You will assign the task to the students in the class or in the list of studentIds.
  If studentIds are provided, only assign the task to the provided studentIds. The name of the teacher that assigned the task is also provided.

  <CODE_BLOCK>
    studentIds: {{{studentIds}}}
    Context:
    {{{context}}}.
  </CODE_BLOCK>

  Task Details: <CODE_BLOCK> {{{taskDetails}}} </CODE_BLOCK>

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
  let context = '';
  switch (input.grade) {
    case 'grade-8':
      context = `Grade 8 Subjects:
      - Mathematics: Algebra, Geometry, Data Handling
      - Science: Physics (Forces, Motion), Chemistry (Elements, Compounds), Biology (Cells, Systems)
      - English: Literature, Grammar
      - History: Modern World History`;
      break;
    case 'grade-6':
      context = `Grade 6 Subjects:
      - Mathematics: Fractions, Decimals, Ratios
      - Science: Simple Machines, Living Things
      - English: Reading Comprehension, Creative Writing
      - Geography: Continents and Oceans`;
      break;
    case 'grade-4':
      context = `Grade 4 Subjects:
      - Mathematics: Addition, Subtraction, Introduction to Multiplication
      - Science: Animals, Plants, Environment
      - English: Vocabulary Building, Sentence Formation
      - Social Studies: Communities and Citizenship`;
      break;
    default:
      context = `The student is in an unspecified grade, please provide answer based on the best information you know.`;
      break;
  }
  const output = await prompt({...input, context});
  return {
    success: true,
    message: `Task "${input.assignmentTitle}" successfully assigned to ${input.studentIds ? `students with IDs ${input.studentIds.join(', ')}` : `class ${input.classId}`}.`
  };
});




