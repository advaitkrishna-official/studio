'use server';

/**
 * @fileOverview A lesson plan generator AI agent.
 *
 * - generateLessonPlan - A function that handles the lesson plan generation process.
 * - GenerateLessonPlanInput - The input type for the generateLessonPlan function.
 * - GenerateLessonPlanOutput - The return type for the generateLessonPlan function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateLessonPlanInputSchema = z.object({
  subject: z.string().describe('The subject of the lesson plan.'),
  gradeLevel: z.string().describe('The grade level of the lesson plan.'),
  learningObjectives: z.string().describe('The learning objectives of the lesson plan.'),
  topics: z.string().describe('The topics to be covered in the lesson plan.'),
  startDate: z.string().describe('The start date of the lesson plan.'),
  endDate: z.string().describe('The end date of the lesson plan.'),
  classId: z.string().describe('The ID of the class for the lesson plan.'),
  grade: z.string().describe('The grade of the student.').nonempty(),
});
export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

const LessonPlanItemSchema = z.object({
  week: z.number().describe('The week number of the lesson plan item.'),
  topic: z.string().describe('The topic of the lesson plan item.'),
  activities: z.string().describe('The activities of the lesson plan item.'),
  resources: z.array(z.string()).describe('The resources for the lesson plan item.'),
  assessment: z.string().describe('The assessment for the lesson plan item.'),
  teachingMethods: z.string().describe('The teaching methods for the lesson plan item.'),
  intendedOutcomes: z.string().describe('The intended outcomes for the lesson plan item.'),
  notes: z.string().optional().describe('The notes for the lesson plan item.'),
});

const GenerateLessonPlanOutputSchema = z.object({
  lessonTitle: z.string().describe('The title of the lesson plan.'),
  learningObjectives: z.array(z.string()).describe('The learning objectives of the lesson plan.'),
  teachingMethods: z.string().describe('The teaching methods of the lesson plan.'),
  intendedOutcomes: z.string().describe('The intended outcomes of the lesson plan.'),
  lessonPlan: z.array(LessonPlanItemSchema).describe('The lesson plan items.'),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;

export async function generateLessonPlan(input: GenerateLessonPlanInput): Promise<GenerateLessonPlanOutput> {
  return generateLessonPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonPlanPrompt',
  input: {
    schema: z.object({
      subject: z.string().describe('The subject of the lesson plan.'),
      gradeLevel: z.string().describe('The grade level of the lesson plan.'),
      learningObjectives: z.string().describe('The learning objectives of the lesson plan.'),
      topics: z.string().describe('The topics to be covered in the lesson plan.'),
      startDate: z.string().describe('The start date of the lesson plan.'),
      endDate: z.string().describe('The end date of the lesson plan.'),
      classId: z.string().describe('The ID of the class for the lesson plan.'),
      context: z.string().describe('The context for generating lesson plan questions.'),
    }),
  },
  output: {
    schema: z.object({
      lessonTitle: z.string().describe('The title of the lesson plan.'),
      learningObjectives: z.array(z.string()).describe('The learning objectives of the lesson plan.'),
      teachingMethods: z.string().describe('The teaching methods of the lesson plan.'),
      intendedOutcomes: z.string().describe('The intended outcomes of the lesson plan.'),
      lessonPlan: z.array(LessonPlanItemSchema).describe('The lesson plan items.'),
    }),
  },
  prompt: `You are an AI assistant designed to generate detailed lesson plans on a given topic.
  You should generate a structured, detailed, and editable lesson plan tailored to the teacher's input, such as subject, grade level, learning objectives, topics to be covered, and timeframe.
  This output should include a clear lesson title, defined learning objectives, and a timeline outlining topics, activities, and intended outcomes.
  The relevant course material is given as context.

  <CODE_BLOCK>
  Context:\n  {{{context}}}\n  </CODE_BLOCK>
  It should also suggest teaching methods—such as visual aids, group activities, or quizzes—based on the content and student needs.
  Recommend relevant resources, including PDFs, videos, flashcards, and AI-generated MCQs, all linked or embedded within the plan.
  Include an assessment section with scheduled checkpoints for quizzes or evaluations.
  The output MUST be valid JSON format, and the ENTIRE response should be enclosed within a valid JSON structure.

  Subject: <CODE_BLOCK>{{{subject}}}</CODE_BLOCK>
  Grade Level: <CODE_BLOCK>{{{gradeLevel}}}</CODE_BLOCK>
  Learning Objectives: <CODE_BLOCK>{{{learningObjectives}}}</CODE_BLOCK>
  Topics to be covered: <CODE_BLOCK>{{{topics}}}</CODE_BLOCK>
  Timeframe: From {{{startDate}}} to {{{endDate}}}
  Class: {{{classId}}}
  
  Format the output as a JSON object with "lessonTitle", "learningObjectives", "teachingMethods", "intendedOutcomes", and "lessonPlan" keys.
  "lessonPlan" should be an array of lesson plan items, each containing "week", "topic", "activities", "resources", "assessment", "teachingMethods", "intendedOutcomes", and "notes" keys.
  Ensure the output is a valid JSON string that can be parsed without errors.
  `,
});

const generateLessonPlanFlow = ai.defineFlow<
  typeof GenerateLessonPlanInputSchema,
  typeof GenerateLessonPlanOutputSchema
>({
  name: 'generateLessonPlanFlow',
  inputSchema: GenerateLessonPlanInputSchema,
  outputSchema: GenerateLessonPlanOutputSchema,
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
});
