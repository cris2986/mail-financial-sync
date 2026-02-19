import { beforeEach, describe, expect, it } from 'vitest';
import { consumeOAuthState, getGoogleImplicitAuthUrl } from './googleAuth';

const OAUTH_STATE_STORAGE_KEY = 'mail-financial-sync.oauth.state';

describe('googleAuth OAuth state', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    consumeOAuthState();
  });

  it('genera URL implícita con state y permite validarlo una sola vez', () => {
    const url = new URL(getGoogleImplicitAuthUrl());
    const state = url.searchParams.get('state');

    expect(state).toBeTruthy();
    expect(consumeOAuthState()).toBe(state);
    expect(consumeOAuthState()).toBeNull();
  });

  it('rechaza states expirados', () => {
    window.sessionStorage.setItem(
      OAUTH_STATE_STORAGE_KEY,
      JSON.stringify({
        value: 'old-state',
        createdAt: Date.now() - (11 * 60 * 1000)
      })
    );

    expect(consumeOAuthState()).toBeNull();
  });
});
