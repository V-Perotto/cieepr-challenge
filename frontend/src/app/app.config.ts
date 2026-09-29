import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
  type ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';
import { TUI_PORTUGUESE_LANGUAGE } from '@taiga-ui/i18n/languages/portuguese';
import { routes } from './app.routes';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideTaiga(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: TUI_LANGUAGE, useValue: signal(TUI_PORTUGUESE_LANGUAGE) },
  ],
};
