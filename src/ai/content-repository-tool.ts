'use server';
/**
 * @fileOverview AI tool to summarise the content of a file.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

/**
 * Input schema for the summariseContent tool.
 */
const SummariseContentInputSchema = z.object({
  fileContent: z.string().describe('The content of the file to summarise.'),
});

/**
 * Output schema for the summariseContent tool.
 */
const SummariseContentOutputSchema = z.string().describe('A summary of the file content.');

/**
 * Defines an AI tool to summarise the content of a file.
 *
 * @returns {ai.Tool<typeof SummariseContentInputSchema, typeof SummariseContentOutputSchema>} The defined AI tool.
 */
export const summariseContent = ai.defineTool(
  {
    name: 'summariseContent',
    description: 'Summarises the content of a file.',
    inputSchema: SummariseContentInputSchema,
    outputSchema: SummariseContentOutputSchema,
  },
  async input => {
    // This can call any typescript function.
    // Summarise the stock price...
    return summariseContentFlow(input);
  }
);

const summariseContentPrompt = ai.definePrompt({
  name: 'summariseContentPrompt',
  input: {
    schema: z.object({
      fileContent: z.string().describe('The content of the file to summarise.'),
    }),
  },
  output: {
    schema: z.string().describe('A summary of the file content.'),
  },
  prompt: `You are an expert at summarising file content.

Summarise the following file content:
{{{fileContent}}}`,
});

const summariseContentFlow = ai.defineFlow<
  typeof SummariseContentInputSchema,
  typeof SummariseContentOutputSchema
>(
  {
    name: 'summariseContentFlow',
    inputSchema: SummariseContentInputSchema,
    outputSchema: SummariseContentOutputSchema,
  },
  async input => {
    const {output} = await summariseContentPrompt(input);
    return output!;
  }
);

