// tests/utils/zod-comments.test.ts

import { describe, it, expect } from 'vitest';
import { buildZodComment } from '../../src/utils/zod-comments';

describe('buildZodComment', () => {
  it('returns undefined for empty validation', () => {
    expect(buildZodComment()).toBeUndefined();
    expect(buildZodComment({})).toBeUndefined();
  });

  it('generates string validations', () => {
    expect(
      buildZodComment({
        minLength: 2,
        maxLength: 100
      })
    ).toBe('/// @zod.min(2).max(100)');
  });

  it('generates email validation', () => {
    expect(
      buildZodComment({
        email: true
      })
    ).toBe('/// @zod.email()');
  });

  it('generates url validation', () => {
    expect(
      buildZodComment({
        url: true
      })
    ).toBe('/// @zod.url()');
  });

  it('generates pattern validation', () => {
    expect(
      buildZodComment({
        pattern: '^[A-Z]+$'
      })
    ).toBe('/// @zod.regex(/^[A-Z]+$/)');
  });

  it('escapes backslashes in patterns', () => {
    expect(
      buildZodComment({
        pattern: '\\d+'
      })
    ).toBe('/// @zod.regex(/\\d+/)');
  });

  it('generates number validations', () => {
    expect(
      buildZodComment({
        min: 0,
        max: 100,
        int: true
      })
    ).toBe('/// @zod.min(0).max(100).int()');
  });

  it('generates positive validation', () => {
    expect(
      buildZodComment({
        positive: true
      })
    ).toBe('/// @zod.positive()');
  });

  it('generates uuid validation', () => {
    expect(
      buildZodComment({
        uuid: true
      })
    ).toBe('/// @zod.uuid()');
  });

  it('combines multiple validations', () => {
    expect(
      buildZodComment({
        minLength: 5,
        maxLength: 50,
        email: true
      })
    ).toBe('/// @zod.email().min(5).max(50)');  // FIXED: Type validators come first
  });

  it('handles custom validation', () => {
    expect(
      buildZodComment({
        custom: 'custom("my-validator")'
      })
    ).toBe('/// @zod.custom("my-validator")');
  });

  it('handles array validations', () => {
    expect(
      buildZodComment({
        minItems: 1,
        maxItems: 10
      })
    ).toBe('/// @zod.length(1).length(10)');
  });
});