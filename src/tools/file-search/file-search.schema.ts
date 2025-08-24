import { z } from 'zod';

export const FileSearchInputSchema = z.object({
  pattern: z.string().min(1, {
    message: 'Pattern is required and cannot be empty',
  }),
  caseSensitive: z.boolean().optional().default(false),
  maxResults: z.number().optional().default(1000),
  recursive: z.boolean().optional().default(true),
});

export const FileSearchJsonSchema = {
  type: 'object',
  properties: {
    pattern: {
      type: 'string',
      description: 'The glob pattern to search for (e.g., src/**/*.ts)',
    },
    caseSensitive: {
      type: 'boolean',
      description: 'Whether the search should be case-sensitive',
      default: false,
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results to return',
      default: 1000,
    },
    recursive: {
      type: 'boolean',
      description: 'Whether to search recursively',
      default: true,
    },
  },
  required: ['pattern'],
} as const;

export type FileSearchInput = z.infer<typeof FileSearchInputSchema>;
