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

/**
 * Create a customer access token via Storefront API (for non-Plus checkout sync)
 * Requires a Storefront access token (different from Admin token)
 */
export async function createStorefrontCustomerAccessToken(
  shopDomain: string,
  email: string,
  password: string
): Promise<string> {
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
  const url = `https://${shopDomain}/api/${apiVersion}/graphql.json`;

  const query = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: { email, password },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storefront token creation failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const token = data?.data?.customerAccessTokenCreate?.customerAccessToken?.accessToken;
  const errors = data?.data?.customerAccessTokenCreate?.customerUserErrors || [];

  if (!token) {
    throw new Error(
      `Storefront token creation failed: ${errors.map((e: any) => e.message).join(', ') || 'unknown error'}`
    );
  }

  return token;
}
