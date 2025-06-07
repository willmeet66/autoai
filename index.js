const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Domain imports
const insuranceDomains = require('./domains/insurance');
const healthDomains = require('./domains/health');
educationDomains = require('./domains/education');
const businessDomains = require('./domains/business');

const categories = ['insurance', 'health', 'education', 'business'];
const categoryDomains = {
  insurance: insuranceDomains,
  health: healthDomains,
  education: educationDomains,
  business: businessDomains,
};

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCookies(category) {
  const domain = getRandomFromArray(categoryDomains[category]);
  const now = Math.floor(Date.now() / 1000);
  const oneYearLater = now + 60 * 60 * 24 * 365;

  const baseCookies = [
    {
      name: 'interest',
      value: category,
      domain,
      path: '/',
      expirationDate: oneYearLater,
      sameSite: 'Lax',
      httpOnly: false,
      secure: false,
      session: false,
      storeId: '0',
    },
    {
      name: 'session_id',
      value: faker.string.uuid(),
      domain,
      path: '/',
      sameSite: 'Lax',
      httpOnly: true,
      secure: true,
      session: true,
      storeId: '0',
    },
  ];

  const extraCookies = {
    insurance: {
      name: 'policy_num',
      value: 'PN-' + faker.number.int({ min: 100000, max: 999999 }),
    },
    health: {
      name: 'health_session',
      value: faker.string.alphanumeric(24),
    },
    education: {
      name: 'edu_user',
      value: faker.internet.username(),
    },
    business: {
      name: 'biz_visitor',
      value: faker.string.uuid(),
    },
  };

  const extra = extraCookies[category];
  if (extra) {
    baseCookies.push({
      ...extra,
      domain,
      path: '/',
      expirationDate: oneYearLater,
      sameSite: 'Lax',
      secure: true,
      session: category !== 'health',
      httpOnly: category === 'health',
      storeId: '0',
    });
  }
  return baseCookies;
}

function getCustomUserAgent() {
  const isMobile = Math.random() < 0.45;
  return new UserAgent({ deviceCategory: isMobile ? 'mobile' : 'desktop' }).toString();
}

async function humanScroll(page, minTime = 5000, maxTime = 10000) {
  if (page.isClosed()) return;
  await page.waitForFunction(() => document && document.documentElement !== null);

  let hasMore = true;
  while (hasMore) {
    hasMore = await page.evaluate(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      window.scrollBy(0, clientHeight / 2);
      return scrollTop + clientHeight < scrollHeight;
    });
    await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
  }
  await new Promise(r => setTimeout(r, Math.random() * 17000 + 500));

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, -window.innerHeight));
    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
  }
  await new Promise(r => setTimeout(r, Math.random() * 15000 + 500));

  const midTarget = await page.evaluate(() => document.documentElement.scrollHeight * 0.25);
  for (let i = 0; i < 5; i++) {
    await page.evaluate((target, step, index) => {
      const current = window.scrollY;
      const targetStep = current + (target - current) / (step - index);
      window.scrollTo(0, targetStep);
    }, midTarget, 5, i);
    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
  }
  await new Promise(r => setTimeout(r, Math.random() * (maxTime - minTime) + minTime));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function visitRandomTechnologymaniasLinks(page, browser) {
  const repeatCount = getRandomInt(3, 6);

  for (let i = 0; i < repeatCount; i++) {
    const links = await page.$$eval('a', anchors =>
      anchors
        .filter(a =>
          a.offsetParent !== null &&
          a.href &&
          a.href !== '#' &&
          a.href.startsWith('https://www.technologymanias.com')
        )
        .map((a, i) => ({ index: i, href: a.href }))
    );

    if (links.length) {
      const handles = await page.$$('a');
      const randomLink = getRandomFromArray(links);
      const targetHandle = handles[randomLink.index];

      const pagesBefore = await browser.pages();
      await targetHandle.click({
        modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'],
        delay: 100
      });

      const pagesAfter = await browser.pages();
      const newPage = pagesAfter.find(p => !pagesBefore.includes(p));

      if (newPage) {
        await newPage.bringToFront();
        try {
          await newPage.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' });
          console.log('New tab URL:', newPage.url());
        } catch (e) {
          console.warn('New tab navigation error:', e.message);
        }
      }

      // Optional: Perform scroll on main page
      await humanScroll(page, 5000, 10000);

      // Wait randomly between 40s to 60s
      await new Promise(r => setTimeout(r, Math.random() * 20000 + 40000));
    } else {
      console.log('No valid links found.');
    }
  }
}

async function run() {
  const proxyList = fs.readFileSync('proxies.txt', 'utf-8')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  const proxy = getRandomFromArray(proxyList);
  const userAgent = getCustomUserAgent();
  const category = getRandomFromArray(categories);
  const cookies = generateCookies(category);

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--proxy-server=${proxy}`, '--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.setCookie(...cookies);
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'upgrade-insecure-requests': '1',
    });

    await page.goto('https://www.technologymanias.com/', { timeout: 60000 });
    await humanScroll(page);
    await new Promise(r => setTimeout(r, Math.random() * 40000 + 40000));

    await visitRandomTechnologymaniasLinks(page, browser);

  } catch (err) {
    console.error('❌ Error during navigation:', err.message);
  } finally {
    await browser.close();
    const delay = Math.random() * 1500 + 500;
    console.log(`Waiting ${delay.toFixed(0)}ms before next run...`);
    await new Promise(r => setTimeout(r, delay));
    return run();
  }
}

run();
