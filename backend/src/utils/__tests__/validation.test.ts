import { validateEmail, validatePassword, validatePseudonym } from '../validation';

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
  });

  it('should reject email exceeding 255 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(validateEmail(longEmail)).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should accept valid password', () => {
    expect(validatePassword('MyP@ss1234')).toEqual({ valid: true });
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Ab1!xyz');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at least 8 characters');
  });

  it('should reject password longer than 128 characters', () => {
    const result = validatePassword('A1!' + 'a'.repeat(126));
    expect(result.valid).toBe(false);
    expect(result.message).toContain('max 128');
  });

  it('should reject password without lowercase', () => {
    const result = validatePassword('MYPASSWORD1!');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('lowercase');
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('mypassword1!');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('uppercase');
  });

  it('should reject password without number', () => {
    const result = validatePassword('MyPassword!');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('number');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('MyPassword1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('special character');
  });

  it('should accept password with exactly 8 characters', () => {
    expect(validatePassword('Aa1!bbbb')).toEqual({ valid: true });
  });
});

describe('validatePseudonym', () => {
  it('should accept valid pseudonym', () => {
    expect(validatePseudonym('JohnDoe')).toBe(true);
    expect(validatePseudonym('user_123')).toBe(true);
    expect(validatePseudonym('my-name')).toBe(true);
  });

  it('should reject pseudonym shorter than 3 characters', () => {
    expect(validatePseudonym('ab')).toBe(false);
  });

  it('should reject pseudonym longer than 50 characters', () => {
    expect(validatePseudonym('a'.repeat(51))).toBe(false);
  });

  it('should reject pseudonym with special characters', () => {
    expect(validatePseudonym('user@name')).toBe(false);
    expect(validatePseudonym('user name')).toBe(false);
    expect(validatePseudonym('user.name')).toBe(false);
  });
});
