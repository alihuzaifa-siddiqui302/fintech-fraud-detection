/**
 * FraudGuard Mock Engine & Simulation Fallback
 *
 * Ensures 100% interactive, zero-network-error evaluation on Vercel deployments
 * and standalone client demos while preserving live backend connections when available.
 */

const STORAGE_KEYS = {
  TXNS: 'fraudguard_mock_txns_v2',
  RULES: 'fraudguard_mock_rules_v2',
  BLACKLISTS: 'fraudguard_mock_blacklists_v2',
  AUDIT: 'fraudguard_mock_audit_v2',
  VELOCITY: 'fraudguard_mock_velocity_v2',
};

export const INITIAL_RULES = [
  { id: '1', ruleCode: 'VELOCITY_CARD_1M', name: 'Card Velocity Burst (1 Min)', description: 'Fires when same card is used > N times in 60s', thresholdValue: '5', riskWeight: 35, isEnabled: true },
  { id: '2', ruleCode: 'VELOCITY_CARD_5M', name: 'Card Velocity (5 Min)', description: 'Fires when card exceeds 10 transactions in 5 minutes', thresholdValue: '10', riskWeight: 25, isEnabled: true },
  { id: '3', ruleCode: 'VELOCITY_CARD_1H', name: 'Card Velocity (1 Hour)', description: 'Fires when card exceeds 25 transactions in 1 hour', thresholdValue: '25', riskWeight: 20, isEnabled: true },
  { id: '4', ruleCode: 'HIGH_TRANSACTION_AMOUNT', name: 'High Dollar Threshold', description: 'Transaction exceeds standard retail bounds ($2,000+)', thresholdValue: '2000', riskWeight: 25, isEnabled: true },
  { id: '5', ruleCode: 'FOREIGN_IP_GEOLOCATION', name: 'Cross-Border High-Risk GeoIP', description: 'IP country mismatches customer billing origin', thresholdValue: '1', riskWeight: 25, isEnabled: true },
  { id: '6', ruleCode: 'HEADLESS_BROWSER_AUTOMATION', name: 'Headless Bot Detection', description: 'Selenium/Puppeteer browser automation signals detected', thresholdValue: '1', riskWeight: 30, isEnabled: true },
  { id: '7', ruleCode: 'NEW_DEVICE_FINGERPRINT', name: 'Unrecognized Device Fingerprint', description: 'First observed hardware canvas hash', thresholdValue: '1', riskWeight: 15, isEnabled: true },
  { id: '8', ruleCode: 'VPN_DATACENTER_PROXY', name: 'VPN / Datacenter IP Anonymizer', description: 'IP originates from commercial hosting facility (AWS/DigitalOcean)', thresholdValue: '1', riskWeight: 20, isEnabled: true },
  { id: '9', ruleCode: 'KEYSTROKE_VARIANCE_ANOMALY', name: 'Keystroke Latency Anomaly', description: 'Inhuman typing uniformity (<20ms variance)', thresholdValue: '20', riskWeight: 15, isEnabled: true },
  { id: '10', ruleCode: 'CLIPBOARD_PASTE_CREDENTIALS', name: 'Pasted Card Credentials', description: 'Card number injected via clipboard paste event', thresholdValue: '1', riskWeight: 10, isEnabled: true },
  { id: '11', ruleCode: 'ZERO_MOUSE_MOVEMENT', name: 'Inhuman Zero Mouse Telemetry', description: 'Form submission with zero cursor movement', thresholdValue: '1', riskWeight: 15, isEnabled: true },
  { id: '12', ruleCode: 'MICRO_AMOUNT_TESTING', name: 'Card Testing Micro-Amount', description: 'Small authorization amount (< $1.00) typical of card probing', thresholdValue: '1', riskWeight: 20, isEnabled: true },
  { id: '13', ruleCode: 'ROUND_AMOUNT_ANOMALY', name: 'Suspicious Round Amount', description: 'Transaction is an exact multiple of $1,000 above $5,000', thresholdValue: '5000', riskWeight: 10, isEnabled: true },
  { id: '14', ruleCode: 'TOR_EXIT_NODE', name: 'Tor Anonymizer Endpoint', description: 'Traffic routed through confirmed Tor exit node', thresholdValue: '1', riskWeight: 35, isEnabled: true },
  { id: '15', ruleCode: 'SHARED_DEVICE_MULTI_USER', name: 'Multi-Account Shared Device', description: 'Same hardware fingerprint associated with 3+ users', thresholdValue: '3', riskWeight: 30, isEnabled: true },
  { id: '16', ruleCode: 'VELOCITY_IP_1M', name: 'IP Velocity Burst (1 Min)', description: 'Fires when same IP submits > 8 transactions in 60s', thresholdValue: '8', riskWeight: 30, isEnabled: true },
  { id: '17', ruleCode: 'VELOCITY_IP_1H', name: 'IP Velocity Aggregate (1 Hour)', description: 'Fires when IP exceeds 50 transactions in 1 hour', thresholdValue: '50', riskWeight: 15, isEnabled: true },
  { id: '18', ruleCode: 'BLACKLIST_IP_MATCH', name: 'Global IP Blacklist Hit', description: 'Direct match against active IP blocklist', thresholdValue: '1', riskWeight: 100, isEnabled: true },
  { id: '19', ruleCode: 'BLACKLIST_DEVICE_MATCH', name: 'Global Device Blacklist Hit', description: 'Direct match against blacklisted hardware canvas hash', thresholdValue: '1', riskWeight: 100, isEnabled: true },
  { id: '20', ruleCode: 'BLACKLIST_EMAIL_MATCH', name: 'Global Email Blacklist Hit', description: 'Direct match against blacklisted user email', thresholdValue: '1', riskWeight: 100, isEnabled: true },
];

