import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { JovieOrderConfirmationPage } from './jovie-order-confirmation-page';

describe('JovieOrderConfirmationPage', () => {
  let http: HttpTestingController;

  const open = (orderNumber: string, query: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      imports: [JovieOrderConfirmationPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ orderNumber }), queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const location = TestBed.inject(Location);
    spyOn(location, 'path').and.returnValue(`/jovieEgypt/checkout/confirmation/${orderNumber}?token=${query['token'] ?? ''}`);
    const replace = spyOn(location, 'replaceState');
    const fixture = TestBed.createComponent(JovieOrderConfirmationPage);
    fixture.detectChanges();
    return { fixture, replace };
  };

  beforeEach(() => sessionStorage.clear());
  afterEach(() => http.verify());

  it("opens a guest's order from the email link's token and removes the token from the address bar", () => {
    const { replace } = open('JV-2001', { token: 'secret-token' });

    const request = http.expectOne((req) => req.url === '/api/v1/orders/JV-2001');
    expect(request.request.params.get('token')).toBe('secret-token');
    expect(replace).toHaveBeenCalledWith('/jovieEgypt/checkout/confirmation/JV-2001');
    request.flush({ data: null });
  });

  it('without a token (and not signed in) shows no order and asks the server nothing', () => {
    const { fixture, replace } = open('JV-2002');

    http.expectNone((req) => req.url.includes('/api/v1/orders/'));
    expect(replace).not.toHaveBeenCalled();
    expect(fixture.componentInstance['state']()).toBe('noAccess');
  });
});
