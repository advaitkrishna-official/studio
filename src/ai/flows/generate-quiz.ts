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
      questionType: QuestionTypeSchema.describe('The type of questions to generate.'),
    }),
  },
  output: {
    schema: GenerateQuizOutputSchema,
  },
  prompt: `You are an expert in generating quizzes for students.

  Generate {{numQuestions}} questions on the topic of {{{topic}}} with a difficulty of {{{difficulty}}}.
  The questions should be of type {{{questionType}}}.

  Each question should be appropriate for the given difficulty level, testing the student's knowledge of the topic.

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
  const {output} = await prompt(input);
  return output!;
});
