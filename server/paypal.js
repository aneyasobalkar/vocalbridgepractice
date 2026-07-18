require('dotenv').config();

const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';
const EXPIRY_SAFETY_WINDOW_MS = 30_000;

let cachedAccessToken = null;
let accessTokenExpiresAt = 0;
let pendingTokenRequest = null;

function credentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.',
    );
  }

  return { clientId, clientSecret };
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function paypalError(operation, response, body) {
  const detail = body?.message || body?.error_description || body?.details?.[0]?.description;
  return new Error(
    `PayPal ${operation} failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ''}`,
  );
}

async function fetchAccessToken() {
  const { clientId, clientSecret } = credentials();
  let response;

  try {
    response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
  } catch (error) {
    throw new Error(`PayPal access token request failed: ${error.message}`);
  }

  const body = await responseBody(response);
  if (!response.ok || !body.access_token) {
    throw paypalError('access token request', response, body);
  }

  cachedAccessToken = body.access_token;
  accessTokenExpiresAt = Date.now() + Number(body.expires_in || 0) * 1000;
  return cachedAccessToken;
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt - EXPIRY_SAFETY_WINDOW_MS) {
    return cachedAccessToken;
  }

  if (!pendingTokenRequest) {
    pendingTokenRequest = fetchAccessToken().finally(() => {
      pendingTokenRequest = null;
    });
  }

  return pendingTokenRequest;
}

function normalizeOrderInput(amount, currency, description) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('PayPal order amount must be a positive number.');
  }

  const currencyCode = String(currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error('PayPal order currency must be a three-letter code such as USD.');
  }

  const safeDescription = String(description || '').trim();
  if (!safeDescription) {
    throw new Error('PayPal order description is required.');
  }

  return {
    amount: numericAmount.toFixed(2),
    currency: currencyCode,
    description: safeDescription.slice(0, 127),
  };
}

async function paypalPost(path, body, operation) {
  const accessToken = await getAccessToken();
  let response;

  try {
    response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new Error(`PayPal ${operation} failed: ${error.message}`);
  }

  const result = await responseBody(response);
  if (!response.ok) throw paypalError(operation, response, result);
  return result;
}

async function createOrder(amount, currency, description) {
  const order = normalizeOrderInput(amount, currency, description);
  const result = await paypalPost(
    '/v2/checkout/orders',
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: order.description,
          amount: { currency_code: order.currency, value: order.amount },
        },
      ],
    },
    'order creation',
  );

  const approvalLink = result.links?.find((link) => link.rel === 'approve')?.href;
  if (!result.id || !approvalLink) {
    throw new Error('PayPal order creation failed: response did not include an order ID and approval link.');
  }

  return { orderId: result.id, approvalLink };
}

async function captureOrder(orderId) {
  const safeOrderId = String(orderId || '').trim();
  if (!safeOrderId) throw new Error('PayPal order ID is required for capture.');

  const result = await paypalPost(
    `/v2/checkout/orders/${encodeURIComponent(safeOrderId)}/capture`,
    null,
    'order capture',
  );
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: result.status,
    payer: result.payer || null,
    amount: capture?.amount || result.purchase_units?.[0]?.amount || null,
  };
}

module.exports = { getAccessToken, createOrder, captureOrder };
