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
  grade: z.string().describe('The grade of the student.').nonempty(),
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
      context: z.string().describe('The context for answering the question.'),
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
  Your task is to provide answers based on the context provided.
  The relevant course material is given as context.

  <CODE_BLOCK>
  Context:
  {{{context}}}
  </CODE_BLOCK>

  <CODE_BLOCK>
  Question: {{{question}}}
  Student's Answer: {{{studentAnswer}}}
  Key Points: {{{keyPoints}}}
  </CODE_BLOCK>
  
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
  let context: string = '';

  switch (input.grade) {
    case 'grade-8':
      context = `Grade 8 Subjects:
      - Mathematics: Algebra, Geometry, Data Handling
      - Science: Physics (Forces, Motion), Chemistry (Elements, Compounds), Biology (Cells, Systems)
      - English: Literature, Grammar
      - History: Modern World History
    `;
      break;
    case 'grade-6':
      context = `Grade 6 Subjects:
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
