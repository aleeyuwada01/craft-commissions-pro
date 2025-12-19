/**
 * Unit tests for Access Control section in GlobalSettings
 * 
 * Tests:
 * - Toggle renders correctly
 * - Toggle state reflects hook state
 * - Toast appears on change
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks and dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { full_name: 'Test User' }, error: null }),
        }),
      }),
    }),
  },
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

// Mock usePrivateAccess hook
const mockSetPrivateAccess = vi.fn();
let mockIsPrivateAccessEnabled = false;
let mockIsLoading = false;

vi.mock('@/hooks/usePrivateAccess', () => ({
  usePrivateAccess: () => ({
    isPrivateAccessEnabled: mockIsPrivateAccessEnabled,
    isLoading: mockIsLoading,
    error: null,
    setPrivateAccess: mockSetPrivateAccess,
  }),
}));

// Import after mocks
import GlobalSettings from '@/pages/GlobalSettings';

const renderGlobalSettings = () => {
  return render(
    <BrowserRouter>
      <GlobalSettings />
    </BrowserRouter>
  );
};

describe('GlobalSettings - Access Control Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPrivateAccessEnabled = false;
    mockIsLoading = false;
    mockSetPrivateAccess.mockResolvedValue(undefined);
  });

  it('renders the Access Control section with Private Access toggle', async () => {
    renderGlobalSettings();
    
    await waitFor(() => {
      expect(screen.getByText('Access Control')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Private Access')).toBeInTheDocument();
    expect(screen.getByText(/When enabled, new user registrations are disabled/)).toBeInTheDocument();
    expect(screen.getByTestId('private-access-toggle')).toBeInTheDocument();
  });

  it('toggle reflects disabled state when isPrivateAccessEnabled is false', async () => {
    mockIsPrivateAccessEnabled = false;
    renderGlobalSettings();
    
    await waitFor(() => {
      const toggle = screen.getByTestId('private-access-toggle');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('data-state', 'unchecked');
    });
  });

  it('toggle reflects enabled state when isPrivateAccessEnabled is true', async () => {
    mockIsPrivateAccessEnabled = true;
    renderGlobalSettings();
    
    await waitFor(() => {
      const toggle = screen.getByTestId('private-access-toggle');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('data-state', 'checked');
    });
  });

  it('shows success toast when enabling private access', async () => {
    mockIsPrivateAccessEnabled = false;
    mockSetPrivateAccess.mockResolvedValue(undefined);
    
    renderGlobalSettings();
    
    await waitFor(() => {
      expect(screen.getByTestId('private-access-toggle')).toBeInTheDocument();
    });
    
    const toggle = screen.getByTestId('private-access-toggle');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(mockSetPrivateAccess).toHaveBeenCalledWith(true);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Private access enabled - new registrations are now disabled'
      );
    });
  });

  it('shows success toast when disabling private access', async () => {
    mockIsPrivateAccessEnabled = true;
    mockSetPrivateAccess.mockResolvedValue(undefined);
    
    renderGlobalSettings();
    
    await waitFor(() => {
      expect(screen.getByTestId('private-access-toggle')).toBeInTheDocument();
    });
    
    const toggle = screen.getByTestId('private-access-toggle');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(mockSetPrivateAccess).toHaveBeenCalledWith(false);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Private access disabled - new registrations are now allowed'
      );
    });
  });

  it('shows error toast when toggle update fails', async () => {
    mockSetPrivateAccess.mockRejectedValue(new Error('Database error'));
    
    renderGlobalSettings();
    
    await waitFor(() => {
      expect(screen.getByTestId('private-access-toggle')).toBeInTheDocument();
    });
    
    const toggle = screen.getByTestId('private-access-toggle');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to update private access setting');
    });
  });

  it('toggle is disabled while loading', async () => {
    mockIsLoading = true;
    
    renderGlobalSettings();
    
    await waitFor(() => {
      const toggle = screen.getByTestId('private-access-toggle');
      expect(toggle).toBeDisabled();
    });
  });
});
