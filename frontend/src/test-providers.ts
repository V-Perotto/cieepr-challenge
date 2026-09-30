import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, type EnvironmentProviders, type Provider, signal } from '@angular/core';
import { provideTaiga } from '@taiga-ui/core';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';
import { TUI_PORTUGUESE_LANGUAGE } from '@taiga-ui/i18n/languages/portuguese';

registerLocaleData(localePt);

/** Providers aplicados a todo TestBed (angular.json → test.options.providersFile). */
const testProviders: Array<Provider | EnvironmentProviders> = [
  provideTaiga(),
  { provide: LOCALE_ID, useValue: 'pt-BR' },
  { provide: TUI_LANGUAGE, useValue: signal(TUI_PORTUGUESE_LANGUAGE) },
];

export default testProviders;
