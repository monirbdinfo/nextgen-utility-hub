import { describe, expect, it } from 'vitest';
import notices from '../public/THIRD-PARTY-NOTICES.txt?raw';
import pkgText from '../package.json?raw';

describe('third-party notices', () => {
  it('list every runtime dependency, with its licence text', () => {
    const { dependencies } = JSON.parse(pkgText) as { dependencies: Record<string, string> };
    for (const name of Object.keys(dependencies)) expect(notices, name).toContain(`\n${name} `);
    expect(notices).toContain('Apache License');
    expect(notices).toContain('Permission is hereby granted');
  });
});
