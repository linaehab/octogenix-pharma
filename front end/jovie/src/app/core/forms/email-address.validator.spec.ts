import { FormControl } from '@angular/forms';
import { emailAddress } from './email-address.validator';

describe('emailAddress validator', () => {
  const check = (value: string) => emailAddress(new FormControl(value));

  it('accepts real-looking addresses', () => {
    for (const value of ['dema@gmail.com', 'mona.hassan@mail.octogenix.com.eg', 'mona+jovie@example.co', 'info@example.xn--wgbh1c', ' dema@gmail.com ']) {
      expect(check(value)).withContext(value).toBeNull();
    }
  });

  it('refuses addresses that can never receive an email', () => {
    for (const value of ['dema@gmail', 'a@b', 'dema@gmail.c', 'dema@gmail.com.', 'dema@gmail..com', 'dema@', '@gmail.com',
      'dema @gmail.com', 'de@ma@gmail.com', 'dema@gmail.123', '.dema@gmail.com', 'de..ma@gmail.com', 'dema@-gmail.com']) {
      expect(check(value)).withContext(value).toEqual({ email: true });
    }
  });

  it('leaves empty values to Validators.required', () => {
    expect(check('')).toBeNull();
  });
});
