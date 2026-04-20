import { expect, test } from 'vitest';
import { getPluralForm } from './pluralize';

test('pluralizes correctly for ukrainian', () => {
    // 1
    expect(getPluralForm(1, 'день', 'дні', 'днів')).toBe('день');
    // 2-4
    expect(getPluralForm(2, 'день', 'дні', 'днів')).toBe('дні');
    expect(getPluralForm(3, 'день', 'дні', 'днів')).toBe('дні');
    // 5-9
    expect(getPluralForm(5, 'день', 'дні', 'днів')).toBe('днів');
    // 11-19
    expect(getPluralForm(11, 'день', 'дні', 'днів')).toBe('днів');
});