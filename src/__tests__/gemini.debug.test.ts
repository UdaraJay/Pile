import '@testing-library/jest-dom';
import { json, stream, initializeGemini } from '../main/ai/gemini';

// Temporarily disable mocking for debugging
// jest.mock('@google/generative-ai');

// Mock getKey to return our test key
jest.mock('../main/utils/store', () => ({
  getKey: jest
    .fn()
    .mockResolvedValue('AIzaSyAVxjuSr7YoFDINEwlMDNsCw1HpeHFHf88'),
}));

describe('Gemini AI Debug Tests (Real API)', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'AIzaSyAVxjuSr7YoFDINEwlMDNsCw1HpeHFHf88';
  });

  it('should initialize Gemini successfully with real API key', async () => {
    const initialized = await initializeGemini();
    expect(initialized).toBe(true);
  });

  it('should stream text chunks without getting stuck', async () => {
    const chunks: string[] = [];
    const startTime = Date.now();
    let chunkCount = 0;

    try {
      for await (const chunk of stream('Say hello in 5 words')) {
        chunks.push(chunk);
        chunkCount++;
        console.log(`Chunk ${chunkCount}: "${chunk}"`);

        // Safety timeout to prevent infinite hanging
        if (Date.now() - startTime > 30000) {
          console.log('Stream timeout after 30 seconds');
          break;
        }

        // Reasonable limit for chunks
        if (chunkCount > 100) {
          console.log('Too many chunks, stopping');
          break;
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      throw error;
    }

    const totalTime = Date.now() - startTime;
    const fullResponse = chunks.join('');

    console.log(`Stream completed in ${totalTime}ms with ${chunkCount} chunks`);
    console.log(`Full response: "${fullResponse}"`);

    expect(chunks.length).toBeGreaterThan(0);
    expect(fullResponse.length).toBeGreaterThan(0);
    expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
  }, 45000); // 45 second Jest timeout

  it('should generate JSON response without hanging', async () => {
    const startTime = Date.now();

    try {
      const data = await json('Analyze this text: Hello world, this is a test');
      const totalTime = Date.now() - startTime;

      console.log(`JSON generation completed in ${totalTime}ms`);
      console.log('Response data:', JSON.stringify(data, null, 2));

      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('keyThemes');
      expect(data).toHaveProperty('mood');
      expect(data).toHaveProperty('confidence');
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
    } catch (error) {
      console.error('JSON generation error:', error);
      throw error;
    }
  }, 45000); // 45 second Jest timeout
});
