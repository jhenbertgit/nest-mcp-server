import { z } from 'zod';

export const FileSearchInputSchema = z.object({
  pattern: z.string().min(1, {
    message: 'Pattern is required and cannot be empty',
  }),
  directory: z.string().min(1, {
    message: 'Directory is required and cannot be empty',
  }),
  caseSensitive: z.boolean().optional().default(false),
  maxResults: z.number().optional().default(1000),
  recursive: z.boolean().optional().default(true),
});

export type FileSearchInput = z.infer<typeof FileSearchInputSchema>;
