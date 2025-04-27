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
  grade: z.string().describe('The grade of the student.').nonempty(),
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
      context: z.string().describe('The context for giving recommendations for the student learning path.'),
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

<CODE_BLOCK>
Student ID: {{{studentId}}}
</CODE_BLOCK>
<CODE_BLOCK>
Performance Data: {{{performanceData}}}
</CODE_BLOCK>
<CODE_BLOCK>Learning Style: {{{learningStyle}}}</CODE_BLOCK>

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
        context =`Grade 4 Subjects:
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
  }
);
