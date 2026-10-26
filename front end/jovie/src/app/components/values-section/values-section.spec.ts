import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValuesSection } from './values-section';

describe('ValuesSection', () => {
  let component: ValuesSection;
  let fixture: ComponentFixture<ValuesSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValuesSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValuesSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
