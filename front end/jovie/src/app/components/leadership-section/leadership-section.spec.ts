import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeadershipSection, initialsOf } from './leadership-section';

describe('LeadershipSection', () => {
  let component: LeadershipSection;
  let fixture: ComponentFixture<LeadershipSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadershipSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeadershipSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the bundled leaders until the dashboard list is loaded', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dr. Tarek Kandil');
    expect(text).toContain('TK');
  });

  it('derives initials like the current site, skipping honorifics', () => {
    expect(initialsOf('Dr. Tarek Kandil')).toBe('TK');
    expect(initialsOf('Mr. Metwally Kandil')).toBe('MK');
    expect(initialsOf('Dr. Soha El-Kholy')).toBe('SE');
    expect(initialsOf('Mona')).toBe('M');
    expect(initialsOf('')).toBe('');
  });
});
