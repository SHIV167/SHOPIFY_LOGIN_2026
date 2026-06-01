# Product Reviews Integration Guide

**Complete implementation guide for the Product Reviews feature in SEOPAL_THEME**

---

## 📋 Overview

This guide documents the complete integration of the Product Reviews feature into the SEOPAL_THEME, which connects with the Modern Reviews App API hosted at `https://reviewshopifyapp.shivjhawebtech.info`.

---

## 📁 File Structure

```
SEOPAL_THEME/
├── sections/
│   └── product-reviews.liquid          # Main review section
├── assets/
│   ├── product-reviews.js              # Review JavaScript logic
│   └── product-reviews.css             # Review styles
└── templates/
    └── product.json                    # Product template (updated)
```

---

## 🔧 Implementation Details

### 1. Section: `sections/product-reviews.liquid`

**Purpose:** Main section that displays reviews and handles review submission

**Features:**
- Review summary with average rating and total reviews
- List of all reviews for the product
- Modal form for submitting new reviews
- Star rating input
- Responsive design

**Key Elements:**
- `data-product-id="{{ product.id }}"` - Product identifier for API calls
- Review summary section with average rating display
- Review list container for displaying reviews
- Modal form for review submission

### 2. JavaScript: `assets/product-reviews.js`

**Purpose:** Handles all review-related functionality

**Key Functions:**
- `loadReviews()` - Fetches reviews from API
- `displayReviews()` - Renders reviews in the UI
- `updateSummary()` - Updates rating summary
- `handleSubmit()` - Submits new review to API
- `setupRatingInput()` - Handles star rating interaction

**API Integration:**
- Base URL: `https://reviewshopifyapp.shivjhawebtech.info`
- Endpoints:
  - GET `/api/reviews?shop={shopDomain}&productId={productId}&status=approved` - Fetch reviews
  - POST `/api/reviews` - Submit new review

### 3. CSS: `assets/product-reviews.css`

**Purpose:** Styling for the review section

**Key Styles:**
- Responsive design for mobile and desktop
- Star rating animations
- Modal styling
- Form styling
- Loading and error states

### 4. Template: `templates/product.json`

**Changes Made:**
- Added `product_reviews` section to sections object
- Added `product_reviews` to order array (positioned at the end)

---

## 🚀 Setup Instructions

### Step 1: Verify Files Exist

Ensure all files are in place:
```bash
sections/product-reviews.liquid
assets/product-reviews.js
assets/product-reviews.css
```

### Step 2: Configure API URL

If your review app is hosted at a different URL, update the API base URL in:

**In `product-reviews.js`:**
```javascript
this.apiBaseUrl = options.apiBaseUrl || 'https://reviewshopifyapp.shivjhawebtech.info';
```

**In `product-reviews.liquid` (if using inline script):**
```javascript
const reviewApiUrl = 'https://reviewshopifyapp.shivjhawebtech.info';
```

### Step 3: Customize Section Settings

The section has the following customizable settings in the Shopify Theme Editor:

- **Heading:** Default "Customer Reviews"
- **Padding Top:** Default 36px (0-100px)
- **Padding Bottom:** Default 36px (0-100px)

### Step 4: Enable Section in Product Template

The section is already added to `product.json`. To enable it:

1. Go to Shopify Admin → Online Store → Themes
2. Click "Customize" on your theme
3. Navigate to a product page
4. Find "Product Reviews" section in the sidebar
5. Ensure it's enabled (not disabled)

---

## 🔌 API Integration

### Review Data Structure

**Request Body (POST /reviews):**
```json
{
  "productId": "123456789",
  "shopDomain": "your-shop.myshopify.com",
  "name": "John Doe",
  "email": "john@example.com",
  "rating": 5,
  "title": "Great product!",
  "content": "I really loved this product..."
}
```

**Response (GET /api/reviews?shop={SHOP_DOMAIN}&productId={PRODUCT_ID}&status=approved):**
```json
{
  "reviews": [
    {
      "id": "review-id",
      "name": "John Doe",
      "rating": 5,
      "title": "Great product!",
      "content": "I really loved this product...",
      "createdAt": "2026-05-31T00:00:00Z"
    }
  ],
  "summary": {
    "averageRating": 4.5,
    "totalReviews": 10
  }
}
```

### Error Handling

The JavaScript handles:
- Network errors
- API errors
- Validation errors (missing rating)
- Empty review states

---

## 🎨 Customization

### Change Colors

Edit `assets/product-reviews.css`:

