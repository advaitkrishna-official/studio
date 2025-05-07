
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
  performanceData: z.string().describe('A natural language description of the student performance, including topics/question types attempted, and perceived accuracy or difficulty.'), // Updated description
  learningStyle: z.string().optional().describe('The student learning style (e.g., visual, auditory, kinesthetic).'),
  grade: z.string().describe('The grade of the student.').nonempty(),
});
export type PersonalizeLearningPathInput = z.infer<typeof PersonalizeLearningPathInputSchema>;

const RecommendedTopicSchema = z.object({
  topic: z.string().describe('The topic to focus on.').nonempty(),
  reason: z.string().describe('The reason for recommending this topic based on performance data.').nonempty(),
});

const RecommendedQuestionTypeSchema = z.object({
  questionType: z.string().describe('The question type to focus on (e.g., flashcards, MCQ, long answer).').nonempty(),
  reason: z.string().describe('The reason for recommending this question type based on performance data.').nonempty(),
});

const PersonalizeLearningPathOutputSchema = z.object({
  recommendedTopics: z.array(RecommendedTopicSchema).describe('Array of recommended topics for the student to focus on.').nonempty(),
  recommendedQuestionTypes: z.array(RecommendedQuestionTypeSchema).describe('Array of recommended question types for the student to focus on.').nonempty(),
  summary: z.string().describe('A summary of the student performance and the recommendations.').nonempty(),
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
      performanceData: z.string().describe('A natural language description of the student performance, including topics/question types attempted, and perceived accuracy or difficulty.'), // Updated description
      learningStyle: z.string().optional().describe('The student learning style (e.g., visual, auditory, kinesthetic).'),
      context: z.string().describe('The context for giving recommendations for the student learning path (e.g., grade level and subjects).'), // Context description updated
    }),
  },
  output: {
    schema: PersonalizeLearningPathOutputSchema, // Use the main output schema here
  },
  prompt: `You are an AI tutor specializing in creating personalized learning paths for students.

Analyze the student's performance based on the provided description and recommend topics and question types for them to focus on.
Consider the student's grade level context and learning style (if available) when making recommendations.

<STUDENT_INFO>
  Student ID: {{{studentId}}}
  Grade Level Context: {{{context}}}
  Learning Style: {{{learningStyle}}}
</STUDENT_INFO>

<PERFORMANCE_DESCRIPTION>
{{{performanceData}}}
</PERFORMANCE_DESCRIPTION>

Based on this information, provide:

1.  A list of recommended topics, with clear reasons for each recommendation derived from the performance description.
2.  A list of recommended question types (e.g., flashcards, MCQ, long answer, practice exercises), with reasons linked to the student's described strengths or weaknesses.
3.  A concise summary of the student's described performance and your recommendations.

Format the output as a valid JSON object with the following keys: "recommendedTopics", "recommendedQuestionTypes", and "summary".
"recommendedTopics" should be an array of objects, each with "topic" and "reason" keys.
"recommendedQuestionTypes" should be an array of objects, each with "questionType" and "reason" keys.
"summary" should be a string.
Ensure the entire response is valid JSON.
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
      case 'Grade 8':
        context = `Grade 8 Subjects:
      - Mathematics: Algebra, Geometry, Data Handling
      - Science: Physics (Forces, Motion), Chemistry (Elements, Compounds), Biology (Cells, Systems)
      - English: Literature, Grammar
      - History: Modern World History
    `;
        break;
       case 'Grade 6':
        context = `Grade 6 Subjects:
      - Mathematics: Fractions, Decimals, Ratios
      - Science: Simple Machines, Living Things
      - English: Reading Comprehension, Creative Writing
      - Geography: Continents and Oceans
    `;
        break;
       case 'Grade 4':
        context =`Grade 4 Subjects:
      - Mathematics: Addition, Subtraction, Introduction to Multiplication
      - Science: Animals, Plants, Environment
      - English: Vocabulary Building, Sentence Formation
      - Social Studies: Communities and Citizenship
    `;
        break;
      default:
          context = `The student is in grade ${input.grade}. Please provide age-appropriate recommendations based on the described performance and topic context.`; // Handle other grades generically
        break;
    }
    const {output} = await prompt({
        studentId: input.studentId,
        performanceData: input.performanceData,
        learningStyle: input.learningStyle,
        context: context // Pass the generated context
    });

    if (!output || !output.recommendedTopics || output.recommendedTopics.length === 0) {
      throw new Error("AI failed to generate recommended topics.");
    }
    if (!output.recommendedQuestionTypes || output.recommendedQuestionTypes.length === 0) {
      throw new Error("AI failed to generate recommended question types.");
    }
    if (!output.summary) {
      throw new Error("AI failed to generate a summary.");
    }

    return output;
  }
);
