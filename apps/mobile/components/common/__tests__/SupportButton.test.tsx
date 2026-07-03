/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import SupportButton from '../SupportButton';
import { createSupportDialogPalette } from '../supportDialogPalette';

jest.mock('react-native', () => require('react-native-web'));

type RenderState = {
  container: HTMLDivElement;
  root: Root;
};

function renderSupportButton(): RenderState {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <SupportButton
        supportEmail='support@alternun.co'
        palette={createSupportDialogPalette(true)}
      />
    );
  });

  return { container, root };
}

function openSupportModal(container: HTMLElement): void {
  const trigger = container.querySelector<HTMLElement>('[aria-label="Open support"]');
  if (!trigger) {
    throw new Error('Support trigger was not rendered');
  }

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

describe('SupportButton', () => {
  let renderState: RenderState | null = null;

  beforeEach(() => {
    renderState = null;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (renderState) {
      act(() => {
        renderState.root.unmount();
      });
    }
    renderState?.container.remove();
  });

  it('uses the themed support dialog surface when opened', () => {
    renderState = renderSupportButton();
    openSupportModal(renderState.container);

    const dialog = document.body.querySelector<HTMLElement>('[data-testid="support-dialog"]');
    if (!dialog) {
      throw new Error('Support dialog was not rendered');
    }

    expect(dialog.textContent).toContain('How can we help?');
    expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(13, 13, 31)');
  });
});
