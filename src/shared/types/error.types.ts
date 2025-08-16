export interface ErrorEvent {
  type: 'error';
  message: string;
  code?: string;
  stack?: string;
}
