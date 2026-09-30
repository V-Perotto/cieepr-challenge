import { TestBed } from '@angular/core/testing';
import { TUI_NOTIFICATION_OPTIONS } from '@taiga-ui/core';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('posiciona todas as notificações (toasts) centralizadas no topo', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    const options = TestBed.inject(TUI_NOTIFICATION_OPTIONS);
    expect(options.block).toBe('start');
    expect(options.inline).toBe('center');
  });
});