export const INITIAL_BLACKLISTS = [
  { id: 'bl_01', type: 'IP', value: '185.220.101.45', reason: 'Confirmed Tor Exit Node with credential stuffing activity', createdAt: '2026-10-06T14:32:00Z', createdBy: 'analyst@fraudguard.io' },
  { id: 'bl_02', type: 'DEVICE', value: 'fp_headless_bot_x', reason: 'Automated card-testing botnet cluster', createdAt: '2026-10-07T09:15:00Z', createdBy: 'analyst@fraudguard.io' },
  { id: 'bl_03', type: 'EMAIL', value: 'mule_syndicate@disposable.com', reason: 'Synthetic identity ring organizer', createdAt: '2026-10-08T11:45:00Z', createdBy: 'analyst@fraudguard.io' },
];

export const INITIAL_AUDIT = [
  { id: 'aud_101', timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), actorEmail: 'analyst@fraudguard.io', action: 'TXN_BLOCKED', entityType: 'TRANSACTION', entityId: 'txn_9948214', details: 'Confirmed headless bot credential stuffing pattern. Block upheld.' },
  { id: 'aud_102', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), actorEmail: 'analyst@fraudguard.io', action: 'BLACKLIST_ADDED', entityType: 'IP', entityId: '185.220.101.45', details: 'Added Tor exit node to global permanent blocklist.' },
  { id: 'aud_103', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), actorEmail: 'compliance_lead@fraudguard.io', action: 'RULE_UPDATED', entityType: 'RULE', entityId: 'VELOCITY_CARD_1M', details: 'Updated riskWeight: 30 -> 35. Stricter threshold against automated bot scripts.' },
  { id: 'aud_104', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), actorEmail: 'analyst@fraudguard.io', action: 'TXN_APPROVED', entityType: 'TRANSACTION', entityId: 'txn_9948213', details: 'Customer completed 3D-Secure biometric step-up verification.' },
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'txn_9948212',
    userId: 'usr_sarah_connor',
    amount: 2450.0,
    currency: 'USD',
    status: 'PENDING_REVIEW',
    riskScore: 68,
    ipAddress: '185.220.101.45',
    ipCountry: 'RU',
    deviceFingerprint: 'fp_mac_chrome_v124_compromised',
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    ruleBreakdown: [
      { ruleCode: 'HIGH_TRANSACTION_AMOUNT', ruleName: 'High Dollar Threshold ($2,450 > $2,000)', riskWeight: 25, scoreDelta: 25, passed: false },
      { ruleCode: 'FOREIGN_IP_GEOLOCATION', ruleName: 'Cross-Border High-Risk GeoIP (Russian Fed.)', riskWeight: 25, scoreDelta: 25, passed: false },
      { ruleCode: 'NEW_DEVICE_FINGERPRINT', ruleName: 'Unrecognized Device Fingerprint', riskWeight: 15, scoreDelta: 15, passed: false },
    ],
    subScores: { behavioral: 3, velocity: 5, network: 35, device: 25 },
    forensicData: {
      ip: '185.220.101.45',
      country: 'Russia',
      city: 'Moscow',
      isp: 'Tor Exit Network Ltd.',
      isTor: true,
      isVpn: false,
      isProxy: true,
      datacenterHosting: 'Commercial Proxy',
      deviceType: 'Desktop Mac Chrome',
      canvasHash: 'fp_mac_chrome_v124_compromised',
      keystrokeVariance: 42,
      pasteEvents: 0,
      mouseVelocity: 148,
    },
  },
  {
    id: 'txn_9948213',
    userId: 'usr_alex_chen',
    amount: 78.5,
    currency: 'USD',
    status: 'APPROVED',
    riskScore: 12,
    ipAddress: '72.229.28.185',
    ipCountry: 'US',
    deviceFingerprint: 'fp_clean_mac_01',
    createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    ruleBreakdown: [
      { ruleCode: 'CLEAN_HISTORY', ruleName: 'Trusted Domestic Device & Clean History', riskWeight: 0, scoreDelta: 0, passed: true },
    ],
    subScores: { behavioral: 2, velocity: 3, network: 4, device: 3 },
    forensicData: {
      ip: '72.229.28.185',
      country: 'United States',
      city: 'New York',
      isp: 'Verizon Fios Residential',
      isTor: false,
      isVpn: false,
      isProxy: false,
      datacenterHosting: 'Residential Broadband',
      deviceType: 'MacBook Pro Apple Silicon',
      canvasHash: 'fp_clean_mac_01',
      keystrokeVariance: 85,
      pasteEvents: 0,
      mouseVelocity: 310,
    },
  },
  {
    id: 'txn_9948214',
    userId: 'usr_bot_mule_alpha',
    amount: 4999.0,
    currency: 'USD',
    status: 'BLOCKED',
    riskScore: 94,
    ipAddress: '198.51.100.22',
    ipCountry: 'DE',
    deviceFingerprint: 'fp_shared_emu_99',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    ruleBreakdown: [
      { ruleCode: 'HIGH_TRANSACTION_AMOUNT', ruleName: 'High Dollar Threshold ($4,999 > $2,000)', riskWeight: 25, scoreDelta: 25, passed: false },
      { ruleCode: 'HEADLESS_BROWSER_AUTOMATION', ruleName: 'Puppeteer/Selenium Automation Flag', riskWeight: 30, scoreDelta: 30, passed: false },
      { ruleCode: 'VPN_DATACENTER_PROXY', ruleName: 'Commercial Hosting Datacenter IP', riskWeight: 20, scoreDelta: 20, passed: false },
      { ruleCode: 'KEYSTROKE_VARIANCE_ANOMALY', ruleName: 'Synthetic Typing Variance (<10ms)', riskWeight: 15, scoreDelta: 15, passed: false },
    ],
    subScores: { behavioral: 24, velocity: 20, network: 25, device: 25 },
    forensicData: {
      ip: '198.51.100.22',
      country: 'Germany',
      city: 'Frankfurt',
      isp: 'DigitalOcean Cloud Hosting',
      isTor: false,
      isVpn: true,
      isProxy: true,
      datacenterHosting: 'Commercial Datacenter',
      deviceType: 'Headless Chrome Linux',
      canvasHash: 'fp_shared_emu_99',
      keystrokeVariance: 4,
      pasteEvents: 1,
      mouseVelocity: 0,
    },
  },
  {
    id: 'txn_9948215',
    userId: 'usr_john_doe',
    amount: 320.0,
    currency: 'USD',
    status: 'APPROVED',
    riskScore: 18,
    ipAddress: '151.101.1.69',
    ipCountry: 'GB',
    deviceFingerprint: 'fp_chrome_win11',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    ruleBreakdown: [
      { ruleCode: 'CLEAN_RETAIL', ruleName: 'Standard Retail Clearance', riskWeight: 0, scoreDelta: 0, passed: true },
    ],
    subScores: { behavioral: 4, velocity: 5, network: 5, device: 4 },
    forensicData: {
      ip: '151.101.1.69',
      country: 'United Kingdom',
      city: 'London',
      isp: 'British Telecom',
      isTor: false,
      isVpn: false,
      isProxy: false,
      datacenterHosting: 'Residential ISP',
      deviceType: 'Windows 11 Chrome',
      canvasHash: 'fp_chrome_win11',
      keystrokeVariance: 64,
      pasteEvents: 0,
      mouseVelocity: 220,
    },
  },
  {
    id: 'txn_9948216',
    userId: 'usr_mule_ring_beta',
    amount: 1250.0,
    currency: 'USD',
    status: 'PENDING_REVIEW',
    riskScore: 52,
    ipAddress: '190.2.144.11',
    ipCountry: 'BR',
    deviceFingerprint: 'fp_shared_emu_99',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    ruleBreakdown: [
      { ruleCode: 'SHARED_DEVICE_MULTI_USER', ruleName: 'Shared Device Fingerprint (Ring Association)', riskWeight: 30, scoreDelta: 30, passed: false },
      { ruleCode: 'VPN_DATACENTER_PROXY', ruleName: 'Commercial Proxy Endpoint', riskWeight: 20, scoreDelta: 20, passed: false },
    ],
    subScores: { behavioral: 8, velocity: 12, network: 12, device: 20 },
    forensicData: {
      ip: '190.2.144.11',
      country: 'Brazil',
      city: 'Sao Paulo',
      isp: 'Hosting Services Cloud',
      isTor: false,
      isVpn: true,
      isProxy: true,
      datacenterHosting: 'Cloud Hosting Proxy',
      deviceType: 'Android Emulator',
      canvasHash: 'fp_shared_emu_99',
      keystrokeVariance: 28,
      pasteEvents: 1,
      mouseVelocity: 95,
    },
  },
];

