import { Pipe, type PipeTransform } from '@angular/core';
import { formatPhone } from '../utils/phone';

/** '41999999999' → '(41) 99999-9999'; '4133334444' → '(41) 3333-4444'; null → ''. */
@Pipe({ name: 'phoneFormat' })
export class PhoneFormatPipe implements PipeTransform {
  transform(digits: string | null): string {
    return formatPhone(digits);
  }
}
