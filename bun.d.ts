/// <reference types="bun-types" />

declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  interface ExpectMatchers {
    toBe(expected: any): void;
    toBeDefined(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toEqual(expected: any): void;
    toStrictEqual(expected: any): void;
    toContain(item: any): void;
    toHaveProperty(prop: string): void;
    toStartWith(str: string): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toThrow(error?: string | Error | RegExp): void;
    rejects: {
      toThrow(error?: string | Error | RegExp): Promise<void>;
    };
  }

  export function expect(value: any): ExpectMatchers & {
    not: ExpectMatchers;
  };
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
}
