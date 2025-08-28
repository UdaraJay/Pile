import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AISpinner from '../renderer/pages/Pile/Editor/AISpinner';

describe('AISpinner Component', () => {
  it('does not render when not visible', () => {
    const { container } = render(<AISpinner isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders spinner with default message when visible', () => {
    render(<AISpinner isVisible />);
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(<AISpinner isVisible message="Custom thinking message" />);
    expect(screen.getByText('Custom thinking message')).toBeInTheDocument();
  });

  it('shows cancel button when canCancel is true', () => {
    const mockCancel = jest.fn();
    render(<AISpinner isVisible canCancel onCancel={mockCancel} />);

    const cancelButton = screen.getByText('✕ Cancel');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('shows error state with retry button', () => {
    const mockRetry = jest.fn();
    render(
      <AISpinner
        isVisible
        hasError
        message="Something went wrong"
        onRetry={mockRetry}
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    const retryButton = screen.getByText('↻ Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('shows both retry and cancel buttons in error state when both are enabled', () => {
    const mockRetry = jest.fn();
    const mockCancel = jest.fn();

    render(
      <AISpinner
        isVisible
        hasError
        message="Error occurred"
        canCancel
        onRetry={mockRetry}
        onCancel={mockCancel}
      />,
    );

    expect(screen.getByText('↻ Retry')).toBeInTheDocument();
    expect(screen.getByText('✕ Cancel')).toBeInTheDocument();
  });
});
