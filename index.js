const puppeteer = require('puppeteer');
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

// Human scroll simulation
async function humanScroll(page, minTime = 5000, maxTime = 10000) {
  // Scroll to the very bottom smoothly in steps
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

  // Scroll to the top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Scroll to somewhere in the middle
  await page.evaluate(() => {
    const mid = document.documentElement.scrollHeight / 2;
    window.scrollTo(0, mid + Math.random() * 200 - 100); // ±100 pixels from middle
  });

  // Final pause
  await new Promise(resolve => setTimeout(resolve, Math.random() * (maxTime - minTime) + minTime));
}

async function run() {
  //const proxy = getRandomFromArray(proxies);
   const proxyAuth = {
    username: '4931f9737528fd894176',
    password: '5ab0012a5258b9d1',
  };
  const proxyHostPort = 'gw.dataimpulse.com:823';
  const userAgent = new UserAgent();
  const category = getRandomFromArray(categories);

  const browser = await puppeteer.launch({
    headless: false,
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

  // Visit Google and search for your site
  await page.goto('https://www.google.com/url?q=https://www.technologymanias.com/&sa=U&ved=2ahUKEwi0qIaT_dqNAxUJIbkGHXFmGmUQFnoECAMQAg&usg=AOvVaw0FJzYvtyQ4bBeeZ0TKIj8V', { timeout: 0 });
 

  // Human scroll + wait
  await humanScroll(page);
  await new Promise(resolve => setTimeout(resolve, Math.random() * 40000 + 40000));


  // Click random article/post link
  const anchors = await page.$$('a');
  if (anchors.length > 0) {
    const randomAnchor = getRandomFromArray(anchors);
    await randomAnchor.click();
    // await new Promise(resolve => setTimeout(resolve, 2000));
    // await page.keyboard.press('Escape');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }

  await humanScroll(page, 5000, 10000);
  await new Promise(resolve => setTimeout(resolve, Math.random() * 20000 + 40000));
//   await page.waitForTimeout(Math.random() * 40000 + 40000);

  await browser.close();

  // Wait random 5-10 sec then repeat whole process
  const delay = Math.random() * 5000 + 5000;
  console.log(`Waiting ${delay.toFixed(0)}ms before repeating...`);
  await new Promise(res => setTimeout(res, delay));

  await run();
}

run();
