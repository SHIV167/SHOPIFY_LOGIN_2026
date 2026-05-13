interface ShopifyCustomerPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  verified_email?: boolean;
  send_email_invite?: boolean;
  send_email_welcome?: boolean;
  password?: string;
  password_confirmation?: string;
  tags?: string;
}

export class ShopifyCustomerError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message || `Shopify customer create failed: ${status} ${body}`);
    this.status = status;
    this.body = body;
    this.name = 'ShopifyCustomerError';
  }
}

export async function createShopifyCustomer(
  shopDomain: string,
  accessToken: string,
  payload: ShopifyCustomerPayload
) {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
  const url = `https://${shopDomain}/admin/api/${apiVersion}/customers.json`;

  // Strip undefined / empty values; Shopify rejects empty phone with 422.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    cleaned[k] = v;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ customer: cleaned }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Shopify] customer create failed', {
      shopDomain,
      status: res.status,
      body: text,
      payload: cleaned,
    });
    throw new ShopifyCustomerError(res.status, text);
  }

  const data = (await res.json()) as {
    customer: {
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
    };
  };
  return data.customer;
}

export async function findShopifyCustomerByEmail(
  shopDomain: string,
  accessToken: string,
  email: string
) {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
  const url = `https://${shopDomain}/admin/api/${apiVersion}/customers/search.json?query=${encodeURIComponent(
    `email:${email}`
  )}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ShopifyCustomerError(res.status, text);
  }

  const data = (await res.json()) as { customers: Array<{ id: number; email: string }> };
  return data.customers?.[0] ?? null;
}
