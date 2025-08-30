/**
 * Renderer-side utilities for handling JSON responses from Gemini
 * Provides user feedback and error handling for structured AI responses
 */

/**
 * Handles Gemini JSON API calls with error feedback
 * @param {string} prompt - The prompt to send to Gemini
 * @param {'summary' | 'metadata'} template - The JSON template to use
 * @param {Function} onError - Callback for error notifications (optional)
 * @returns {Promise<Object>} Parsed JSON response with error handling
 */
export async function generateStructuredResponse(
  prompt,
  template = 'summary',
  onError = null,
  images = [],
) {
  try {
    const response = await window.electron.gemini.generateJson(
      prompt,
      template,
      images,
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
        timestamp: response.timestamp,
      };
    }
    // Handle API-level errors
    const errorMessage = `AI request failed: ${response.error}`;
    console.error(errorMessage);

    if (onError) {
      onError({
        type: 'api-error',
        message: errorMessage,
        details: response.error,
      });
    }

    // Return fallback data based on template
    return {
      success: false,
      data: getDefaultResponse(template),
      error: response.error,
    };
  } catch (error) {
    // Handle network/IPC errors
    const errorMessage = `Connection error: ${error.message}`;
    console.error(errorMessage, error);

    if (onError) {
      onError({
        type: 'network-error',
        message: errorMessage,
        details: error.message,
      });
    }

    return {
      success: false,
      data: getDefaultResponse(template),
      error: error.message,
    };
  }
}

/**
 * Gets default fallback response for a given template
 * @param {'summary' | 'metadata'} template - The template type
 * @returns {Object} Default response structure
 */
function getDefaultResponse(template) {
  const defaults = {
    summary: {
      title: 'Unable to generate summary',
      summary: 'AI response processing failed. Please try again.',
      keyThemes: ['error', 'retry-needed'],
      mood: 'neutral',
      confidence: 0,
    },
    metadata: {
      tags: ['error'],
      category: 'uncategorized',
      importance: 'low',
      actionItems: ['Retry the request'],
    },
  };

  return defaults[template] || defaults.summary;
}

/**
 * Creates a user-friendly error message based on error type
 * @param {Object} error - Error object with type and message
 * @returns {string} User-friendly error message
 */
export function formatErrorMessage(error) {
  switch (error.type) {
    case 'api-error':
      return 'AI service is currently unavailable. Please check your API key and try again.';
    case 'network-error':
      return 'Connection error. Please check your internet connection and try again.';
    case 'validation-error':
      return 'AI response format was invalid. The request will be retried automatically.';
    case 'parsing-error':
      return 'Unable to process AI response. Please try rephrasing your request.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Validates if response data is complete and usable
 * @param {Object} data - Response data to validate
 * @param {'summary' | 'metadata'} template - Expected template type
 * @returns {boolean} True if data is valid and complete
 */
export function validateResponseCompleteness(data, template) {
  if (!data || typeof data !== 'object') return false;

  if (template === 'summary') {
    return !!(
      data.title &&
      data.summary &&
      data.keyThemes &&
      data.keyThemes.length > 0 &&
      data.mood &&
      typeof data.confidence === 'number'
    );
  }
  if (template === 'metadata') {
    return !!(
      data.tags &&
      data.tags.length > 0 &&
      data.category &&
      data.importance &&
      Array.isArray(data.actionItems)
    );
  }

  return false;
}

/**
 * Generates toast notification configuration for JSON processing errors
 * @param {Object} error - Error details
 * @returns {Object} Toast configuration object
 */
export function createErrorToast(error) {
  return {
    id: `json-error-${Date.now()}`,
    type: 'warning',
    message: formatErrorMessage(error),
    dismissTime: 8000,
    details: error.details,
  };
}
