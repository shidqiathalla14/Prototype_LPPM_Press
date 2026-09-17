import { expect, Page, test } from '@playwright/test';

const accounts = {
  lppm: { email: 'lppm@upnvj.ac.id', password: 'Password123!' },
  author: { email: 'author@upnvj.ac.id', password: 'Password123!' },
};

async function login(page: Page, account: keyof typeof accounts) {
  const credentials = accounts[account];
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('author dapat login dan diarahkan ke Pengajuan', async ({ page }) => {
  await login(page, 'author');

  await expect(page.getByRole('link', { name: 'Pengajuan', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manajemen Buku', exact: true })).toHaveCount(0);

  await page.goto('/manajemen-buku');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('LPPM dapat memakai filter dan pagination Manajemen Buku', async ({ page }) => {
  await login(page, 'lppm');
  await page.goto('/manajemen-buku');

  await expect(page.getByRole('heading', { name: 'Manajemen Buku' })).toBeVisible();
  await expect(page.getByPlaceholder('Cari judul atau penulis...')).toBeVisible();
  const statusFilter = page.locator('select').nth(1);
  const categoryFilter = page.locator('select').nth(2);
  await expect(statusFilter).toHaveValue('');
  await expect(categoryFilter).toHaveValue('');

  const filteredResponse = page.waitForResponse((response) =>
    response.url().includes('/books?') && response.url().includes('status=IN_REVIEW') && response.ok(),
  );
  await statusFilter.selectOption('IN_REVIEW');
  await filteredResponse;
  await expect(page.getByRole('table').getByText('Dalam Review')).toBeVisible();

  await page.getByPlaceholder('Cari judul atau penulis...').fill('tidak-ada-hasil-uji');
  await expect(page.getByText('Tidak ada naskah')).toBeVisible();
});