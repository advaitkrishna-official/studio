// src/ai/flows/personalize-learning-path.ts
'use server';

/**
 * @fileOverview AI flow to personalize the learning path for a student based on their performance.
 *
 * - personalizeLearningPath - A function that handles the learning path personalization.
 * - PersonalizeLearningPathInput - The input type for the personalizeLearningPath function.
 * - PersonalizeLearningPathOutput - The return type for the personalizeLearningPath function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const PersonalizeLearningPathInputSchema = z.object({
  studentId: z.string().describe('The ID of the student.'),
  performanceData: z.string().describe('JSON string of the student performance data, including topics and question types attempted, and accuracy.'),
  learningStyle: z.string().optional().describe('The student learning style (e.g., visual, auditory, kinesthetic).'),
});
export type PersonalizeLearningPathInput = z.infer<typeof PersonalizeLearningPathInputSchema>;

const RecommendedTopicSchema = z.object({
  topic: z.string().describe('The topic to focus on.'),
  reason: z.string().describe('The reason for recommending this topic based on performance data.'),
});

const RecommendedQuestionTypeSchema = z.object({
  questionType: z.string().describe('The question type to focus on (e.g., flashcards, MCQ, long answer).'),
  reason: z.string().describe('The reason for recommending this question type based on performance data.'),
});

const PersonalizeLearningPathOutputSchema = z.object({
  recommendedTopics: z.array(RecommendedTopicSchema).describe('Array of recommended topics for the student to focus on.'),
  recommendedQuestionTypes: z.array(RecommendedQuestionTypeSchema).describe('Array of recommended question types for the student to focus on.'),
  summary: z.string().describe('A summary of the student performance and the recommendations.'),
});
export type PersonalizeLearningPathOutput = z.infer<typeof PersonalizeLearningPathOutputSchema>;

export async function personalizeLearningPath(input: PersonalizeLearningPathInput): Promise<PersonalizeLearningPathOutput> {
  return personalizeLearningPathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizeLearningPathPrompt',
  input: {
    schema: z.object({
      studentId: z.string().describe('The ID of the student.'),
      performanceData: z.string().describe('JSON string of the student performance data, including topics and question types attempted, and accuracy.'),
      learningStyle: z.string().optional().describe('The student learning style (e.g., visual, auditory, kinesthetic).'),
    }),
  },
  output: {
    schema: z.object({
      recommendedTopics: z.array(RecommendedTopicSchema).describe('Array of recommended topics for the student to focus on.'),
      recommendedQuestionTypes: z.array(RecommendedQuestionTypeSchema).describe('Array of recommended question types for the student to focus on.'),
      summary: z.string().describe('A summary of the student performance and the recommendations.'),
    }),
  },
  prompt: `You are an AI tutor specializing in creating personalized learning paths for students.

You will analyze the student's performance data and recommend topics and question types for them to focus on.

Consider the student's learning style, if available, when making recommendations.

Student ID: {{{studentId}}}
Performance Data: {{{performanceData}}}
Learning Style: {{{learningStyle}}}

Based on this information, provide:

1.  A list of recommended topics, with reasons for each recommendation.
2.  A list of recommended question types, with reasons for each recommendation.
3.  A summary of the student's performance and your recommendations.

Format the performance data using JSON.
`,
});

const personalizeLearningPathFlow = ai.defineFlow<
  typeof PersonalizeLearningPathInputSchema,
  typeof PersonalizeLearningPathOutputSchema
>(
  {
    name: 'personalizeLearningPathFlow',
    inputSchema: PersonalizeLearningPathInputSchema,
    outputSchema: PersonalizeLearningPathOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
