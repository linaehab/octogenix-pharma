import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BrandsPage } from './brands-page';

describe('BrandsPage', () => {
  let component: BrandsPage;
  let fixture: ComponentFixture<BrandsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
