import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeroSection } from './hero-section';

describe('HeroSection', () => {
  let component: HeroSection;
  let fixture: ComponentFixture<HeroSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroSection],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should move to a selected slide and auto-advance', fakeAsync(() => {
    (component as any).selectSlide(2);
    fixture.detectChanges();
    expect((component as any).activeIndex()).toBe(2);

    // Three bundled slides (0–2): advancing from the last one wraps to the first.
    tick(5000);
    fixture.detectChanges();
    expect((component as any).activeIndex()).toBe(0);
    discardPeriodicTasks();
  }));
});
