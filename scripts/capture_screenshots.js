const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve(__dirname, '../docs/images');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Mock database for realistic screenshot captures
const MOCK_METRICS = {
  totalVolume: 1845200.50,
  transactionCount: 4210,
  blockedCount: 78,
  pendingReviewCount: 24,
  approvedCount: 4108,
  averageRiskScore: 18.4,
  adjudicationSlaMs: 46,
};

const MOCK_TRANSACTIONS = [
  {
    id: 'txn_9948214',
    userId: 'usr_sarah_connor',
    amount: 2450.00,
    currency: 'USD',
    status: 'PENDING_REVIEW',
    riskScore: 68,
    cardLast4: '4242',
    ipAddress: '185.220.101.45',
    country: 'DE',
    deviceFingerprint: 'fp_a98e21bc04f',
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    evaluationResult: {
      riskScore: 68,
      decision: 'PENDING_REVIEW',
      subScores: { network: 25, device: 20, velocity: 15, behavioral: 8 },
      triggeredRules: [
        { ruleName: 'FOREIGN_IP_GEOLOCATION', weight: 25, description: 'IP originated from foreign exit node' },
        { ruleName: 'HIGH_TRANSACTION_AMOUNT', weight: 20, description: 'Amount > $2,000 threshold' },
        { ruleName: 'NEW_DEVICE_FINGERPRINT', weight: 15, description: 'Unrecognized hardware fingerprint hash' },
        { ruleName: 'KEYSTROKE_VARIANCE_ANOMALY', weight: 8, description: 'Mechanical typing dynamics' },
      ],
    },
  },
  {
    id: 'txn_9948213',
    userId: 'usr_alex_chen',
    amount: 78.50,
    currency: 'USD',
    status: 'APPROVED',
    riskScore: 12,
    cardLast4: '1122',
    ipAddress: '72.229.28.185',
    country: 'US',
    deviceFingerprint: 'fp_known_dev_01',
    createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    evaluationResult: {
      riskScore: 12,
      decision: 'APPROVED',
      subScores: { network: 5, device: 2, velocity: 3, behavioral: 2 },
      triggeredRules: [],
    },
  },
  {
    id: 'txn_9948212',
    userId: 'usr_bot_mule_88',
    amount: 4999.00,
    currency: 'USD',
    status: 'BLOCKED',
    riskScore: 94,
    cardLast4: '9876',
    ipAddress: '198.51.100.22',
    country: 'RU',
    deviceFingerprint: 'fp_headless_bot_x',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    evaluationResult: {
      riskScore: 94,
      decision: 'BLOCKED',
      subScores: { network: 35, device: 30, velocity: 20, behavioral: 9 },
      triggeredRules: [
        { ruleName: 'VELOCITY_CARD_1M', weight: 35, description: 'Card testing burst (>5 txns/min)' },
        { ruleName: 'HEADLESS_BROWSER_AUTOMATION', weight: 30, description: 'Puppeteer/Selenium navigator flags' },
        { ruleName: 'TOR_EXIT_NODE', weight: 20, description: 'Confirmed Tor anonymity relay' },
        { ruleName: 'PASTE_DETECTION_CREDENTIALS', weight: 9, description: 'Direct clipboard injection' },
      ],
    },
  },
  {
    id: 'txn_9948211',
    userId: 'usr_emma_watson',
    amount: 320.00,
    currency: 'USD',
    status: 'APPROVED',
    riskScore: 18,
    cardLast4: '5544',
    ipAddress: '151.101.1.69',
    country: 'GB',
    deviceFingerprint: 'fp_safari_mac_99',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    evaluationResult: { riskScore: 18, decision: 'APPROVED', subScores: {}, triggeredRules: [] },
  },
  {
    id: 'txn_9948210',
    userId: 'usr_carlos_mendez',
    amount: 1250.00,
    currency: 'USD',
    status: 'PENDING_REVIEW',
    riskScore: 52,
    cardLast4: '3321',
    ipAddress: '190.2.144.11',
    country: 'BR',
    deviceFingerprint: 'fp_android_s24',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    evaluationResult: { riskScore: 52, decision: 'PENDING_REVIEW', subScores: {}, triggeredRules: [] },
  },
];

