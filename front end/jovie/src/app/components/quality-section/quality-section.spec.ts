import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualitySection } from './quality-section';

describe('QualitySection', () => {
  let component: QualitySection;
  let fixture: ComponentFixture<QualitySection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QualitySection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(QualitySection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
