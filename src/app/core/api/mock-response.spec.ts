import { firstValueFrom } from 'rxjs';
import { mockError, mockResponse } from './mock-response';

describe('mockResponse', () => {
  it('emits a deep copy of the data', async () => {
    const data = { items: [1, 2] };
    const result = await firstValueFrom(mockResponse(data, 0));
    expect(result).toEqual(data);
    expect(result).not.toBe(data);
  });

  it('mockError emits an error with the given message', async () => {
    await expect(firstValueFrom(mockError('boom', 0))).rejects.toThrow('boom');
  });
});