export const INITIAL_GRAPH = {
  nodes: [
    { id: 'usr_sarah_connor', label: 'Sarah Connor', type: 'USER', riskLevel: 'HIGH', isBlacklisted: true, data: { email: 'sarah@resistance.io', riskScore: 68 } },
    { id: 'usr_bot_mule_alpha', label: 'Bot Mule Alpha', type: 'USER', riskLevel: 'HIGH', isBlacklisted: true, data: { email: 'mule_alpha@botnet.xyz', riskScore: 94 } },
    { id: 'usr_mule_ring_beta', label: 'Mule Ring Beta', type: 'USER', riskLevel: 'HIGH', isBlacklisted: false, data: { email: 'mule_beta@disposable.com', riskScore: 52 } },
    { id: 'ip_tor_exit_node', label: '185.220.101.45 (Tor)', type: 'IP', riskLevel: 'HIGH', isBlacklisted: true, data: { asn: 'Tor Exit Node', country: 'RU' } },
    { id: 'ip_vpn_endpoint', label: '198.51.100.22 (VPN)', type: 'IP', riskLevel: 'MEDIUM', isBlacklisted: false, data: { asn: 'DigitalOcean Hosting', country: 'DE' } },
    { id: 'dev_shared_emu', label: 'fp_shared_emu_99', type: 'DEVICE', riskLevel: 'HIGH', isBlacklisted: true, data: { canvas: 'Canvas GPU 0x88f2', model: 'Compromised Hardware' } },
    { id: 'usr_alex_chen', label: 'Alex Chen', type: 'USER', riskLevel: 'LOW', isBlacklisted: false, data: { email: 'alex.chen@clean.com', riskScore: 12 } },
    { id: 'dev_clean_mac', label: 'fp_clean_mac_01', type: 'DEVICE', riskLevel: 'LOW', isBlacklisted: false, data: { canvas: 'Apple Silicon Metal', model: 'Trusted Hardware' } },
  ],
  edges: [
    { id: 'e1', source: 'usr_sarah_connor', target: 'ip_tor_exit_node', relationship: 'CONNECTED_IP', isSuspicious: true },
    { id: 'e2', source: 'usr_sarah_connor', target: 'dev_shared_emu', relationship: 'SHARED_DEVICE', isSuspicious: true },
    { id: 'e3', source: 'usr_bot_mule_alpha', target: 'ip_tor_exit_node', relationship: 'CONNECTED_IP', isSuspicious: true },
    { id: 'e4', source: 'usr_bot_mule_alpha', target: 'dev_shared_emu', relationship: 'SHARED_DEVICE', isSuspicious: true },
    { id: 'e5', source: 'usr_bot_mule_alpha', target: 'ip_vpn_endpoint', relationship: 'CONNECTED_IP', isSuspicious: true },
    { id: 'e6', source: 'usr_mule_ring_beta', target: 'dev_shared_emu', relationship: 'SHARED_DEVICE', isSuspicious: true },
    { id: 'e7', source: 'usr_alex_chen', target: 'dev_clean_mac', relationship: 'DEVICE', isSuspicious: false },
  ],
  summary: {
    totalNodes: 8,
    totalLinks: 7,
    highRiskEntities: 5,
    sharedDeviceCount: 3,
    sharedIpConnections: 2,
  },
};

