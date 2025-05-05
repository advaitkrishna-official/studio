
'use server';
/**
 * @fileOverview AI Tutor Flow
 *
 * - aiTutor - Handles responses for the AI Tutor chat.
 * - AiTutorInput - Input type for the aiTutor function.
 * - AiTutorOutput - Return type for the aiTutor function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const AiTutorInputSchema = z.object({
  prompt: z.string().describe('The user\'s question or message to the AI Tutor.'),
  // Optional: Add grade or subject context if needed later
  // grade: z.string().optional().describe('The student\'s grade level.'),
  // subject: z.string().optional().describe('The current subject context.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI Tutor\'s response to the user\'s prompt.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function aiTutor(input: AiTutorInput): Promise<AiTutorOutput> {
  return aiTutorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTutorPrompt',
  input: {
    schema: AiTutorInputSchema,
  },
  output: {
    schema: AiTutorOutputSchema,
  },
  prompt: `You are a helpful and friendly AI Tutor designed to assist students with their studies.
Answer the student's questions clearly and concisely. If you don't know the answer, say so politely.
Avoid making up information. Keep your responses relevant to educational topics.

Student Prompt: {{{prompt}}}

Your Response:
`,
});

const aiTutorFlow = ai.defineFlow<
  typeof AiTutorInputSchema,
  typeof AiTutorOutputSchema
>(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        // Handle cases where the model might return nothing
        return { response: "I'm sorry, I couldn't generate a response for that. Could you please rephrase your question?" };
    }
    return output;
  }
);
