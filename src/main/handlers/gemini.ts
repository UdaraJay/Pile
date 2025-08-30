import { ipcMain, BrowserWindow } from 'electron';
import { json, stream, JSON_TEMPLATES, testApiKey } from '../ai/gemini';
import { safeParseJson } from '../utils/jsonParser';
import type {
  GeminiResponse,
  GeminiStreamResponse,
  GeminiStreamEvent,
} from '../types/gemini';

/**
 * Validates that the sender is from a valid URL
 * @param event - The IPC event
 * @returns boolean indicating if sender is valid
 */
function validateSender(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const { senderFrame } = event;
    if (!senderFrame) return false;

    const frameUrl = new URL(senderFrame.url);

    // Allow file:// protocol (production)
    if (frameUrl.protocol === 'file:') {
      return true;
    }

    // Allow localhost in development mode
    if (frameUrl.protocol === 'http:' && frameUrl.hostname === 'localhost') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * IPC handler for Gemini JSON generation
 * Validates input and returns structured JSON response
 */
ipcMain.handle(
  'gemini:generate',
  async (event, prompt: string): Promise<GeminiResponse> => {
    try {
      // Validate sender frame URL
      if (!validateSender(event)) {
        throw new Error('Invalid sender: only file:// protocol allowed');
      }
      // Input validation
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: must be a non-empty string');
      }

      // Sanitize input - remove potential code injection attempts
      const sanitizedPrompt = prompt.replace(/[<>]/g, '').trim();

      if (sanitizedPrompt.length === 0) {
        throw new Error('Invalid prompt: cannot be empty after sanitization');
      }

      // Limit prompt length to prevent abuse
      if (sanitizedPrompt.length > 10000) {
        throw new Error('Prompt too long: maximum 10000 characters allowed');
      }

      // Call Gemini JSON function
      const response = await json(sanitizedPrompt);

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Gemini IPC handler error:', error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  },
);

/**
 * IPC handler for Gemini streaming generation
 * Streams chunks back to renderer via webContents.send
 */
ipcMain.handle(
  'gemini:stream',
  async (
    event,
    prompt: string,
    selectedModel?: string,
  ): Promise<GeminiStreamResponse> => {
    try {
      // Validate sender frame URL
      if (!validateSender(event)) {
        throw new Error('Invalid sender: only file:// protocol allowed');
      }

      // Test API key before proceeding
      const keyValid = await testApiKey();
      if (!keyValid) {
        throw new Error('Invalid or missing Gemini API key. Please check your API key in settings.');
      }

      // Input validation (same as generate)
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: must be a non-empty string');
      }

      const sanitizedPrompt = prompt.replace(/[<>]/g, '').trim();

      if (sanitizedPrompt.length === 0) {
        throw new Error('Invalid prompt: cannot be empty after sanitization');
      }

      if (sanitizedPrompt.length > 10000) {
        throw new Error('Prompt too long: maximum 10000 characters allowed');
      }

      // Get the sender window
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      if (!senderWindow) {
        throw new Error('Cannot identify sender window');
      }

      // Generate unique stream ID for this request
      const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Send stream start event
      event.sender.send('gemini:stream', {
        type: 'start',
        streamId,
        timestamp: new Date().toISOString(),
      });

      try {
        // Stream the response with the selected model
        console.log(
          'Starting Gemini stream with model:',
          selectedModel || 'default',
        );
        for await (const chunk of stream(sanitizedPrompt, selectedModel, images)) {
          event.sender.send('gemini:stream', {
            type: 'chunk',
            streamId,
            data: chunk,
            timestamp: new Date().toISOString(),
          });
        }

        // Send stream end event
        event.sender.send('gemini:stream', {
          type: 'end',
          streamId,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          streamId,
          timestamp: new Date().toISOString(),
        };
      } catch (streamError) {
        // Send stream error event
        event.sender.send('gemini:stream', {
          type: 'error',
          streamId,
          error:
            streamError instanceof Error
              ? streamError.message
              : 'Stream error occurred',
          timestamp: new Date().toISOString(),
        });

        throw streamError;
      }
    } catch (error) {
      console.error('Gemini streaming IPC handler error:', error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  },
);

/**
 * IPC handler for template-based structured JSON generation
 * Uses predefined JSON schemas for consistent responses
 */
ipcMain.handle(
  'gemini:generate-json',
  async (
    event,
    prompt: string,
    template: keyof typeof JSON_TEMPLATES = 'summary',
    images?: string[],
  ): Promise<GeminiResponse> => {
    try {
      // Validate sender frame URL
      if (!validateSender(event)) {
        throw new Error('Invalid sender: only file:// protocol allowed');
      }

      // Test API key before proceeding
      const keyValid = await testApiKey();
      if (!keyValid) {
        throw new Error('Invalid or missing Gemini API key. Please check your API key in settings.');
      }

      // Input validation
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: must be a non-empty string');
      }

      if (template && !JSON_TEMPLATES[template]) {
        throw new Error(
          `Invalid template: must be one of ${Object.keys(JSON_TEMPLATES).join(', ')}`,
        );
      }

      // Sanitize input
      const sanitizedPrompt = prompt.replace(/[<>]/g, '').trim();

      if (sanitizedPrompt.length === 0) {
        throw new Error('Invalid prompt: cannot be empty after sanitization');
      }

      // Limit prompt length
      if (sanitizedPrompt.length > 10000) {
        throw new Error('Prompt too long: maximum 10000 characters allowed');
      }

      // Generate structured JSON response (optionally with images for OCR)
      const response = await json(sanitizedPrompt, template, undefined, images);

      // The json() function already handles safe parsing internally
      // But we can check if it's using fallback values by validating completeness
      const hasWarnings =
        (template === 'summary' &&
          response.title === 'Unable to generate title') ||
        (template === 'metadata' && response.tags.includes('parsing-error'));

      const result: GeminiResponse = {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      };

      if (hasWarnings) {
        result.parseWarning = {
          message: 'AI response was partially invalid, using fallback values',
          fallbackUsed: true,
        };
      }

      return result;
    } catch (error) {
      console.error('Gemini JSON IPC handler error:', error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  },
);

/**
 * IPC handler for testing Gemini API key validity
 */
ipcMain.handle(
  'gemini:test-api-key',
  async (event: Electron.IpcMainInvokeEvent, apiKey?: string) => {
    if (!validateSender(event)) {
      console.error('Invalid sender for gemini:test-api-key');
      return { success: false, error: 'Invalid request source' };
    }

    try {
      const isValid = await testApiKey(apiKey);
      return {
        success: true,
        isValid,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Gemini API key test IPC handler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  },
);
