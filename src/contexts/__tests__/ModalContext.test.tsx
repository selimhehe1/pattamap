/**
 * Tests for ModalContext
 * Covers: modal stack management, open/close, keyboard handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ModalProvider, useModal } from '../ModalContext';

// Mock component for testing
const MockModalComponent = ({ onClose, title }: { onClose?: () => void; title?: string }) => (
  <div data-testid="mock-modal">
    <h1>{title || 'Mock Modal'}</h1>
    <button onClick={onClose}>Close</button>
  </div>
);

describe('ModalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body classes
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  });

  afterEach(() => {
    // Clean up event listeners
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  });

  describe('ModalProvider', () => {
    it('should provide empty modals array initially', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      expect(result.current.modals).toEqual([]);
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      expect(typeof result.current.openModal).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
      expect(typeof result.current.closeAllModals).toBe('function');
      expect(typeof result.current.updateModalProps).toBe('function');
      expect(typeof result.current.isModalOpen).toBe('function');
      expect(typeof result.current.getTopModalId).toBe('function');
    });
  });

  describe('openModal', () => {
    it('should add modal to the stack', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      expect(result.current.modals.length).toBe(1);
      expect(result.current.modals[0].id).toBe('test-modal');
    });

    it('should add modal with props', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, { title: 'Test Title' });
      });

      expect(result.current.modals[0].props?.title).toBe('Test Title');
    });

    it('should add modal with custom options', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, {}, {
          closeOnEscape: false,
          size: 'large',
        });
      });

      expect(result.current.modals[0].options?.closeOnEscape).toBe(false);
      expect(result.current.modals[0].options?.size).toBe('large');
    });

    it('should stack multiple modals', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('modal-1', MockModalComponent);
        result.current.openModal('modal-2', MockModalComponent);
        result.current.openModal('modal-3', MockModalComponent);
      });

      expect(result.current.modals.length).toBe(3);
      expect(result.current.modals[0].id).toBe('modal-1');
      expect(result.current.modals[2].id).toBe('modal-3');
    });

    it('should replace existing modal with same id', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, { title: 'Original' });
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, { title: 'Updated' });
      });

      expect(result.current.modals.length).toBe(1);
      expect(result.current.modals[0].props?.title).toBe('Updated');
    });

    it('should add modal-open class to body', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      expect(document.body.classList.contains('modal-open')).toBe(true);
    });
  });

  describe('closeModal', () => {
    it('should remove modal from stack by id', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      expect(result.current.modals.length).toBe(1);

      act(() => {
        result.current.closeModal('test-modal');
      });

      expect(result.current.modals.length).toBe(0);
    });

    it('should remove correct modal from stack', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('modal-1', MockModalComponent);
        result.current.openModal('modal-2', MockModalComponent);
        result.current.openModal('modal-3', MockModalComponent);
      });

      act(() => {
        result.current.closeModal('modal-2');
      });

      expect(result.current.modals.length).toBe(2);
      expect(result.current.modals.map(m => m.id)).toEqual(['modal-1', 'modal-3']);
    });

    it('should do nothing if modal id not found', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      act(() => {
        result.current.closeModal('non-existent');
      });

      expect(result.current.modals.length).toBe(1);
    });

    it('should remove modal-open class when last modal closes', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      expect(document.body.classList.contains('modal-open')).toBe(true);

      act(() => {
        result.current.closeModal('test-modal');
      });

      expect(document.body.classList.contains('modal-open')).toBe(false);
    });
  });

  describe('closeAllModals', () => {
    it('should close all modals', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('modal-1', MockModalComponent);
        result.current.openModal('modal-2', MockModalComponent);
        result.current.openModal('modal-3', MockModalComponent);
      });

      expect(result.current.modals.length).toBe(3);

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.modals.length).toBe(0);
    });

    it('should do nothing if no modals open', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.modals.length).toBe(0);
    });
  });

  describe('updateModalProps', () => {
    it('should update props for existing modal', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, { title: 'Original' });
      });

      act(() => {
        result.current.updateModalProps('test-modal', { title: 'Updated' });
      });

      expect(result.current.modals[0].props?.title).toBe('Updated');
    });

    it('should merge props with existing props', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, {
          title: 'Title',
          subtitle: 'Subtitle',
        });
      });

      act(() => {
        result.current.updateModalProps('test-modal', { title: 'New Title' });
      });

      expect(result.current.modals[0].props?.title).toBe('New Title');
      expect(result.current.modals[0].props?.subtitle).toBe('Subtitle');
    });
  });

  describe('isModalOpen', () => {
    it('should return true if modal is open', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      expect(result.current.isModalOpen('test-modal')).toBe(true);
    });

    it('should return false if modal is not open', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      expect(result.current.isModalOpen('test-modal')).toBe(false);
    });

    it('should return false after modal is closed', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      act(() => {
        result.current.closeModal('test-modal');
      });

      expect(result.current.isModalOpen('test-modal')).toBe(false);
    });
  });

  describe('getTopModalId', () => {
    it('should return null when no modals are open', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      expect(result.current.getTopModalId()).toBe(null);
    });

    it('should return id of top modal', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('modal-1', MockModalComponent);
        result.current.openModal('modal-2', MockModalComponent);
        result.current.openModal('modal-3', MockModalComponent);
      });

      expect(result.current.getTopModalId()).toBe('modal-3');
    });

    it('should update when top modal is closed', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('modal-1', MockModalComponent);
        result.current.openModal('modal-2', MockModalComponent);
      });

      expect(result.current.getTopModalId()).toBe('modal-2');

      act(() => {
        result.current.closeModal('modal-2');
      });

      expect(result.current.getTopModalId()).toBe('modal-1');
    });
  });

  describe('useModal hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useModal());
      }).toThrow('useModal must be used within a ModalProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Escape key handling', () => {
    it('should close top modal on Escape key by default', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent);
      });

      expect(result.current.modals.length).toBe(1);

      // Simulate Escape key
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current.modals.length).toBe(0);
    });

    it('should not close modal if closeOnEscape is false', () => {
      const { result } = renderHook(() => useModal(), {
        wrapper: ModalProvider,
      });

      act(() => {
        result.current.openModal('test-modal', MockModalComponent, {}, { closeOnEscape: false });
      });

      // Simulate Escape key
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current.modals.length).toBe(1);
    });
  });
});
