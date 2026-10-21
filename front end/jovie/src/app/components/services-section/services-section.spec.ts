import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesSection } from './services-section';

describe('ServicesSection', () => {
  let component: ServicesSection;
  let fixture: ComponentFixture<ServicesSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicesSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show only the confirmed service categories', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Pharmaceutical Distribution');
    expect(content).toContain('Pharmaceutical Import & Export');
    expect(content).toContain('Supplements');
    expect(content).not.toMatch(/3PL|Scientific Office|New Products Program/i);
  });
});
