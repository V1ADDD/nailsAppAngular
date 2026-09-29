import { deserialize, serialize } from 'node:v8';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

// jsdom does not expose structuredClone; mirror Node's implementation.
globalThis.structuredClone ??= <T>(value: T): T => deserialize(serialize(value)) as T;
