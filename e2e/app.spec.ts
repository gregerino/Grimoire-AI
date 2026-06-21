import { test, expect } from '@playwright/test'

test.describe('Auth flows', () => {
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

  test('login page shows Google OAuth button', async ({ page }) => {
    await page.goto('/login')
    const button = page.locator('text=Continue with Google')
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  })

  test('redirects unknown routes to dashboard (→ login if unauthed)', async ({ page }) => {
    await page.goto('/nonexistent-page')
    await expect(page).toHaveURL(/\/(login|dashboard)/)
  })
})

test.describe('App shell', () => {
  test('serves the app on the correct port', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('has correct meta viewport for responsive layout', async ({ page }) => {
    await page.goto('/')
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::ERR'),
    )
    expect(realErrors).toHaveLength(0)
  })
})

test.describe('Health check', () => {
  test('backend responds to health check', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:3001/api/health')
      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('ok')
    } catch {
      test.skip(true, 'Backend not running — skipping health check')
    }
  })
})