// State Getters and Setters with localStorage caching
export const getStoredTransactions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TXNS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...INITIAL_TRANSACTIONS];
};

export const saveStoredTransactions = (txns) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(txns));
    window.dispatchEvent(new Event('fraudguard:transactions-updated'));
  } catch {}
};

export const getStoredRules = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RULES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...INITIAL_RULES];
};

export const saveStoredRules = (rules) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  } catch {}
};

export const getStoredBlacklists = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLACKLISTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...INITIAL_BLACKLISTS];
};

export const saveStoredBlacklists = (bls) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BLACKLISTS, JSON.stringify(bls));
  } catch {}
};

export const getStoredAudit = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...INITIAL_AUDIT];
};

export const appendStoredAudit = (entry) => {
  try {
    const list = getStoredAudit();
    const updated = [entry, ...list];
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(updated));
  } catch {}
};

/**
 * Client-Side Autonomous Risk Evaluation Engine
 * Emulates the 20-rule backend scoring pipeline when running in browser demo mode.
 */
export const evaluateMockTransaction = (payload) => {
  const amount = parseFloat(payload.amount) || 0;
  const rules = getStoredRules();
  const ruleMap = Object.fromEntries(rules.map((r) => [r.ruleCode, r]));

  let score = 5;
  const triggered = [];
  const subScores = { behavioral: 2, velocity: 3, network: 2, device: 2 };

  // Rule 4: High Dollar Threshold
  if (amount >= 2000) {
    const r = ruleMap['HIGH_TRANSACTION_AMOUNT'];
    const pts = r?.isEnabled ? r.riskWeight : 25;
    score += pts;
    subScores.velocity += 15;
    triggered.push({
      ruleCode: 'HIGH_TRANSACTION_AMOUNT',
      ruleName: `High Dollar Threshold ($${amount.toFixed(2)} >= $2,000)`,
      riskWeight: pts,
      scoreDelta: pts,
      passed: false,
    });
  }

  // Rule 5: Foreign GeoIP
  if (payload.foreignIp || payload.ipAddress === '185.220.101.45') {
    const r = ruleMap['FOREIGN_IP_GEOLOCATION'];
    const pts = r?.isEnabled ? r.riskWeight : 25;
    score += pts;
    subScores.network += 20;
    triggered.push({
      ruleCode: 'FOREIGN_IP_GEOLOCATION',
      ruleName: 'Cross-Border High-Risk GeoIP (Russian Federation Exit)',
      riskWeight: pts,
      scoreDelta: pts,
      passed: false,
    });
  }

  // Rule 8: VPN / Datacenter
  if (payload.vpnActive) {
    const r = ruleMap['VPN_DATACENTER_PROXY'];
    const pts = r?.isEnabled ? r.riskWeight : 20;
    score += pts;
    subScores.network += 15;
    triggered.push({
      ruleCode: 'VPN_DATACENTER_PROXY',
      ruleName: 'Commercial Hosting / VPN Proxy Endpoint',
      riskWeight: pts,
      scoreDelta: pts,
      passed: false,
    });
  }

  // Rule 6: Headless Automation
  if (payload.headlessMode) {
    const r = ruleMap['HEADLESS_BROWSER_AUTOMATION'];
    const pts = r?.isEnabled ? r.riskWeight : 30;
    score += pts;
    subScores.device += 25;
    triggered.push({
      ruleCode: 'HEADLESS_BROWSER_AUTOMATION',
      ruleName: 'Selenium / Puppeteer Headless Browser Automation Detected',
      riskWeight: pts,
      scoreDelta: pts,
      passed: false,
    });
  }

  // Rule 7: New Device
  if (payload.newDevice) {
    const r = ruleMap['NEW_DEVICE_FINGERPRINT'];
    const pts = r?.isEnabled ? r.riskWeight : 15;
    score += pts;
    subScores.device += 15;
    triggered.push({
      ruleCode: 'NEW_DEVICE_FINGERPRINT',
      ruleName: 'Unrecognized Device Canvas Hardware Hash',
      riskWeight: pts,
      scoreDelta: pts,
      passed: false,
    });
  }

  // Velocity tracking (5x burst simulation)
  try {
    const now = Date.now();
    const rawVel = sessionStorage.getItem(STORAGE_KEYS.VELOCITY) || '[]';
    const timestamps = JSON.parse(rawVel).filter((t) => now - t < 60000);
    timestamps.push(now);
    sessionStorage.setItem(STORAGE_KEYS.VELOCITY, JSON.stringify(timestamps));

    if (timestamps.length >= 4) {
      const r = ruleMap['VELOCITY_CARD_1M'];
      const pts = r?.isEnabled ? r.riskWeight : 35;
      score += pts;
      subScores.velocity += 25;
      triggered.push({
        ruleCode: 'VELOCITY_CARD_1M',
        ruleName: `Card Velocity Burst (${timestamps.length} transactions within 60s)`,
        riskWeight: pts,
        scoreDelta: pts,
        passed: false,
      });
    }
  } catch {}

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Adjudicate decision
  let status = 'APPROVED';
  if (finalScore >= 70) {
    status = 'BLOCKED';
  } else if (finalScore >= 40) {
    status = 'PENDING_REVIEW';
  }

  const txnId = 'txn_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-3);
  const newTxn = {
    id: txnId,
    userId: 'customer@fraudguard.io',
    amount,
    currency: payload.currency || 'USD',
    status,
    riskScore: finalScore,
    ipAddress: payload.foreignIp ? '185.220.101.45' : payload.vpnActive ? '198.51.100.22' : '72.229.28.185',
    ipCountry: payload.foreignIp ? 'RU' : payload.vpnActive ? 'DE' : 'US',
    deviceFingerprint: payload.deviceFingerprint || 'fp_canvas_chrome_v124',
    createdAt: new Date().toISOString(),
    ruleBreakdown: triggered.length > 0 ? triggered : [{ ruleCode: 'NOMINAL', ruleName: 'Nominal Baseline Parameters', riskWeight: 0, scoreDelta: 0, passed: true }],
    subScores,
    forensicData: {
      ip: payload.foreignIp ? '185.220.101.45' : '72.229.28.185',
      country: payload.foreignIp ? 'Russia' : 'United States',
      city: payload.foreignIp ? 'Moscow' : 'New York',
      isp: payload.foreignIp ? 'Tor Exit Network' : payload.vpnActive ? 'DigitalOcean VPN' : 'Residential Fios',
      isTor: Boolean(payload.foreignIp),
      isVpn: Boolean(payload.vpnActive),
      isProxy: Boolean(payload.vpnActive || payload.foreignIp),
      datacenterHosting: payload.vpnActive ? 'Commercial Hosting' : 'Residential',
      deviceType: payload.headlessMode ? 'Headless Chrome Linux' : 'Desktop Browser',
      canvasHash: payload.deviceFingerprint || 'fp_canvas_chrome_v124',
      keystrokeVariance: payload.keystrokeVariance || 55,
      pasteEvents: payload.pasteEvents || 0,
      mouseVelocity: payload.mouseVelocity || 180,
    },
  };

  // Prepend to stored list
  const currentList = getStoredTransactions();
  saveStoredTransactions([newTxn, ...currentList]);

  // Log audit entry
  appendStoredAudit({
    id: 'aud_' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actorEmail: 'system_engine@fraudguard.io',
    action: status === 'BLOCKED' ? 'TXN_BLOCKED' : status === 'PENDING_REVIEW' ? 'TXN_REVIEW_FLAGGED' : 'TXN_APPROVED',
    entityType: 'TRANSACTION',
    entityId: txnId,
    details: `Evaluated risk score ${finalScore}/100. Verdict: ${status}. Triggered rules: ${triggered.map((t) => t.ruleCode).join(', ') || 'None'}.`,
  });

  return {
    transactionId: txnId,
    id: txnId,
    status,
    riskScore: finalScore,
    requiresOtp: status === 'PENDING_REVIEW',
    message: status === 'APPROVED' ? 'Payment authorized successfully' : status === 'PENDING_REVIEW' ? 'Step-up verification required' : 'Payment declined by fraud prevention engine',
    ruleBreakdown: triggered,
  };
};

