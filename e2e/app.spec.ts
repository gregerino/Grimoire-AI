import { test, expect } from '@playwright/test'

test.describe('Grimoire App', () => {
  test('shows login page by default', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Grimoire')).toBeVisible()
    await expect(page.locator('text=Continue with Google')).toBeVisible()
  })

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('text=Continue with Google')).toBeVisible()
  })

  test('login page has correct title and branding', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=AI Dungeon Master')).toBeVisible()
  })
})
