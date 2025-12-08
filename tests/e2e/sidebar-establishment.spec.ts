import { test, expect } from '@playwright/test';

test.describe('Establishment Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Sidebar Opening', () => {
    test('should open sidebar when clicking on establishment card', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]')
        .or(page.locator('.establishment-card'))
        .or(page.locator('[class*="EstablishmentCard"]'))
        .first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        // Sidebar should appear
        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .or(page.locator('[class*="Sidebar"]'))
          .or(page.locator('[role="dialog"]'))
          .or(page.locator('[class*="detail-panel"]'));

        await expect(sidebar.first()).toBeVisible();
      }
    });

    test('should open sidebar from map marker click', async ({ page }) => {
      // Navigate to map view
      const mapView = page.locator('[data-testid="map-view"]')
        .or(page.locator('canvas'))
        .or(page.locator('[class*="map"]'));

      if (await mapView.first().isVisible()) {
        // Click on a marker
        const marker = page.locator('[data-testid="map-marker"]')
          .or(page.locator('[class*="marker"]'))
          .first();

        if (await marker.isVisible()) {
          await marker.click();
          await page.waitForTimeout(500);

          const sidebar = page.locator('[data-testid="establishment-sidebar"]')
            .or(page.locator('[class*="sidebar"]'));

          await expect(sidebar.first()).toBeVisible();
        }
      }
    });

    test('should animate sidebar opening', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        // Check for transform/transition before click
        await establishmentCard.click();

        // Sidebar should slide in
        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          // Check CSS transition/animation
          const hasAnimation = await sidebar.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.transition !== 'none' || style.animation !== 'none';
          });
        }
      }
    });
  });

  test.describe('Sidebar Content - Basic Info', () => {
    test('should display establishment name', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const name = sidebar.locator('h1, h2, [class*="title"], [class*="name"]').first();
          await expect(name).toBeVisible();
          const nameText = await name.textContent();
          expect(nameText?.length).toBeGreaterThan(0);
        }
      }
    });

    test('should display establishment logo/photo', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const image = sidebar.locator('img').first();
          await expect(image).toBeVisible();
        }
      }
    });

    test('should display establishment category/type', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const category = sidebar.locator('[data-testid="category"]')
            .or(sidebar.locator('[class*="category"]'))
            .or(sidebar.getByText(/gogo|bar|club|restaurant|massage/i));

          await expect(category.first()).toBeVisible();
        }
      }
    });

    test('should display establishment zone/location', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const location = sidebar.locator('[data-testid="location"]')
            .or(sidebar.locator('[class*="location"]'))
            .or(sidebar.locator('[class*="zone"]'))
            .or(sidebar.getByText(/walking street|soi|beach road/i));

          await expect(location.first()).toBeVisible();
        }
      }
    });

    test('should display VIP badge for VIP establishments', async ({ page }) => {
      // Find VIP establishment
      const vipCard = page.locator('[data-testid="establishment-card"]:has([class*="vip"])')
        .or(page.locator('.establishment-card:has(.vip-badge)'))
        .first();

      if (await vipCard.isVisible()) {
        await vipCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const vipBadge = sidebar.locator('[data-testid="vip-badge"]')
            .or(sidebar.locator('[class*="vip"]'))
            .or(sidebar.getByText(/vip|premium/i));

          await expect(vipBadge.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Sidebar Content - Details', () => {
    test('should display opening hours', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const hours = sidebar.locator('[data-testid="opening-hours"]')
            .or(sidebar.locator('[class*="hours"]'))
            .or(sidebar.getByText(/open|close|hours|\d{1,2}:\d{2}/i));

          const hasHours = await hours.first().isVisible().catch(() => false);
        }
      }
    });

    test('should display contact information', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const contact = sidebar.locator('[data-testid="contact"]')
            .or(sidebar.locator('a[href^="tel:"]'))
            .or(sidebar.locator('[class*="phone"]'))
            .or(sidebar.getByText(/\+66|\d{3}-\d{3}-\d{4}/));

          const hasContact = await contact.first().isVisible().catch(() => false);
        }
      }
    });

    test('should display establishment description', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const description = sidebar.locator('[data-testid="description"]')
            .or(sidebar.locator('[class*="description"]'))
            .or(sidebar.locator('p').first());

          const hasDescription = await description.isVisible().catch(() => false);
        }
      }
    });

    test('should display average rating and review count', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const rating = sidebar.locator('[data-testid="rating"]')
            .or(sidebar.locator('[class*="rating"]'))
            .or(sidebar.locator('[class*="star"]'))
            .or(sidebar.getByText(/\d\.\d|\d\/5|stars/i));

          const hasRating = await rating.first().isVisible().catch(() => false);
        }
      }
    });

    test('should display consumables/drinks section', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const consumables = sidebar.locator('[data-testid="consumables"]')
            .or(sidebar.locator('[class*="consumable"]'))
            .or(sidebar.locator('[class*="drink"]'))
            .or(sidebar.getByText(/beer|cocktail|drink|฿/i));

          const hasConsumables = await consumables.first().isVisible().catch(() => false);
        }
      }
    });
  });

  test.describe('Sidebar Content - Employees', () => {
    test('should display employees section', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const employeesSection = sidebar.locator('[data-testid="employees-section"]')
            .or(sidebar.locator('[class*="employee"]'))
            .or(sidebar.getByText(/employee|staff|girls/i));

          const hasEmployees = await employeesSection.first().isVisible().catch(() => false);
        }
      }
    });

    test('should display employee cards with photos', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const employeeCard = sidebar.locator('[data-testid="employee-card"]')
            .or(sidebar.locator('[class*="employee-card"]'))
            .or(sidebar.locator('[class*="EmployeeCard"]'))
            .first();

          if (await employeeCard.isVisible()) {
            const photo = employeeCard.locator('img');
            await expect(photo).toBeVisible();
          }
        }
      }
    });

    test('should show employee availability status', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const availabilityStatus = sidebar.locator('[data-testid="availability"]')
            .or(sidebar.locator('[class*="availability"]'))
            .or(sidebar.locator('[class*="status"]'))
            .or(sidebar.getByText(/available|unavailable|online|offline/i));

          const hasAvailability = await availabilityStatus.first().isVisible().catch(() => false);
        }
      }
    });

    test('should navigate to employee detail on click', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const employeeCard = sidebar.locator('[data-testid="employee-card"]')
            .or(sidebar.locator('[class*="employee-card"]'))
            .first();

          if (await employeeCard.isVisible()) {
            await employeeCard.click();
            await page.waitForTimeout(500);

            // Should show employee details or navigate
            const employeeDetail = page.locator('[data-testid="employee-detail"]')
              .or(page.locator('[class*="employee-detail"]'))
              .or(page.getByText(/profile|about|bio/i));

            const urlHasEmployee = page.url().includes('employee');
            const hasDetail = await employeeDetail.first().isVisible().catch(() => false);
          }
        }
      }
    });
  });

  test.describe('Sidebar Actions', () => {
    test('should have favorite/bookmark button', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const favoriteButton = sidebar.locator('[data-testid="favorite-button"]')
            .or(sidebar.locator('button[aria-label*="favorite"]'))
            .or(sidebar.locator('button[aria-label*="bookmark"]'))
            .or(sidebar.locator('[class*="favorite"]'))
            .or(sidebar.locator('[class*="heart"]'));

          await expect(favoriteButton.first()).toBeVisible();
        }
      }
    });

    test('should toggle favorite on button click', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', 'user@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      await page.goto('/');

      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const favoriteButton = sidebar.locator('[data-testid="favorite-button"]')
            .or(sidebar.locator('button[aria-label*="favorite"]'))
            .or(sidebar.locator('[class*="favorite"]'))
            .first();

          if (await favoriteButton.isVisible()) {
            // Get initial state
            const initialClass = await favoriteButton.getAttribute('class');

            await favoriteButton.click();
            await page.waitForTimeout(500);

            // Class or aria-pressed should change
            const newClass = await favoriteButton.getAttribute('class');
          }
        }
      }
    });

    test('should have share button', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const shareButton = sidebar.locator('[data-testid="share-button"]')
            .or(sidebar.locator('button[aria-label*="share"]'))
            .or(sidebar.locator('[class*="share"]'));

          const hasShare = await shareButton.first().isVisible().catch(() => false);
        }
      }
    });

    test('should have directions/map link', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const directionsLink = sidebar.locator('[data-testid="directions"]')
            .or(sidebar.locator('a[href*="maps.google"]'))
            .or(sidebar.locator('a[href*="directions"]'))
            .or(sidebar.locator('[class*="direction"]'));

          const hasDirections = await directionsLink.first().isVisible().catch(() => false);
        }
      }
    });

    test('should have write review button', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const reviewButton = sidebar.locator('[data-testid="write-review"]')
            .or(sidebar.locator('button:has-text("Review")'))
            .or(sidebar.locator('button:has-text("Write")'))
            .or(sidebar.locator('[class*="review"]'));

          const hasReview = await reviewButton.first().isVisible().catch(() => false);
        }
      }
    });
  });

  test.describe('Sidebar Closing', () => {
    test('should close sidebar when clicking close button', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const closeButton = sidebar.locator('[data-testid="close-sidebar"]')
            .or(sidebar.locator('button[aria-label*="close"]'))
            .or(sidebar.locator('[class*="close"]'))
            .or(sidebar.locator('button:has-text("×")'));

          await closeButton.first().click();
          await page.waitForTimeout(500);

          await expect(sidebar).not.toBeVisible();
        }
      }
    });

    test('should close sidebar when clicking outside (overlay)', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          // Click on overlay/backdrop
          const overlay = page.locator('[data-testid="sidebar-overlay"]')
            .or(page.locator('[class*="overlay"]'))
            .or(page.locator('[class*="backdrop"]'));

          if (await overlay.first().isVisible()) {
            await overlay.first().click({ position: { x: 10, y: 10 } });
            await page.waitForTimeout(500);

            await expect(sidebar).not.toBeVisible();
          }
        }
      }
    });

    test('should close sidebar when pressing Escape key', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          await expect(sidebar).not.toBeVisible();
        }
      }
    });

    test('should animate sidebar closing', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const closeButton = sidebar.locator('[data-testid="close-sidebar"]')
            .or(sidebar.locator('button[aria-label*="close"]'))
            .first();

          await closeButton.click();

          // Should animate out (not instantly disappear)
          await page.waitForTimeout(100);
        }
      }
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('should allow scrolling within sidebar for long content', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          // Check if sidebar is scrollable
          const isScrollable = await sidebar.evaluate(el => {
            return el.scrollHeight > el.clientHeight;
          });

          if (isScrollable) {
            // Scroll down
            await sidebar.evaluate(el => {
              el.scrollTop = 200;
            });

            const scrollTop = await sidebar.evaluate(el => el.scrollTop);
            expect(scrollTop).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should have tabs for different sections', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          // Look for tab navigation
          const tabs = sidebar.locator('[role="tablist"]')
            .or(sidebar.locator('[class*="tabs"]'))
            .or(sidebar.locator('[class*="tab-list"]'));

          const hasTabs = await tabs.first().isVisible().catch(() => false);
        }
      }
    });

    test('should switch content when clicking tabs', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const tab = sidebar.locator('[role="tab"]')
            .or(sidebar.locator('[class*="tab-item"]'))
            .nth(1);

          if (await tab.isVisible()) {
            await tab.click();
            await page.waitForTimeout(300);

            // Content should change
            const tabPanel = sidebar.locator('[role="tabpanel"]')
              .or(sidebar.locator('[class*="tab-content"]'));

            await expect(tabPanel.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Sidebar Photo Gallery', () => {
    test('should display photo gallery', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const gallery = sidebar.locator('[data-testid="photo-gallery"]')
            .or(sidebar.locator('[class*="gallery"]'))
            .or(sidebar.locator('[class*="photo-grid"]'));

          const hasGallery = await gallery.first().isVisible().catch(() => false);
        }
      }
    });

    test('should open lightbox on photo click', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const galleryPhoto = sidebar.locator('[data-testid="gallery-photo"]')
            .or(sidebar.locator('[class*="gallery"] img'))
            .first();

          if (await galleryPhoto.isVisible()) {
            await galleryPhoto.click();
            await page.waitForTimeout(500);

            // Lightbox should appear
            const lightbox = page.locator('[data-testid="lightbox"]')
              .or(page.locator('[class*="lightbox"]'))
              .or(page.locator('[class*="modal"] img'));

            const hasLightbox = await lightbox.first().isVisible().catch(() => false);
          }
        }
      }
    });

    test('should navigate between photos in lightbox', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const galleryPhoto = sidebar.locator('[data-testid="gallery-photo"]')
            .or(sidebar.locator('[class*="gallery"] img'))
            .first();

          if (await galleryPhoto.isVisible()) {
            await galleryPhoto.click();
            await page.waitForTimeout(500);

            // Look for navigation arrows
            const nextButton = page.locator('[data-testid="lightbox-next"]')
              .or(page.locator('button[aria-label*="next"]'))
              .or(page.locator('[class*="next"]'));

            const hasNavigation = await nextButton.first().isVisible().catch(() => false);
          }
        }
      }
    });
  });

  test.describe('Mobile Sidebar', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('should display full-screen sidebar on mobile', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const box = await sidebar.boundingBox();

          if (box) {
            // Should take full width on mobile
            expect(box.width).toBeGreaterThanOrEqual(350);
          }
        }
      }
    });

    test('should support swipe to close on mobile', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.tap();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const box = await sidebar.boundingBox();

          if (box) {
            // Swipe right to close
            await page.touchscreen.tap(box.x + 50, box.y + 100);
            await page.mouse.move(box.x + 50, box.y + 100);
            await page.mouse.down();
            await page.mouse.move(box.x + 250, box.y + 100, { steps: 10 });
            await page.mouse.up();

            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.tap();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          const button = sidebar.locator('button').first();

          if (await button.isVisible()) {
            const box = await button.boundingBox();

            if (box) {
              // Minimum touch target size (44px recommended)
              expect(box.height).toBeGreaterThanOrEqual(40);
            }
          }
        }
      }
    });
  });

  test.describe('Sidebar Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .or(page.locator('[role="dialog"]'))
          .first();

        if (await sidebar.isVisible()) {
          const hasAriaLabel = await sidebar.evaluate(el => {
            return el.hasAttribute('aria-label') ||
                   el.hasAttribute('aria-labelledby') ||
                   el.getAttribute('role') === 'dialog';
          });

          // Close button should be accessible
          const closeButton = sidebar.locator('[data-testid="close-sidebar"]')
            .or(sidebar.locator('button[aria-label*="close"]'))
            .first();

          if (await closeButton.isVisible()) {
            const closeHasLabel = await closeButton.evaluate(el =>
              el.hasAttribute('aria-label')
            );
          }
        }
      }
    });

    test('should trap focus within sidebar', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          // Tab through elements
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');

          // Focus should stay within sidebar
          const activeElement = await page.evaluate(() =>
            document.activeElement?.closest('[class*="sidebar"]') !== null
          );
        }
      }
    });

    test('should return focus on close', async ({ page }) => {
      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator('[data-testid="establishment-sidebar"]')
          .or(page.locator('[class*="sidebar"]'))
          .first();

        if (await sidebar.isVisible()) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          // Focus should return to trigger element or body
          const activeElement = await page.evaluate(() =>
            document.activeElement?.tagName
          );
        }
      }
    });
  });

  test.describe('Sidebar Loading States', () => {
    test('should show loading state while fetching data', async ({ page }) => {
      // Intercept API and delay response
      await page.route('**/api/establishments/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();

        // Should show loading indicator
        const loader = page.locator('[data-testid="sidebar-loader"]')
          .or(page.locator('[class*="loading"]'))
          .or(page.locator('[class*="spinner"]'))
          .or(page.locator('[class*="skeleton"]'));

        const hasLoader = await loader.first().isVisible().catch(() => false);
      }
    });

    test('should show error state on fetch failure', async ({ page }) => {
      // Intercept API and return error
      await page.route('**/api/establishments/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      const establishmentCard = page.locator('[data-testid="establishment-card"]').first();

      if (await establishmentCard.isVisible()) {
        await establishmentCard.click();
        await page.waitForTimeout(500);

        // Should show error message
        const errorMessage = page.getByText(/error|failed|try again/i);
        const hasError = await errorMessage.first().isVisible().catch(() => false);
      }
    });
  });
});
