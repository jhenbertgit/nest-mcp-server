import { z } from 'zod';

export const FileReaderInputSchema = z.object({
  path: z.string().min(1, {
    message: 'Path is required and cannot be empty',
  }),
});

export const FileReaderJsonSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'The absolute path to the file to read',
    },
  },
  required: ['path'],
} as const;

export type FileReaderInput = z.infer<typeof FileReaderInputSchema>;