const MOCK_GRAPH = {
  nodes: [
    { id: 'usr_101', label: 'Sarah Connor', type: 'USER', riskLevel: 'HIGH', isBlacklisted: false, data: { email: 'sarah@network.org', totalTransactions: 14, primaryCountry: 'US' } },
    { id: 'usr_102', label: 'Bot Mule Alpha', type: 'USER', riskLevel: 'HIGH', isBlacklisted: true, data: { email: 'mule1@darkweb.cc', totalTransactions: 32, primaryCountry: 'RU' } },
    { id: 'usr_103', label: 'Alex Chen', type: 'USER', riskLevel: 'LOW', isBlacklisted: false, data: { email: 'alex@clean.io', totalTransactions: 3, primaryCountry: 'US' } },
    { id: 'usr_104', label: 'Mule Ring Beta', type: 'USER', riskLevel: 'HIGH', isBlacklisted: false, data: { email: 'mule2@darkweb.cc', totalTransactions: 19, primaryCountry: 'NL' } },
    { id: 'ip_1', label: '185.220.101.45 (Tor)', type: 'IP', riskLevel: 'HIGH', isBlacklisted: true, data: { country: 'DE', asn: 'AS208323', fraudScore: 92 } },
    { id: 'ip_2', label: '198.51.100.22 (VPN)', type: 'IP', riskLevel: 'MEDIUM', isBlacklisted: false, data: { country: 'NL', asn: 'AS16509', fraudScore: 68 } },
    { id: 'dev_1', label: 'fp_shared_emu_99', type: 'DEVICE', riskLevel: 'HIGH', isBlacklisted: true, data: { os: 'Linux x86_64', browser: 'Chrome Headless', riskScore: 88 } },
    { id: 'dev_2', label: 'fp_clean_mac_01', type: 'DEVICE', riskLevel: 'LOW', isBlacklisted: false, data: { os: 'macOS 14.5', browser: 'Safari 17', riskScore: 8 } },
  ],
  edges: [
    { id: 'e1', source: 'usr_101', target: 'dev_1', label: 'SHARED_DEVICE', type: 'SHARED_DEVICE' },
    { id: 'e2', source: 'usr_102', target: 'dev_1', label: 'SHARED_DEVICE', type: 'SHARED_DEVICE' },
    { id: 'e3', source: 'usr_104', target: 'dev_1', label: 'SHARED_DEVICE', type: 'SHARED_DEVICE' },
    { id: 'e4', source: 'usr_101', target: 'ip_1', label: 'CONNECTED_IP', type: 'CONNECTED_IP' },
    { id: 'e5', source: 'usr_102', target: 'ip_1', label: 'CONNECTED_IP', type: 'CONNECTED_IP' },
    { id: 'e6', source: 'usr_104', target: 'ip_2', label: 'CONNECTED_IP', type: 'CONNECTED_IP' },
    { id: 'e7', source: 'usr_103', target: 'dev_2', label: 'DEVICE', type: 'DEVICE' },
  ],
  stats: {
    totalNodes: 8,
    totalEdges: 7,
    userNodes: 4,
    ipNodes: 2,
    deviceNodes: 2,
    blacklistedNodes: 3,
    highRiskNodes: 5,
    sharedDeviceConnections: 3,
    sharedIpConnections: 2,
  },
};

