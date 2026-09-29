import { type Observable, delay, of, throwError } from 'rxjs';

/** Simulated network latency for mock APIs, in ms. */
export const MOCK_LATENCY_MS = 300;

/** Wraps mock data in an Observable that behaves like an HTTP response. */
export function mockResponse<T>(data: T, latencyMs = MOCK_LATENCY_MS): Observable<T> {
  return of(structuredClone(data)).pipe(delay(latencyMs));
}

/** Emits an error after the simulated latency, for exercising error states. */
export function mockError(message: string, latencyMs = MOCK_LATENCY_MS): Observable<never> {
  return throwError(() => new Error(message)).pipe(delay(latencyMs));
}
