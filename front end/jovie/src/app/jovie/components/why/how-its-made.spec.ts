import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { HowItsMade, STEP_INTERVAL_MS } from './how-its-made';

describe('HowItsMade', () => {
  const render = () => {
    const language = TestBed.inject(LanguageService);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(HowItsMade);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    const element = fixture.nativeElement as HTMLElement;
    const active = () => Array.from(element.querySelectorAll('.slide')).findIndex((s) => s.classList.contains('is-active'));
    return { fixture, language, element, active };
  };

  afterEach(() => jasmine.clock().uninstall());

  it('shows the six official steps, starting with Farming', () => {
    const { element, active } = render();

    expect(element.querySelectorAll('.slide').length).toBe(6);
    expect(element.querySelector('.slide h4')?.textContent).toBe('Farming');
    expect(element.querySelector('.step')?.textContent).toBe('Step 1');
    expect(active()).toBe(0);
  });

  it('moves with Next / Previous and the dots, wrapping around', () => {
    const { fixture, element, active } = render();
    const [previous, next] = Array.from(element.querySelectorAll<HTMLButtonElement>('.arrow'));

    next.click();
    fixture.detectChanges();
    expect(active()).toBe(1);

    previous.click();
    previous.click();
    fixture.detectChanges();
    expect(active()).toBe(5);

    element.querySelectorAll<HTMLButtonElement>('.dot')[3].click();
    fixture.detectChanges();
    expect(active()).toBe(3);
    expect(element.querySelectorAll('.dot')[3].getAttribute('aria-current')).toBe('step');
  });

  it('moves on by itself, and pauses while hovered', () => {
    jasmine.clock().install();
    const { fixture, element, active } = render();

    jasmine.clock().tick(STEP_INTERVAL_MS + 10);
    fixture.detectChanges();
    expect(active()).toBe(1);

    element.dispatchEvent(new MouseEvent('mouseenter'));
    jasmine.clock().tick(STEP_INTERVAL_MS * 2);
    fixture.detectChanges();
    expect(active()).toBe(1);

    element.dispatchEvent(new MouseEvent('mouseleave'));
    jasmine.clock().tick(STEP_INTERVAL_MS + 10);
    fixture.detectChanges();
    expect(active()).toBe(2);
  });

  it('shows the official Arabic steps in ascending order', () => {
    const { fixture, language, element } = render();

    language.setLanguage('ar');
    fixture.detectChanges();
    expect(element.querySelector('.slide h4')?.textContent).toBe('الزراعة');
    expect(element.querySelector('.step')?.textContent).toBe('خطوة 1');
  });
});
