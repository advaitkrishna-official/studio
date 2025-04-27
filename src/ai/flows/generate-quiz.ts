'use server';

/**
 * @fileOverview AI flow to generate a quiz with multiple choice questions,
 * true/false questions, fill in the blanks, short/long answer, matching, and code output (for programming).
 *
 * - generateQuiz - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const QuestionTypeSchema = z.enum([
  'MCQ',
  'True/False',
  'Fill in the Blanks',
  'Short Answer',
  'Long Answer',
  'Matching',
  'Code Output',
]);


const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic to generate the quiz for.'),
  numQuestions: z.number().describe('The number of questions to generate.'),
  difficulty: z.string().describe('The difficulty level of the quiz.'),
  questionType: QuestionTypeSchema.describe('The type of questions to generate.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The question.'),
      options: z.array(z.string()).optional().describe('The options for the question.'),
      correctAnswer: z.string().optional().describe('The correct answer to the question.'),
      questionType: QuestionTypeSchema.describe('The type of question.'),
    })
  ).describe('The generated quiz questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {
    schema: z.object({
      topic: z.string().describe('The topic to generate the quiz for.'),
      numQuestions: z.number().describe('The number of questions to generate.'),
      difficulty: z.string().describe('The difficulty level of the quiz.'),
      context: z.string().describe('The context for the quiz.'),
      questionType: QuestionTypeSchema.describe('The type of questions to generate.'),
    }),
  },
  output: {
    schema: GenerateQuizOutputSchema,
  },
  prompt: `You are an expert in generating quizzes for students.

  Generate {{numQuestions}} questions on the topic of <CODE_BLOCK>{{{topic}}}</CODE_BLOCK> with a difficulty of <CODE_BLOCK>{{{difficulty}}}</CODE_BLOCK>.
  The questions should be of type <CODE_BLOCK>{{{questionType}}}</CODE_BLOCK>.
  The context you have of the student's grade is:
  <CODE_BLOCK>
  Context:
  {{{context}}}
  </CODE_BLOCK>

  Each question should be appropriate for the given difficulty level and context, testing the student's knowledge of the topic.

  Format the output as a JSON array of questions. Each question object in the array should have the following keys:
  - question: The question.
  - options: An array of strings, representing the options for the question. Only include this field if the question type is MCQ.
  - correctAnswer: The correct answer to the question. This should be one of the strings in the options array. Only include this field if the question type is MCQ or True/False.
  - questionType: The type of question.
  `,
});

const generateQuizFlow = ai.defineFlow<
  typeof GenerateQuizInputSchema,
  typeof GenerateQuizOutputSchema
>({
  name: 'generateQuizFlow',
  inputSchema: GenerateQuizInputSchema,
  outputSchema: GenerateQuizOutputSchema,
}, async input => {
  let context: string = ``;

  switch (input.difficulty) {
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
    case 'grade-4':
      context =`Grade 4 Subjects:
      - Mathematics: Addition, Subtraction, Introduction to Multiplication
      - Science: Animals, Plants, Environment
      - English: Vocabulary Building, Sentence Formation
      - Social Studies: Communities and Citizenship
    `;
    default:
        context = `The student is in an unspecified grade, please provide answer based on the best information you know.`;
  }
  const {output} = await prompt({...input, context});
  return output!;
});
