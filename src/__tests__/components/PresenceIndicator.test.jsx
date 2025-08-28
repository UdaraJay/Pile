import { render, screen, fireEvent } from '@testing-library/react';
import PresenceIndicator from '../../renderer/components/PresenceIndicator';

// Mock framer-motion to avoid issues with animations in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

describe('PresenceIndicator', () => {
  const mockActiveUsers = [
    { userId: 'user1', onlineAt: '2024-01-01T00:00:00Z', pileId: 'pile1' },
    { userId: 'user2', onlineAt: '2024-01-01T00:01:00Z', pileId: 'pile1' },
    { userId: 'user3', onlineAt: '2024-01-01T00:02:00Z', pileId: 'pile1' },
  ];

  beforeEach(() => {
    // Mock window.currentUserId to filter out current user
    window.currentUserId = 'current-user';
  });

  afterEach(() => {
    delete window.currentUserId;
  });

  test('should render nothing when not connected', () => {
    const { container } = render(
      <PresenceIndicator 
        activeUsers={mockActiveUsers}
        isConnected={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('should render nothing when no other users are active', () => {
    const { container } = render(
      <PresenceIndicator 
        activeUsers={[]}
        isConnected={true}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('should render presence indicator when connected with active users', () => {
    render(
      <PresenceIndicator 
        activeUsers={mockActiveUsers}
        isConnected={true}
      />
    );

    // Should show status dot
    expect(document.querySelector('.statusDot')).toBeInTheDocument();
    
    // Should show user avatars
    expect(document.querySelectorAll('.userAvatar')).toHaveLength(3);
  });

  test('should limit visible users and show overflow count', () => {
    const manyUsers = Array.from({ length: 8 }, (_, i) => ({
      userId: `user${i}`,
      onlineAt: '2024-01-01T00:00:00Z',
      pileId: 'pile1'
    }));

    render(
      <PresenceIndicator 
        activeUsers={manyUsers}
        isConnected={true}
        maxVisible={5}
      />
    );

    // Should show 5 regular avatars + 1 overflow avatar
    const userAvatars = document.querySelectorAll('.userAvatar');
    expect(userAvatars).toHaveLength(6);
    
    // Check overflow indicator
    const overflowAvatar = document.querySelector('.userAvatar.overflow');
    expect(overflowAvatar).toBeInTheDocument();
    expect(overflowAvatar.textContent).toBe('+3');
  });

  test('should apply correct size class', () => {
    render(
      <PresenceIndicator 
        activeUsers={mockActiveUsers}
        isConnected={true}
        size="large"
      />
    );

    expect(document.querySelector('.presenceIndicator.large')).toBeInTheDocument();
  });

  test('should show tooltip on hover', () => {
    render(
      <PresenceIndicator 
        activeUsers={mockActiveUsers}
        isConnected={true}
        showUsernames={true}
      />
    );

    const tooltip = document.querySelector('.tooltip');
    expect(tooltip).toBeInTheDocument();
    
    // Tooltip should contain user count
    expect(tooltip).toHaveTextContent('3 users online');
    
    // Should show user IDs in tooltip
    expect(tooltip).toHaveTextContent('user1');
    expect(tooltip).toHaveTextContent('user2');
    expect(tooltip).toHaveTextContent('user3');
  });

  test('should generate consistent user colors', () => {
    render(
      <PresenceIndicator 
        activeUsers={[{ userId: 'testuser', onlineAt: '2024-01-01T00:00:00Z', pileId: 'pile1' }]}
        isConnected={true}
      />
    );

    const userAvatar = document.querySelector('.userAvatar');
    expect(userAvatar).toHaveStyle('background-color: rgb(77, 183, 209)'); // Expected color for 'testuser'
  });

  test('should display user initials correctly', () => {
    render(
      <PresenceIndicator 
        activeUsers={[
          { userId: 'john-doe-123', onlineAt: '2024-01-01T00:00:00Z', pileId: 'pile1' },
          { userId: 'a', onlineAt: '2024-01-01T00:01:00Z', pileId: 'pile1' }
        ]}
        isConnected={true}
      />
    );

    const avatars = document.querySelectorAll('.userInitials');
    expect(avatars[0]).toHaveTextContent('JO'); // First 2 chars of 'john-doe-123'
    expect(avatars[1]).toHaveTextContent('A'); // Single char, will be uppercase
  });

  test('should filter out current user', () => {
    window.currentUserId = 'user2';
    
    render(
      <PresenceIndicator 
        activeUsers={mockActiveUsers}
        isConnected={true}
      />
    );

    // Should show 2 users (user1 and user3), filtering out user2
    expect(document.querySelectorAll('.userAvatar')).toHaveLength(2);
  });

  test('should handle tooltip with many users correctly', () => {
    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      userId: `user${i}`,
      onlineAt: '2024-01-01T00:00:00Z',
      pileId: 'pile1'
    }));

    render(
      <PresenceIndicator 
        activeUsers={manyUsers}
        isConnected={true}
        showUsernames={true}
      />
    );

    const tooltip = document.querySelector('.tooltip');
    expect(tooltip).toHaveTextContent('15 users online');
    expect(tooltip).toHaveTextContent('and 5 more...'); // Shows only first 10, indicates 5 more
  });

  test('should animate avatar appearance and disappearance', () => {
    const { rerender } = render(
      <PresenceIndicator 
        activeUsers={mockActiveUsers.slice(0, 1)}
        isConnected={true}
      />
    );

    expect(document.querySelectorAll('.userAvatar')).toHaveLength(1);

    // Add more users
    rerender(
      <PresenceIndicator 
        activeUsers={mockActiveUsers}
        isConnected={true}
      />
    );

    expect(document.querySelectorAll('.userAvatar')).toHaveLength(3);
  });
});