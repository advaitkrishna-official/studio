'use server';

/**
 * @fileOverview AI flow to generate metadata and suggestions for content repository items.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ContentRepositoryInputSchema = z.object({
  fileName: z.string().describe('The name of the file.'),
  fileType: z.string().describe('The type of the file (e.g., PDF, DOCX, video).'),
  fileContent: z.string().describe('The content of the file, either text or a summary.'),
});
export type ContentRepositoryInput = z.infer<typeof ContentRepositoryInputSchema>;

const ContentRepositoryOutputSchema = z.object({
  subject: z.string().describe('Suggested subject of the content (e.g., Math, Science).'),
  gradeLevel: z.string().describe('Suggested grade level for the content.'),
  tags: z.array(z.string()).describe('Suggested tags for the content (e.g., Homework, Group Activity).'),
  description: z.string().describe('A brief description of the content.'),
  suggestions: z.array(z.string()).describe('AI-generated suggestions for the content.'),
});
export type ContentRepositoryOutput = z.infer<typeof ContentRepositoryOutputSchema>;

export async function generateContentRepositoryMetadata(
  input: ContentRepositoryInput
): Promise<ContentRepositoryOutput> {
  return contentRepositoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentRepositoryPrompt',
  input: {
    schema: z.object({
      fileName: z.string().describe('The name of the file.'),
      fileType: z.string().describe('The type of the file (e.g., PDF, DOCX, video).'),
      fileContent: z.string().describe('The content of the file, either text or a summary.'),
    }),
  },
  output: {
    schema: z.object({
      subject: z.string().describe('Suggested subject of the content (e.g., Math, Science).'),
      gradeLevel: z.string().describe('Suggested grade level for the content.'),
      tags: z.array(z.string()).describe('Suggested tags for the content (e.g., Homework, Group Activity).'),
      description: z.string().describe('A brief description of the content.'),
      suggestions: z.array(z.string()).describe('AI-generated suggestions for the content.'),
    }),
  },
  prompt: `You are an AI assistant designed to provide metadata and suggestions for files in a content repository.
  You will be given the file name, file type, and file content.
  You will provide the subject, grade level, tags, description, and suggestions for the file.

  File Name: {{{fileName}}}
  File Type: {{{fileType}}}
  File Content: {{{fileContent}}}

  Provide the output in JSON format.
  `,
});

const contentRepositoryFlow = ai.defineFlow<
  typeof ContentRepositoryInputSchema,
  typeof ContentRepositoryOutputSchema
>({
  name: 'contentRepositoryFlow',
  inputSchema: ContentRepositoryInputSchema,
  outputSchema: ContentRepositoryOutputSchema,
}, async input => {
  try {
    const {output} = await prompt(input);
    return output!;
  } catch (error: any) {
    console.error("Error generating content repository metadata:", error);
    if (error.message.includes('QuotaFailure')) {
      throw new Error('Quota limit reached. Please try again later.');
    }
    throw error; // Re-throw the error to be handled by the caller
  }
});
