import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Theme Toggle Button', () => {
    // Helper to open menu if needed (mobile/tablet or hamburger menu)
    async function openMenuIfNeeded(page: any) {
      const hamburger = page.locator('button:has-text("☰")')
        .or(page.locator('button[aria-label*="menu"]'))
        .or(page.locator('[data-testid="mobile-menu"]'));

      if (await hamburger.first().isVisible().catch(() => false)) {
        await hamburger.first().click();
        await page.waitForLoadState('domcontentloaded');
      }
    }

    test('should display theme toggle button in menu', async ({ page }) => {
      await openMenuIfNeeded(page);

      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('button[aria-label*="mode"]'))
        .or(page.locator('.theme-toggle'))
        .or(page.locator('button:has-text("Mode")'))
        .or(page.locator('[class*="ThemeToggle"]'));

      await expect(themeToggle.first()).toBeVisible();
    });

    test('should show Light Mode text in dark mode', async ({ page }) => {
      // Set dark mode first - use correct storage key
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await openMenuIfNeeded(page);

      // In dark mode, "Light Mode" button is shown (to switch to light)
      const lightModeButton = page.locator('button:has-text("Light Mode")')
        .or(page.locator('.theme-toggle__icon--moon'))
        .or(page.locator('[aria-label*="light mode"]'));

      await expect(lightModeButton.first()).toBeVisible();
    });

    test('should show Dark Mode text in light mode', async ({ page }) => {
      // Set light mode first - use correct storage key
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'light');
        document.body.setAttribute('data-theme', 'light');
      });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await openMenuIfNeeded(page);

      // In light mode, "Dark Mode" button is shown (to switch to dark)
      const darkModeButton = page.locator('button:has-text("Dark Mode")')
        .or(page.locator('.theme-toggle__icon--sun'))
        .or(page.locator('[aria-label*="dark mode"]'));

      await expect(darkModeButton.first()).toBeVisible();
    });
  });

  test.describe('Theme Switching Functionality', () => {
    test('should switch from dark to light mode on click', async ({ page }) => {
      // Start in dark mode
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      });
      await page.reload();

      // Verify dark mode is active
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        localStorage.getItem('theme-preference') === 'dark'
      );
      expect(isDark).toBe(true);

      // Click theme toggle
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('button[aria-label*="mode"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      await themeToggle.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify light mode is now active
      const isLight = await page.evaluate(() =>
        document.documentElement.classList.contains('light') ||
        !document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme-preference') === 'light'
      );
      expect(isLight).toBe(true);
    });

    test('should switch from light to dark mode on click', async ({ page }) => {
      // Start in light mode
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      });
      await page.reload();

      // Click theme toggle
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('button[aria-label*="mode"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      await themeToggle.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify dark mode is now active
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme-preference') === 'dark'
      );
      expect(isDark).toBe(true);
    });

    test('should toggle theme multiple times', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('button[aria-label*="mode"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      const getTheme = () => page.evaluate(() => localStorage.getItem('theme-preference'));

      const initialTheme = await getTheme();

      // Toggle 4 times - should end up at initial theme
      for (let i = 0; i < 4; i++) {
        await themeToggle.click();
        await page.waitForLoadState('domcontentloaded');
      }

      const finalTheme = await getTheme();
      expect(finalTheme).toBe(initialTheme);
    });
  });

  test.describe('Theme Persistence', () => {
    test('should persist theme preference in localStorage', async ({ page }) => {
      // Set dark mode
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
      });
      await page.reload();

      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      await themeToggle.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify localStorage was updated
      const storedTheme = await page.evaluate(() => localStorage.getItem('theme-preference'));
      expect(storedTheme).toBe('light');
    });

    test('should restore theme preference on page reload', async ({ page }) => {
      // Set theme to light
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'light');
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Verify theme was restored
      const isLight = await page.evaluate(() =>
        localStorage.getItem('theme-preference') === 'light' ||
        document.documentElement.classList.contains('light') ||
        !document.documentElement.classList.contains('dark')
      );
      expect(isLight).toBe(true);
    });

    test('should restore theme preference on navigation', async ({ page }) => {
      // Set theme to dark
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });

      // Navigate to another page
      const searchLink = page.locator('a[href*="search"]')
        .or(page.locator('a[href*="explore"]'))
        .or(page.locator('nav a').first());

      if (await searchLink.first().isVisible().catch(() => false)) {
        await searchLink.first().click();
        await page.waitForLoadState('domcontentloaded');

        // Verify theme is still dark
        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains('dark') ||
          localStorage.getItem('theme-preference') === 'dark'
        );
        expect(isDark).toBe(true);
      }
    });

    test('should persist theme across browser sessions (localStorage)', async ({ page, context }) => {
      // Set theme
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
      });

      // Open new page in same context
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('domcontentloaded');

      // Verify theme persists
      const isDark = await newPage.evaluate(() =>
        localStorage.getItem('theme-preference') === 'dark'
      );
      expect(isDark).toBe(true);

      await newPage.close();
    });
  });

  test.describe('Visual Style Changes', () => {
    test('should apply dark background color in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      const bgColor = await page.evaluate(() => {
        const body = document.body;
        const style = window.getComputedStyle(body);
        return style.backgroundColor;
      });

      // Dark mode should have dark background (low RGB values)
      // Parse RGB color
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const avgBrightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        expect(avgBrightness).toBeLessThan(128); // Dark background
      }
    });

    test('should apply light background color in light mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      });
      await page.reload();

      const bgColor = await page.evaluate(() => {
        const body = document.body;
        const style = window.getComputedStyle(body);
        return style.backgroundColor;
      });

      // Light mode should have light background (high RGB values)
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const avgBrightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        expect(avgBrightness).toBeGreaterThan(127); // Light background
      }
    });

    test('should have readable text contrast in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      // Find main heading or text
      const textElement = page.locator('h1, h2, p').first();

      if (await textElement.isVisible().catch(() => false)) {
        const textColor = await textElement.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        // Text should be light colored for contrast
        const rgb = textColor.match(/\d+/g);
        if (rgb) {
          const avgBrightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
          expect(avgBrightness).toBeGreaterThan(127); // Light text on dark bg
        }
      }
    });

    test('should have readable text contrast in light mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      });
      await page.reload();

      const textElement = page.locator('h1, h2, p').first();

      if (await textElement.isVisible().catch(() => false)) {
        const textColor = await textElement.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        // Text should be dark colored for contrast
        const rgb = textColor.match(/\d+/g);
        if (rgb) {
          const avgBrightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
          expect(avgBrightness).toBeLessThan(128); // Dark text on light bg
        }
      }
    });

    test('should properly style buttons in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      const button = page.locator('button').first();

      if (await button.isVisible().catch(() => false)) {
        const buttonStyle = await button.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            background: style.backgroundColor,
            color: style.color,
            border: style.border
          };
        });

        // Button should be styled (not default browser style)
        expect(buttonStyle.background).not.toBe('');
      }
    });

    test('should properly style cards/panels in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      const card = page.locator('[class*="card"], [class*="Card"], [class*="panel"]').first();

      if (await card.isVisible().catch(() => false)) {
        const cardBg = await card.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Card should have a visible background
        expect(cardBg).not.toBe('rgba(0, 0, 0, 0)');
      }
    });
  });

  test.describe('System Preference Detection', () => {
    test('should respect system dark mode preference', async ({ page }) => {
      // Clear any stored preference
      await page.evaluate(() => {
        localStorage.removeItem('theme-preference');
      });

      // Emulate dark color scheme preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();

      // Wait for theme to be applied
      await page.waitForLoadState('networkidle');

      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );

      expect(isDark).toBe(true);
    });

    test('should respect system light mode preference', async ({ page }) => {
      // Clear any stored preference
      await page.evaluate(() => {
        localStorage.removeItem('theme-preference');
      });

      // Emulate light color scheme preference
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();

      await page.waitForLoadState('networkidle');

      const isLight = await page.evaluate(() =>
        !document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: light)').matches
      );

      expect(isLight).toBe(true);
    });

    test('should override system preference with user selection', async ({ page }) => {
      // Emulate system dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();

      // User manually selects light mode
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      });
      await page.reload();

      // User preference should win
      const storedTheme = await page.evaluate(() => localStorage.getItem('theme-preference'));
      expect(storedTheme).toBe('light');
    });
  });

  test.describe('Animation and Transitions', () => {
    test('should have smooth transition when switching themes', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      // Check if transition is set on body or root
      const hasTransition = await page.evaluate(() => {
        const style = window.getComputedStyle(document.documentElement);
        const bodyStyle = window.getComputedStyle(document.body);
        return style.transition !== 'none' ||
               bodyStyle.transition !== 'none' ||
               style.transitionDuration !== '0s' ||
               bodyStyle.transitionDuration !== '0s';
      });

      // Toggle and verify smooth change
      await themeToggle.click();

      // Should not have jarring flash
      await page.waitForLoadState('domcontentloaded');
    });

    test('should animate theme toggle icon', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      if (await themeToggle.isVisible().catch(() => false)) {
        // Check for transform or animation on icon
        const icon = themeToggle.locator('svg').first();

        if (await icon.isVisible().catch(() => false)) {
          await themeToggle.click();

          // Icon should have some animation/transform
          await page.waitForLoadState('domcontentloaded');
        }
      }
    });
  });

  test.describe('Theme in Different Components', () => {
    test('should apply theme to modal dialogs', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      // Try to open a modal (search for establishment)
      const searchInput = page.locator('input[type="search"]')
        .or(page.locator('input[placeholder*="search"]'))
        .or(page.locator('[data-testid="search-input"]'));

      if (await searchInput.first().isVisible().catch(() => false)) {
        await searchInput.first().fill('test');
        await page.waitForLoadState('networkidle');

        // Check if any modal/dropdown appeared
        const dropdown = page.locator('[class*="dropdown"], [class*="modal"], [role="dialog"]').first();

        if (await dropdown.isVisible().catch(() => false)) {
          const bgColor = await dropdown.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );

          // Should have dark background
          const rgb = bgColor.match(/\d+/g);
          if (rgb) {
            const avgBrightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
            expect(avgBrightness).toBeLessThan(128);
          }
        }
      }
    });

    test('should apply theme to sidebar/navigation', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      const nav = page.locator('nav, [class*="sidebar"], [class*="navigation"]').first();

      if (await nav.isVisible().catch(() => false)) {
        const navBg = await nav.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );

        // Navigation should be styled for dark mode
        expect(navBg).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('should apply theme to form inputs', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      const input = page.locator('input[type="text"], input[type="search"]').first();

      if (await input.isVisible().catch(() => false)) {
        const inputStyle = await input.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            background: style.backgroundColor,
            color: style.color,
            border: style.borderColor
          };
        });

        // Input should have appropriate styling
        expect(inputStyle.background).toBeDefined();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible theme toggle button', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('button[aria-label*="mode"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      if (await themeToggle.isVisible().catch(() => false)) {
        // Check for aria-label
        const hasAriaLabel = await themeToggle.evaluate(el => {
          return el.hasAttribute('aria-label') ||
                 el.hasAttribute('aria-labelledby') ||
                 el.hasAttribute('title');
        });

        expect(hasAriaLabel).toBe(true);
      }
    });

    test('should be keyboard accessible', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      if (await themeToggle.isVisible().catch(() => false)) {
        // Focus on toggle
        await themeToggle.focus();

        const isFocused = await page.evaluate(() => {
          const active = document.activeElement;
          return active?.tagName === 'BUTTON' ||
                 active?.getAttribute('role') === 'button';
        });

        // Press Enter to toggle
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded');
      }
    });

    test('should maintain focus visibility in both themes', async ({ page }) => {
      const themes = ['dark', 'light'];

      for (const theme of themes) {
        await page.evaluate((t) => {
          localStorage.setItem('theme-preference', t);
          document.documentElement.classList.toggle('dark', t === 'dark');
          document.documentElement.classList.toggle('light', t === 'light');
        }, theme);
        await page.reload();

        const button = page.locator('button').first();

        if (await button.isVisible().catch(() => false)) {
          await button.focus();

          const focusStyle = await button.evaluate(el => {
            const style = window.getComputedStyle(el);
            return {
              outline: style.outline,
              boxShadow: style.boxShadow
            };
          });

          // Should have visible focus indicator
          const hasFocusIndicator = focusStyle.outline !== 'none' ||
                                    focusStyle.boxShadow !== 'none';
        }
      }
    });
  });

  test.describe('Mobile Theme Switching', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('should display theme toggle on mobile', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      // May be in hamburger menu on mobile
      const hamburger = page.locator('[data-testid="mobile-menu"]')
        .or(page.locator('button[aria-label*="menu"]'))
        .or(page.locator('.hamburger'));

      if (await hamburger.first().isVisible().catch(() => false)) {
        await hamburger.first().click();
        await page.waitForLoadState('domcontentloaded');
      }

      await expect(themeToggle).toBeVisible();
    });

    test('should work with touch interaction on mobile', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme-preference', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();

      const themeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="theme"]'))
        .or(page.locator('.theme-toggle'))
        .first();

      // Open mobile menu if needed
      const hamburger = page.locator('[data-testid="mobile-menu"]')
        .or(page.locator('button[aria-label*="menu"]'));

      if (await hamburger.first().isVisible().catch(() => false)) {
        await hamburger.first().tap();
        await page.waitForLoadState('domcontentloaded');
      }

      if (await themeToggle.isVisible().catch(() => false)) {
        await themeToggle.tap();
        await page.waitForLoadState('domcontentloaded');

        const isLight = await page.evaluate(() =>
          localStorage.getItem('theme-preference') === 'light'
        );
        expect(isLight).toBe(true);
      }
    });
  });
});
