import { describe, expect, it } from 'vitest';
import { translateFor } from '../src/renderer/src/i18n/core';

describe('i18n', () => {
  it('returns English source for English', () => {
    expect(translateFor('en', 'Send')).toBe('Send');
  });

  it('translates Chinese', () => {
    expect(translateFor('zh-CN', 'Send')).toBe('发送');
  });

  it('falls back to the English catalog for unknown keys', () => {
    expect(translateFor('zh-CN', 'Unknown key')).toBe('Unknown key');
  });

  it('interpolates variables without touching untranslated placeholders', () => {
    expect(translateFor('zh-CN', 'Saved {time}', { time: '12:30' })).toBe('已保存 12:30');
    expect(translateFor('zh-CN', '{{baseUrl}}/path')).toBe('{{baseUrl}}/path');
  });
});
