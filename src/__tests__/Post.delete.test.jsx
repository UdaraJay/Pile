import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePost } from '../renderer/hooks/usePost';
import Post from '../renderer/pages/Pile/Posts/Post';

// Mock the usePost hook
jest.mock('../renderer/hooks/usePost');

// Mock other dependencies
jest.mock('../renderer/context/PilesContext', () => ({
  usePilesContext: () => ({
    currentPile: { path: '/test/pile' },
    getCurrentPilePath: jest.fn(() => '/test/path'),
  }),
}));

jest.mock('../renderer/context/HighlightsContext', () => ({
  useHighlightsContext: () => ({
    highlights: new Map(),
  }),
}));

jest.mock('../renderer/context/AIContext', () => ({
  useAIContext: () => ({
    validKey: jest.fn().mockResolvedValue(true),
  }),
}));

// Mock DateTime
jest.mock('luxon', () => ({
  DateTime: {
    fromISO: () => ({
      toRelative: () => '2 minutes ago',
    }),
  },
}));

describe('Post Delete Functionality', () => {
  const mockDeletePost = jest.fn();
  const mockPost = {
    name: 'Test Post',
    content: '<p>Test content</p>',
    data: {
      createdAt: '2024-01-01T00:00:00.000Z',
      isAI: false,
      isReply: false,
      replies: [],
      attachments: [],
      highlight: null,
    },
  };

  beforeEach(() => {
    // Mock the usePost hook return value
    usePost.mockReturnValue({
      post: mockPost,
      deletePost: mockDeletePost,
      cycleColor: jest.fn(),
      refreshPost: jest.fn(),
      setHighlight: jest.fn(),
    });

    mockDeletePost.mockClear();
  });

  it('renders delete button when hovering over post', () => {
    render(<Post postPath="test-post.md" />);

    const postElement = screen.getByText('Test Post').closest('[tabindex="0"]');

    // Hover over the post
    fireEvent.mouseEnter(postElement);

    // Check if delete button appears
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByTitle('Delete this entry')).toBeInTheDocument();
  });

  it('shows confirmation state when delete button is clicked once', async () => {
    render(<Post postPath="test-post.md" />);

    const postElement = screen.getByText('Test Post').closest('[tabindex="0"]');
    fireEvent.mouseEnter(postElement);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Should show confirmation state
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(
        screen.getByTitle('Click again to confirm deletion'),
      ).toBeInTheDocument();
    });

    // Should not have called deletePost yet
    expect(mockDeletePost).not.toHaveBeenCalled();
  });

  it('calls deletePost when clicked twice (confirmation)', async () => {
    mockDeletePost.mockResolvedValue();
    render(<Post postPath="test-post.md" />);

    const postElement = screen.getByText('Test Post').closest('[tabindex="0"]');
    fireEvent.mouseEnter(postElement);

    const deleteButton = screen.getByText('Delete');

    // First click - should show confirmation
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    // Second click - should actually delete
    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeletePost).toHaveBeenCalledTimes(1);
    });
  });

  it('resets confirmation state after 3 seconds', async () => {
    jest.useFakeTimers();
    render(<Post postPath="test-post.md" />);

    const postElement = screen.getByText('Test Post').closest('[tabindex="0"]');
    fireEvent.mouseEnter(postElement);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Should show confirmation
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    // Fast-forward 3 seconds
    jest.advanceTimersByTime(3000);

    // Should reset to normal delete button
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
