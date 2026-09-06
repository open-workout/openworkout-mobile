jest.mock('../../storage', () => ({
  getLanguage: jest.fn(),
  setLanguage: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { getLanguage, setLanguage } from '../../storage';
import { useLanguage } from '../../hooks/useLanguage';
import i18n from '../../i18n';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getLanguage).mockResolvedValue(null);
  jest.mocked(setLanguage).mockResolvedValue(undefined);
  i18n.changeLanguage('en');
});

describe('useLanguage', () => {
  it('defaults to the current i18n language when nothing is persisted', async () => {
    const { result } = renderHook(() => useLanguage());
    await waitFor(() => expect(getLanguage).toHaveBeenCalled());
    expect(result.current.language).toBe('en');
  });

  it('reload() applies a persisted language override', async () => {
    jest.mocked(getLanguage).mockResolvedValue('fr');
    const { result } = renderHook(() => useLanguage());
    await waitFor(() => expect(result.current.language).toBe('fr'));
    expect(i18n.language).toBe('fr');
  });

  it('update() persists the new language and updates i18n', async () => {
    const { result } = renderHook(() => useLanguage());
    await waitFor(() => expect(getLanguage).toHaveBeenCalled());

    await act(async () => {
      await result.current.update('de');
    });

    expect(setLanguage).toHaveBeenCalledWith('de');
    expect(i18n.language).toBe('de');
    expect(result.current.language).toBe('de');
  });
});