/**
 * Synthesizes a high-fidelity FinCEN SAR narrative for offline/demo evaluation
 */
export const generateMockSarText = (txn) => {
  const dateStr = new Date(txn.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const rulesList = (txn.ruleBreakdown || []).map((r) => `  - [${r.ruleCode}] ${r.ruleName} (+${r.riskWeight} pts)`).join('\n') || '  - [VELOCITY_BURST] Multi-account velocity anomaly';

  return `SUSPICIOUS ACTIVITY REPORT (SAR) NARRATIVE
FILED PURSUANT TO THE BANK SECRECY ACT (BSA) / 31 CFR § 1020.320
CONFIDENTIAL COMPLIANCE DOCUMENTATION

I. SUBJECT IDENTIFICATION:
   Customer Account: ${txn.userId || 'usr_customer_unknown'}
   Transaction ID:   ${txn.id}
   Transaction Date: ${dateStr}
   Dollar Amount:    $${(txn.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${txn.currency || 'USD'}
   Risk Score:       ${txn.riskScore || 68}/100 [Category: High Risk / Suspicious]
   Network Origin:   ${txn.ipAddress || '185.220.101.45'} (${txn.ipCountry || 'Foreign / Tor Network'})
   Hardware Hash:    ${txn.deviceFingerprint || 'fp_shared_emu_99'}

II. SUMMARY OF SUSPICIOUS ACTIVITY:
On ${dateStr}, FraudGuard's automated risk intelligence engine flagged transaction ${txn.id} with an elevated composite risk score of ${txn.riskScore}/100. Telemetry analysis indicated a multi-vector anomaly combining foreign network proxies with suspicious client automation signals.

Specific heuristic rules triggered during concurrent adjudication:
${rulesList}

III. FORENSIC FINDINGS & TYPOLOGY ANALYSIS:
1. Geolocation & Proxy Evasion: The transaction originated from IP address ${txn.ipAddress}, flagged as a commercial anonymizing proxy and known exit endpoint. This pattern represents an intentional attempt to conceal the actor's physical geolocation.
2. Device & Identity Integrity: Client hardware telemetry generated signature ${txn.deviceFingerprint}, correlated across multiple disparate user identities within a 48-hour observation window—a primary indicator of synthetic identity rings and automated card-testing cartels.
3. Behavioral Biometrics: Telemetry recorded anomalous inter-key cadence and clipboard injection, inconsistent with genuine cardholder interaction.

IV. COMPLIANCE DISPOSITION & REMEDIATION:
- Current Adjudication Status: ${txn.status}
- Preventive Action Taken: Transaction quarantined. Entity added to watchlist.
- Recommendation: Maintain permanent entity blocklist flag and retain complete cryptographic payload records for FinCEN BSA compliance archival.

FILING ANALYST: FraudGuard Autonomous Intelligence / Compliance Division
REPORT HASH: SHA-256: ${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
};
