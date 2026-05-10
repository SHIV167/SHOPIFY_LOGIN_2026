interface ShopifyCustomerPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  verified_email?: boolean;
  send_email_invite?: boolean;
}

export async function createShopifyCustomer(
  shopDomain: string,
  accessToken: string,
  payload: ShopifyCustomerPayload
) {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
  const url = `https://${shopDomain}/admin/api/${apiVersion}/customers.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ customer: payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify customer create error:', res.status, text);
    throw new Error(`Shopify customer create failed: ${res.status} ${text}`);
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
