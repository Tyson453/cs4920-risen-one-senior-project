import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('authToken');

    // Do NOT attach auth for public auth-related endpoints
    const url = req.url;
    const isAuthPublicEndpoint =
      url.includes('/login') ||
      url.includes('/password-reset/request') ||
      url.includes('/password-reset/complete');

    if (token && !isAuthPublicEndpoint) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(req);
  }
}
