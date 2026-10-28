import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { IntroDialogService } from './intro-dialog.service';

describe('IntroDialogService', () => {
  const key = IntroDialogService.STORAGE_KEY;

  beforeEach(() => sessionStorage.removeItem(key));
  afterEach(() => sessionStorage.removeItem(key));

  it('shows the notice until it is dismissed, and remembers the dismissal in sessionStorage', () => {
    const service = TestBed.inject(IntroDialogService);
    expect(service.shouldShow()).toBe(true);

    service.dismiss();

    expect(service.shouldShow()).toBe(false);
    expect(sessionStorage.getItem(key)).toBe('1');
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('stays hidden for the rest of the session (a new service instance reads sessionStorage)', () => {
    sessionStorage.setItem(key, '1');
    expect(TestBed.inject(IntroDialogService).shouldShow()).toBe(false);
  });

  it('falls back to memory when storage is unavailable', () => {
    const throwingStorage = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { sessionStorage: throwingStorage } } }],
    });
    const service = TestBed.inject(IntroDialogService);

    expect(service.shouldShow()).toBe(true);
    expect(() => service.dismiss()).not.toThrow();
    expect(service.shouldShow()).toBe(false);
  });
});