const MOCK_RULES = [
  { id: '1', ruleCode: 'VELOCITY_CARD_1M', name: 'Card Velocity Burst (1 Min)', description: 'Fires when same card is used > N times in 60s', thresholdValue: '5', riskWeight: 35, isEnabled: true },
  { id: '2', ruleCode: 'HIGH_TRANSACTION_AMOUNT', name: 'High Dollar Threshold', description: 'Transaction exceeds standard retail bounds', thresholdValue: '2000', riskWeight: 25, isEnabled: true },
  { id: '3', ruleCode: 'FOREIGN_IP_GEOLOCATION', name: 'Cross-Border High-Risk GeoIP', description: 'IP country mismatches customer billing origin', thresholdValue: '1', riskWeight: 25, isEnabled: true },
  { id: '4', ruleCode: 'HEADLESS_BROWSER_AUTOMATION', name: 'Headless Bot Detection', description: 'Selenium/Puppeteer browser automation signals', thresholdValue: '1', riskWeight: 30, isEnabled: true },
  { id: '5', ruleCode: 'NEW_DEVICE_FINGERPRINT', name: 'Unrecognized Device Fingerprint', description: 'First observed hardware canvas hash', thresholdValue: '1', riskWeight: 15, isEnabled: true },
  { id: '6', ruleCode: 'VPN_DATACENTER_PROXY', name: 'VPN / Datacenter IP Anonymizer', description: 'IP originates from commercial hosting facility', thresholdValue: '1', riskWeight: 20, isEnabled: true },
  { id: '7', ruleCode: 'KEYSTROKE_VARIANCE_ANOMALY', name: 'Keystroke Latency Anomaly', description: 'Inhuman typing uniformity (<20ms variance)', thresholdValue: '20', riskWeight: 15, isEnabled: true },
  { id: '8', ruleCode: 'CLIPBOARD_PASTE_CREDENTIALS', name: 'Pasted Card Credentials', description: 'Card number injected via clipboard paste', thresholdValue: '1', riskWeight: 10, isEnabled: true },
];

const MOCK_BLACKLISTS = [
  { id: 'bl_01', type: 'IP', value: '185.220.101.45', reason: 'Confirmed Tor Exit Node with credential stuffing activity', createdAt: '2026-10-06T14:32:00Z', createdBy: 'analyst@fraudguard.io' },
  { id: 'bl_02', type: 'DEVICE', value: 'fp_headless_bot_x', reason: 'Automated card-testing botnet cluster', createdAt: '2026-10-07T09:15:00Z', createdBy: 'analyst@fraudguard.io' },
  { id: 'bl_03', type: 'EMAIL', value: 'mule_syndicate@disposable.com', reason: 'Synthetic identity ring organizer', createdAt: '2026-10-08T11:45:00Z', createdBy: 'analyst@fraudguard.io' },
];

const MOCK_AUDIT = {
  content: [
    { id: 'aud_101', timestamp: '2026-10-08T18:22:10Z', actorEmail: 'analyst@fraudguard.io', action: 'TXN_BLOCKED', entityType: 'TRANSACTION', entityId: 'txn_9948212', details: 'Overrode automated decision to BLOCKED. Reason: Corroborated Tor exit node with card stuffing.' },
    { id: 'aud_102', timestamp: '2026-10-08T17:45:00Z', actorEmail: 'analyst@fraudguard.io', action: 'BLACKLIST_ADDED', entityType: 'IP', entityId: '185.220.101.45', details: 'Added Tor exit node to global permanent blocklist.' },
    { id: 'aud_103', timestamp: '2026-10-08T16:10:30Z', actorEmail: 'compliance_lead@fraudguard.io', action: 'RULE_UPDATED', entityType: 'RULE', entityId: 'VELOCITY_CARD_1M', details: 'Updated riskWeight: 30 -> 35. Stricter threshold against automated bot scripts.' },
    { id: 'aud_104', timestamp: '2026-10-08T15:05:12Z', actorEmail: 'analyst@fraudguard.io', action: 'TXN_APPROVED', entityType: 'TRANSACTION', entityId: 'txn_9948214', details: 'Customer completed 3D-Secure biometric step-up verification.' },
  ],
  page: 0,
  totalPages: 1,
  totalElements: 4,
};