```css
/* Primary button color */
.write-review-btn,
.submit-review-btn {
  background-color: #333; /* Change this */
}

/* Star color */
.stars,
.review-rating {
  color: #ffc107; /* Change this */
}
```

### Modify Layout

Edit `sections/product-reviews.liquid` to change the HTML structure.

### Add Custom Fields

1. Add field to the form in `product-reviews.liquid`
2. Add field to the review data object in `product-reviews.js`
3. Update API endpoint to handle new field

---

## 🧪 Testing

### Manual Testing

1. Navigate to a product page in your store
2. Scroll to the "Customer Reviews" section
3. Click "Write a Review"
4. Fill out the form and submit
5. Verify the review appears in the list
6. Check that the rating summary updates

### API Testing

**Test fetching reviews:**
```bash
curl "https://reviewshopifyapp.shivjhawebtech.info/api/reviews?shop={SHOP_DOMAIN}&productId={PRODUCT_ID}&status=approved"
```

**Test submitting review:**
```bash
curl -X POST https://reviewshopifyapp.shivjhawebtech.info/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "{PRODUCT_ID}",
    "shop": "{SHOP_DOMAIN}",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "rating": 5,
    "title": "Test Review",
    "content": "This is a test review"
  }'
```

---

## 🔍 Troubleshooting

### Reviews Not Loading

**Problem:** Reviews section shows "Loading reviews..." or error message

**Solutions:**
1. Check browser console for errors
2. Verify API URL is correct
3. Check if review app is running on the server
4. Verify product ID is being passed correctly
5. Check network requests in browser DevTools

### Review Submission Fails

**Problem:** Clicking submit shows error alert

**Solutions:**
1. Ensure all required fields are filled
2. Check that rating is selected (not 0)
3. Verify API endpoint is accessible
4. Check CORS settings on the API server
5. Review API server logs for errors

### Styling Issues

**Problem:** Reviews section looks broken or unstyled

**Solutions:**
1. Verify CSS file is being loaded
2. Check for CSS conflicts with theme styles
3. Ensure CSS file path is correct
4. Clear browser cache

### Section Not Visible

**Problem:** Review section doesn't appear on product page

**Solutions:**
1. Check if section is enabled in product.json
2. Verify section is in the order array
3. Check if section is disabled in Theme Editor
4. Ensure product template is being used

---

## 📊 Performance Considerations

### Lazy Loading

Reviews are loaded asynchronously when the page loads. This doesn't block page rendering.

### Caching

Consider implementing client-side caching for reviews to reduce API calls:

```javascript
// Add to loadReviews function
const cacheKey = `reviews_${productId}`;
const cachedReviews = localStorage.getItem(cacheKey);

if (cachedReviews) {
  displayReviews(JSON.parse(cachedReviews));
}
```

### Pagination

For products with many reviews, implement pagination in the API and UI.

---

## 🔒 Security Considerations

### Input Sanitization

All user input is sanitized using the `escapeHtml()` function to prevent XSS attacks.

### API Security

- Ensure API endpoint requires proper authentication
- Validate all input on the server side
- Implement rate limiting to prevent spam
- Use HTTPS for all API calls

### Data Privacy

- Don't store sensitive customer data unnecessarily
- Comply with GDPR/CCPA requirements
- Provide option for customers to delete their reviews

---

## 🔄 Future Enhancements

### Recommended Features

1. **Photo Reviews:** Allow customers to upload photos with reviews
2. **Video Reviews:** Support for video reviews
3. **Review Filtering:** Filter by rating, date, or helpful votes
4. **Review Sorting:** Sort by newest, oldest, highest rated
5. **Review Replies:** Allow merchants to reply to reviews
6. **Social Sharing:** Share reviews on social media
7. **Rich Snippets:** Add schema markup for SEO
8. **Review Moderation:** Queue system for review approval
9. **Incentives:** Offer discounts for verified purchases
10. **Multi-language:** Support for multiple languages

---

## 📞 Support

### API Issues

Contact the API team or check the API documentation at:
`https://reviewshopifyapp.shivjhawebtech.info/api/docs`

### Theme Issues

For theme-specific issues, check:
- Shopify Theme Documentation
- Liquid Documentation
- Theme Developer Forums

---

## 📝 Changelog

### Version 1.0 (May 31, 2026)
- Initial implementation
- Basic review display and submission
- Star rating system
- Responsive design
- API integration with Modern Reviews App

---

**Last Updated:** May 31, 2026
**Document Version:** 1.0
**Theme:** SEOPAL_THEME
**Review App:** Modern Reviews App
