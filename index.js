const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const { faker } = require('@faker-js/faker');

puppeteer.use(StealthPlugin());

// Import domain lists from separate modules
const insuranceDomains = require('./domains/insurance');
const healthDomains = require('./domains/health');
const educationDomains = require('./domains/education');
const businessDomains = require('./domains/business');

// const proxies = [
//   'http://4931f9737528fd894176:5ab0012a5258b9d1@gw.dataimpulse.com:823',
// ];

const categories = ['insurance', 'health', 'education', 'business'];

// Helper: random pick from array
function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Map categories to domain lists
const categoryDomains = {
  insurance: insuranceDomains,
  health: healthDomains,
  education: educationDomains,
  business: businessDomains,
};

// Generate realistic cookie sets per category (USA-based domains)
function generateCookies(category) {
  // Pick a random domain from the chosen category's domain list
  const domain = getRandomFromArray(categoryDomains[category]);
  const now = Math.floor(Date.now() / 1000);
  const oneYearLater = now + 60 * 60 * 24 * 365;

  const baseCookies = [
    {
      name: 'interest',
      value: category,
      domain,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      session: false,
      expirationDate: oneYearLater,
      storeId: '0',
    },
    {
      name: 'session_id',
      value: faker.string.uuid(),
      domain,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      session: true,
      storeId: '0',
    },
  ];

  switch (category) {
    case 'insurance':
      baseCookies.push({
        name: 'policy_num',
        value: 'PN-' + faker.number.int({ min: 100000, max: 999999 }),
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
        session: false,
        expirationDate: oneYearLater,
        storeId: '0',
      });
      break;
    case 'health':
      baseCookies.push({
        name: 'health_session',
        value: faker.string.alphanumeric(24),
        domain,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        session: true,
        storeId: '0',
      });
      break;
    case 'education':
      baseCookies.push({
        name: 'edu_user',
        value: faker.internet.username(),
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
        session: false,
        expirationDate: oneYearLater,
        storeId: '0',
      });
      break;
    case 'business':
      baseCookies.push({
        name: 'biz_visitor',
        value: faker.string.uuid(),
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
        session: true,
        storeId: '0',
      });
      break;
  }

  return baseCookies;
}

async function humanScroll(page, minTime = 5000, maxTime = 10000) {
    await page.waitForFunction(() => document && document.documentElement !== null);
  // Scroll to the very bottom in steps
  let hasMore = true;
  while (hasMore) {
    hasMore = await page.evaluate(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      window.scrollBy(0, clientHeight / 2);
      return scrollTop + clientHeight < scrollHeight;
    });
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }

  // Wait a bit at the bottom
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Slowly scroll to top
  const scrollUpSteps = 10;
  for (let i = 0; i < scrollUpSteps; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, -window.innerHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 200));
  }

  // Pause before going to middle
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Smooth scroll to middle
  const scrollMidSteps = 5;
  const midTarget = await page.evaluate(() => document.documentElement.scrollHeight / 2);
  for (let i = 0; i < scrollMidSteps; i++) {
    await page.evaluate((target, step, index) => {
      const current = window.scrollY;
      const targetStep = current + (target - current) / (step - index);
      window.scrollTo(0, targetStep);
    }, midTarget, scrollMidSteps, i);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 200));
  }

  // Final pause
  await new Promise(resolve => setTimeout(resolve, Math.random() * (maxTime - minTime) + minTime));
}

function getCustomUserAgent() {
  const isMobile = Math.random() < 0.45; // 35% chance
  const userAgent = new UserAgent({
    deviceCategory: isMobile ? 'mobile' : 'desktop',
  });
  return userAgent.toString();
}

async function run() {
  //const proxy = getRandomFromArray(proxies);
   const proxyAuth = {
    username: '4931f9737528fd894176',
    password: '5ab0012a5258b9d1',
  };
  const proxyHostPort = 'gw.dataimpulse.com:823';
  const userAgent = getCustomUserAgent();
  //new UserAgent();
  const category = getRandomFromArray(categories);

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--proxy-server=${proxyHostPort}`, '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.authenticate(proxyAuth);

  await page.setUserAgent(userAgent.toString());

  const cookies = generateCookies(category);
  await page.setCookie(...cookies);

  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'upgrade-insecure-requests': '1',
  });

  try {
    console.log('Navigating to Google redirect URL...');
    await page.goto(
        'https://www.google.com/url?q=https://www.technologymanias.com/&sa=U&ved=2ahUKEwi0qIaT_dqNAxUJIbkGHXFmGmUQFnoECAMQAg&usg=AOvVaw0FJzYvtyQ4bBeeZ0TKIj8V',
        { timeout: 100000 }
    );
    console.log('Navigation to redirect URL successful.');
    } catch (error) {
    console.log('Navigation timeout or error at redirect URL. Retrying direct URL...');
    await page.goto('https://www.technologymanias.com/', { timeout: 100000 });
    console.log('Navigation to direct URL successful.');
    }

    console.log('Starting human-like scroll...');
    await humanScroll(page);
    console.log('Initial human scroll complete. Waiting randomly between 40s–80s...');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 40000 + 40000));

    console.log('Looking for all anchor links on the page...');
    const links = await page.$$eval('a', anchors =>
    anchors
      .filter(a => a.offsetParent !== null && a.href && a.href !== '#')
      .map((a, i) => ({ index: i, href: a.href }))
    );
    console.log(`Found ${links.length} anchor tags.`);

    if (!links.length) {
        console.log("No valid anchor elements found.");
        return;
    }

    const random = links[Math.floor(Math.random() * links.length)];
    const handles = await page.$$('a');
    const targetHandle = handles[random.index];

    try {
        await targetHandle.scrollIntoViewIfNeeded();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        // await page.waitForTimeout(500 + Math.random() * 500);
        // await targetHandle.click({ delay: Math.random() * 200 + 100 });
        await Promise.all([
            page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' }),
            targetHandle.click({ delay: 100 }),
        ]);
        console.log(`Clicked link: ${random.href}`);
    } catch (err) {
        console.error('Failed to click anchor:', err);
    }
    console.log('Random anchor click successful and navigation complete.');

    console.log('Starting second round of human scroll...');
    await humanScroll(page, 5000, 10000);
    console.log('Second human scroll complete. Waiting randomly between 40s–60s...');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20000 + 40000));

//   await page.waitForTimeout(Math.random() * 40000 + 40000);

  await browser.close();

  // Wait random 5-10 sec then repeat whole process
  const delay = Math.random() * 15000 + 5000;
  console.log(`Waiting ${delay.toFixed(0)}ms before repeating...`);
  await new Promise(res => setTimeout(res, delay));

  await run();
}

run();
