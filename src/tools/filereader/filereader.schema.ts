import { z } from 'zod';

export const FileReaderInputSchema = z.object({
  path: z.string().min(1, {
    message: 'Path is required and cannot be empty',
  }),
});

export type FileReaderInput = z.infer<typeof FileReaderInputSchema>;