async function capture() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--window-size=1440,900', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  page.on('request', (req) => {
    if (req.method() === 'OPTIONS') {
      return req.respond({ status: 200, headers: corsHeaders });
    }

    const url = req.url();
    if (url.includes('/api/v1/analyst/metrics')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(MOCK_METRICS) });
    }
    if (url.includes('/api/v1/analyst/transactions/')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(MOCK_TRANSACTIONS[0]) });
    }
    if (url.includes('/api/v1/analyst/transactions')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ content: MOCK_TRANSACTIONS, page: 0, totalPages: 1, totalElements: MOCK_TRANSACTIONS.length }) });
    }
    if (url.includes('/api/v1/analyst/graph')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(MOCK_GRAPH) });
    }
    if (url.includes('/api/v1/analyst/rules')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(MOCK_RULES) });
    }
    if (url.includes('/api/v1/analyst/blacklists')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(MOCK_BLACKLISTS) });
    }
    if (url.includes('/api/v1/analyst/audit')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(MOCK_AUDIT) });
    }
    if (url.includes('/api/v1/customer/transactions')) {
      return req.respond({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ content: MOCK_TRANSACTIONS.slice(0, 3), page: 0, totalPages: 1 }) });
    }
    req.continue();
  });

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  async function setAuth(role, email, name) {
    await page.evaluate((r, e, n) => {
      localStorage.setItem('fg_auth', JSON.stringify({
        token: 'mock-jwt-token-for-screenshots',
        user: { role: r, email: e, name: n },
      }));
      // Mark tours as seen so clean view is captured
      localStorage.setItem('fraudguard_tour_checkout', 'true');
      localStorage.setItem('fraudguard_tour_analyst', 'true');
      localStorage.setItem('fraudguard_tour_graph', 'true');
    }, role, email, name);
  }

  // 1. Login Page
  console.log('Capturing Login...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login_portal.png') });

  // 2. Customer Checkout Simulator
  console.log('Capturing Checkout Simulator...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
  await setAuth('ROLE_CUSTOMER', 'customer@fraudguard.io', 'Customer Demo');
  await page.goto('http://127.0.0.1:5173/portal/checkout', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_customer_checkout.png') });

  // 3. Analyst Dashboard
  console.log('Capturing Analyst Dashboard...');
  await setAuth('ROLE_ANALYST', 'analyst@fraudguard.io', 'Compliance Analyst');
  await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
  await delay(1200);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_analyst_dashboard.png') });

  // 4. Forensic Drawer Inspection
  console.log('Capturing Forensic Drawer...');
  try {
    const row = await page.$('table tbody tr');
    if (row) {
      await row.click();
      await delay(800);
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04_forensic_drawer_sar.png') });
    }
  } catch (err) {
    console.log('Drawer click error:', err.message);
  }

  // 5. Syndicate Link Graph
  console.log('Capturing Syndicate Link Graph...');
  await page.goto('http://127.0.0.1:5173/admin/graph', { waitUntil: 'networkidle0' });
  await delay(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_syndicate_link_graph.png') });

  // 6. Rules Manager
  console.log('Capturing Rules Manager...');
  await page.goto('http://127.0.0.1:5173/admin/rules', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_rules_manager.png') });

  // 7. Blacklists
  console.log('Capturing Blacklists...');
  await page.goto('http://127.0.0.1:5173/admin/blacklists', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_blacklists_management.png') });

  // 8. Audit Log
  console.log('Capturing Audit Log...');
  await page.goto('http://127.0.0.1:5173/admin/audit', { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_compliance_audit_log.png') });

  // 9. Evaluator Guide Bot Modal
  console.log('Capturing Evaluator Guide Bot...');
  await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
  await delay(800);
  try {
    const guideBtn = await page.$('button[title*="Platform Guide"], button[title*="Feature Tour"]');
    if (guideBtn) {
      await guideBtn.click();
    } else {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('fraudguard:open-guide')));
    }
  } catch {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('fraudguard:open-guide')));
  }
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09_evaluator_guide_bot.png') });

  await browser.close();
  console.log('All screenshots captured successfully in docs/images!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
