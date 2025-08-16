export type McpToolEvent =
  |
      type: 'success';
      result: any;
    }
  | {
      type: 'error';
      message: string;
    }
  | {
      type: 'progress';
      message: string;
      percent?: number;
    }
  | {
      type: 'log';
      level: 'info' | 'warn' | 'error';
      message: string;
    };

// Separate type for server info (not a tool event)
export type McpServerInfoEvent = {
  type: 'serverInfo';
  version: string;
  server: string;
  capabilities: Record<string, any>;
  tools?: any[];
};

// Union for all possible outgoing events
export type McpOutgoingEvent = McpToolEvent | McpServerInfoEvent;
