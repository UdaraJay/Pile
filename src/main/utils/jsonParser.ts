/**
 * Safe JSON parsing utilities with fallback mechanisms
 * Handles invalid JSON responses from AI models gracefully
 */

import type { SummaryResponse, MetadataResponse } from '../types/gemini';

/**
 * Default fallback values for different response types
 */
const DEFAULT_VALUES = {
  summary: {
    title: 'Unable to generate title',
    summary: 'Failed to parse AI response. Please try again.',
    keyThemes: ['parsing-error'],
    mood: 'neutral' as const,
    confidence: 0,
  } as SummaryResponse,

  metadata: {
    tags: ['parsing-error'],
    category: 'uncategorized',
    importance: 'low' as const,
    actionItems: [],
  } as MetadataResponse,
};

/**
 * Error types for JSON parsing failures
 */
export enum JSONParseError {
  INVALID_JSON = 'INVALID_JSON',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_FIELD_TYPE = 'INVALID_FIELD_TYPE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

export interface ParseResult<T> {
  success: boolean;
  data: T;
  error?: {
    type: JSONParseError;
    message: string;
    originalResponse?: string;
  };
}

/**
 * Validates summary response structure and types
 */
function validateSummaryResponse(data: any): data is SummaryResponse {
  try {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.title === 'string' &&
      typeof data.summary === 'string' &&
      Array.isArray(data.keyThemes) &&
      data.keyThemes.every((theme: any) => typeof theme === 'string') &&
      ['positive', 'negative', 'neutral', 'mixed'].includes(data.mood) &&
      typeof data.confidence === 'number' &&
      data.confidence >= 0 &&
      data.confidence <= 1
    );
  } catch {
    return false;
  }
}

/**
 * Validates metadata response structure and types
 */
function validateMetadataResponse(data: any): data is MetadataResponse {
  try {
    return (
      typeof data === 'object' &&
      data !== null &&
      Array.isArray(data.tags) &&
      data.tags.every((tag: any) => typeof tag === 'string') &&
      typeof data.category === 'string' &&
      ['low', 'medium', 'high'].includes(data.importance) &&
      Array.isArray(data.actionItems) &&
      data.actionItems.every((item: any) => typeof item === 'string')
    );
  } catch {
    return false;
  }
}

/**
 * Attempts to clean and fix common JSON formatting issues
 */
function cleanJsonString(jsonStr: string): string {
  // Remove any surrounding markdown code blocks
  const cleaned = jsonStr
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to find JSON object boundaries
  const startIndex = cleaned.indexOf('{');
  const lastIndex = cleaned.lastIndexOf('}');

  if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
    return cleaned.substring(startIndex, lastIndex + 1);
  }

  return cleaned;
}

/**
 * Safely parses JSON response for summary template
 */
export function parseSummaryResponse(
  response: string,
): ParseResult<SummaryResponse> {
  try {
    const cleanedResponse = cleanJsonString(response);
    const parsed = JSON.parse(cleanedResponse);

    if (validateSummaryResponse(parsed)) {
      // Apply length limits to prevent overflow
      const safeData: SummaryResponse = {
        title: parsed.title.substring(0, 100),
        summary: parsed.summary.substring(0, 500),
        keyThemes: parsed.keyThemes
          .slice(0, 12)
          .map((theme: string) => theme.substring(0, 120)),
        mood: parsed.mood,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
      };

      return {
        success: true,
        data: safeData,
      };
    }
    return {
      success: false,
      data: DEFAULT_VALUES.summary,
      error: {
        type: JSONParseError.VALIDATION_FAILED,
        message: 'Parsed JSON does not match required summary schema',
        originalResponse: response,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: DEFAULT_VALUES.summary,
      error: {
        type: JSONParseError.INVALID_JSON,
        message:
          error instanceof Error ? error.message : 'Unknown JSON parsing error',
        originalResponse: response,
      },
    };
  }
}

/**
 * Safely parses JSON response for metadata template
 */
export function parseMetadataResponse(
  response: string,
): ParseResult<MetadataResponse> {
  try {
    const cleanedResponse = cleanJsonString(response);
    const parsed = JSON.parse(cleanedResponse);

    if (validateMetadataResponse(parsed)) {
      // Apply length limits to prevent overflow
      const safeData: MetadataResponse = {
        tags: parsed.tags
          .slice(0, 10)
          .map((tag: string) => tag.substring(0, 30)),
        category: parsed.category.substring(0, 50),
        importance: parsed.importance,
        actionItems: parsed.actionItems
          .slice(0, 5)
          .map((item: string) => item.substring(0, 100)),
      };

      return {
        success: true,
        data: safeData,
      };
    }
    return {
      success: false,
      data: DEFAULT_VALUES.metadata,
      error: {
        type: JSONParseError.VALIDATION_FAILED,
        message: 'Parsed JSON does not match required metadata schema',
        originalResponse: response,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: DEFAULT_VALUES.metadata,
      error: {
        type: JSONParseError.INVALID_JSON,
        message:
          error instanceof Error ? error.message : 'Unknown JSON parsing error',
        originalResponse: response,
      },
    };
  }
}

/**
 * Generic safe JSON parser with template-specific validation
 */
export function safeParseJson<T extends 'summary' | 'metadata'>(
  response: string,
  template: T,
): ParseResult<T extends 'summary' ? SummaryResponse : MetadataResponse> {
  if (template === 'summary') {
    return parseSummaryResponse(response) as any;
  }
  return parseMetadataResponse(response) as any;
}
