import { registerLocaleData } from '@angular/common';
import localeRuBy from '@angular/common/locales/ru-BY';

/** Region: Belarus. UI language: Russian. Currency: Belarusian ruble. */
export const APP_LOCALE = 'ru-BY';
export const APP_CURRENCY = 'BYN';
export const APP_TIMEZONE = 'Europe/Minsk'; // UTC+3, no DST

registerLocaleData(localeRuBy);
