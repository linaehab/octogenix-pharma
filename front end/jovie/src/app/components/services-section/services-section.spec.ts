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

  it('should show the customer service group by default', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Contracting and Documentation');
    expect(content).toContain('Order Reception');
    expect(content).toContain('Customer Service');
  });

  it('should allow switching to the supplier service group', () => {
    (component as any).selectCategory('suppliers');
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Distribution');
    expect(content).toContain('Regulatory Affairs');
    expect(content).toContain('Scientific Office');
  });
});
