/**
 * Product Reviews Integration
 * Integrates with the Modern Reviews App API
 */

class ProductReviews {
  constructor(options = {}) {
    this.productId = options.productId || null;
    this.shopDomain = options.shopDomain || null;
    this.apiBaseUrl =
      options.apiBaseUrl || "https://reviewshopifyapp.shivjhawebtech.info";
    this.container = options.container || null;

    // Get product and customer data from DOM
    const productElement = document.querySelector("[data-product-id]");
    console.log("ProductReviews: Looking for product element", productElement);

    if (productElement) {
      this.productId = productElement.dataset.productId;
      this.productHandle = productElement.dataset.productHandle || this._fallbackProductHandle();
      this.productTitle = productElement.dataset.productTitle || this._fallbackProductTitle();
      this.shop = productElement.dataset.shop;
      this.customerLoggedIn =
        productElement.dataset.customerLoggedIn === "true";
      this.customerName = productElement.dataset.customerName || "";
      this.customerEmail = productElement.dataset.customerEmail || "";
      this.customerId = productElement.dataset.customerId || "";

      this.applyStoredCustomerSession();

      console.log("ProductReviews: Data loaded from DOM", {
        productId: this.productId,
        productHandle: this.productHandle,
        productTitle: this.productTitle,
        shop: this.shop,
        customerLoggedIn: this.customerLoggedIn,
        customerName: this.customerName,
        customerEmail: this.customerEmail,
      });
    } else {
      console.error(
        "ProductReviews: Product element not found in DOM, trying Shopify global objects",
      );
      // Fallback to Shopify global objects
      if (window.Shopify && window.Shopify.product) {
        this.productId = window.Shopify.product.id;
        this.productHandle = window.Shopify.product.handle || this._fallbackProductHandle();
        this.productTitle = window.Shopify.product.title || this._fallbackProductTitle();
      }
      if (window.Shopify && window.Shopify.shop) {
        this.shop = window.Shopify.shop;
      }

      console.log("ProductReviews: Data from Shopify global", {
        productId: this.productId,
        productHandle: this.productHandle,
        productTitle: this.productTitle,
        shop: this.shop,
      });
    }

    // Ensure productHandle and productTitle always have values
    if (!this.productHandle) {
      this.productHandle = this._fallbackProductHandle();
      console.warn("ProductReviews: Using fallback productHandle:", this.productHandle);
    }
    if (!this.productTitle) {
      this.productTitle = this._fallbackProductTitle();
      console.warn("ProductReviews: Using fallback productTitle:", this.productTitle);
    }

    if (!this.productId || !this.shop) {
      console.error("ProductReviews: productId and shop are required", {
        productId: this.productId,
        shop: this.shop,
      });
      // Don't return - try to initialize anyway with fallback values
      if (!this.productId) {
        this.productId = "unknown";
        console.warn("ProductReviews: Using fallback productId");
      }
      if (!this.shop) {
        this.shop = window.location.hostname;
        console.warn("ProductReviews: Using fallback shop from hostname");
      }
    }

    this.init(); 
  }

  _fallbackProductHandle() {
    // Extract handle from URL path: /products/ashwagandha-root-powder -> ashwagandha-root-powder
    var path = window.location.pathname;
    var parts = path.split('/').filter(Boolean);
    var productsIdx = parts.indexOf('products');
    if (productsIdx !== -1 && parts[productsIdx + 1]) {
      return parts[productsIdx + 1];
    }
    // Last segment fallback
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
    return 'unknown-product';
  }

  _fallbackProductTitle() {
    // Try og:title meta tag first, then document.title
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      return ogTitle.getAttribute('content').trim();
    }
    if (document.title) {
      // Strip shop name suffix if present (e.g. "Product Name – Shop Name")
      return document.title.split('–')[0].split('|')[0].trim();
    }
    return 'Unknown Product';
  }

  init() {
    this.loadReviews();
    this.setupEventListeners();
  }

  async loadReviews() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/reviews?shop=${encodeURIComponent(this.shop)}&productId=${encodeURIComponent(String(this.productId))}&status=approved`,
      );

      if (response.ok) {
        const data = await response.json();
        this.displayReviews(data.reviews || []);
        this.updateSummary({
          averageRating:
            data.summary?.averageRating ?? data.stats?.average ?? 0,
          totalReviews: data.summary?.totalReviews ?? data.stats?.count ?? 0,
        });
      } else {
        this.showNoReviews();
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      this.showError();
    }
  }

  displayReviews(reviews) {
    const reviewsList = document.getElementById("reviews-list");
    if (!reviewsList) return;

    if (reviews.length === 0) {
      reviewsList.innerHTML =
        '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
      return;
    }

    reviewsList.innerHTML = reviews
      .map((review) => this.createReviewCard(review))
      .join("");
  }

  createReviewCard(review) {
    return `
      <div class="review-card" data-review-id="${review.id}">
        <div class="review-header">
          <div class="reviewer-info">
            <span class="reviewer-name">${this.escapeHtml(review.customerName || review.name)}</span>
            <span class="review-date">${this.formatDate(review.createdAt)}</span>
          </div>
          <div class="review-rating">${this.createStarRating(review.rating)}</div>
        </div>
        <div class="review-title">${this.escapeHtml(review.title)}</div>
        <div class="review-content">${this.escapeHtml(review.content)}</div>
      </div>
    `;
  }

  createStarRating(rating) {
    const fullStars = "★".repeat(rating);
    const emptyStars = "☆".repeat(5 - rating);
    return `<span class="stars">${fullStars}${emptyStars}</span>`;
  }

  updateSummary(summary) {
    const averageRating = document.getElementById("average-rating");
    const averageStars = document.getElementById("average-stars");
    const totalReviews = document.getElementById("total-reviews");

    if (averageRating) {
      averageRating.textContent = summary.averageRating.toFixed(1);
    }

    if (averageStars) {
      averageStars.innerHTML = this.createStarRating(
        Math.round(summary.averageRating),
      );
    }

    if (totalReviews) {
      totalReviews.textContent = `${summary.totalReviews} review${summary.totalReviews !== 1 ? "s" : ""}`;
    }
  }

  showNoReviews() {
    const reviewsList = document.getElementById("reviews-list");
    if (reviewsList) {
      reviewsList.innerHTML =
        '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
    }
  }

  showError() {
    const reviewsList = document.getElementById("reviews-list");
    if (reviewsList) {
      reviewsList.innerHTML =
        '<p class="error-message">Failed to load reviews. Please try again later.</p>';
    }
  }

  setupEventListeners() {
    window.addEventListener("shopify:customer:login", (event) => {
      if (event.detail) {
        try {
          const customerJson = JSON.stringify(event.detail);
          localStorage.setItem("shopify_customer", customerJson);
          localStorage.setItem("lr_customer", customerJson);
        } catch (error) {
          console.warn(
            "ProductReviews: Failed to persist customer login event",
            error,
          );
        }
      }

      this.applyStoredCustomerSession();
      this.closeLoginModal();
      this.openModal();
      this.autoFillCustomerData();
    });

    window.addEventListener("shopify:customer:logout", () => {
      this.customerLoggedIn = false;
      this.customerId = "";
      this.customerName = "";
      this.customerEmail = "";
      this.closeModal();
      this.closeLoginModal();
    });

    if (window.location.hash === "#write-review") {
      this.handleWriteReviewClick();
    }

    // Write review button
    const writeReviewBtn = document.getElementById("write-review-btn");
    if (writeReviewBtn) {
      writeReviewBtn.addEventListener("click", () =>
        this.handleWriteReviewClick(),
      );
    }

    // Close review modal
    const closeModal = document.getElementById("close-modal");
    if (closeModal) {
      closeModal.addEventListener("click", () => this.closeModal());
    }

    // Close login modal
    const closeLoginModal = document.getElementById("close-login-modal");
    if (closeLoginModal) {
      closeLoginModal.addEventListener("click", () => this.closeLoginModal());
    }

    // Modal background click
    const reviewModal = document.getElementById("review-modal");
    if (reviewModal) {
      reviewModal.addEventListener("click", (e) => {
        if (e.target === reviewModal) {
          this.closeModal();
        }
      });
    }

    const loginModal = document.getElementById("login-modal");
    if (loginModal) {
      loginModal.addEventListener("click", (e) => {
        if (e.target === loginModal) {
          this.closeLoginModal();
        }
      });
    }

    // Review form submission
    const reviewForm = document.getElementById("review-form");
    if (reviewForm) {
      reviewForm.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    // Character count for review content
    const reviewContent = document.getElementById("review-content");
    if (reviewContent) {
      reviewContent.addEventListener("input", (e) =>
        this.updateCharCount(e.target.value),
      );
    }

    // Rating input
    this.setupRatingInput();
  }

  handleWriteReviewClick() {
    this.applyStoredCustomerSession();

    console.log("ProductReviews: Write review button clicked");
    console.log(
      "ProductReviews: Customer logged in status:",
      this.customerLoggedIn,
    );
    console.log("ProductReviews: Customer name:", this.customerName);
    console.log("ProductReviews: Customer email:", this.customerEmail);

    if (this.customerLoggedIn) {
      console.log(
        "ProductReviews: Opening review modal for logged in customer",
      );
      this.openModal();
      this.autoFillCustomerData();
    } else {
      console.log(
        "ProductReviews: Opening login modal for non-logged in customer",
      );
      this.openLoginModal();
    }
  }

  applyStoredCustomerSession() {
    try {
      const storedCustomer =
        localStorage.getItem("shopify_customer") ||
        localStorage.getItem("lr_customer");
      if (!storedCustomer) return;

      const customer = JSON.parse(storedCustomer);
      if (!customer || (!customer.email && !customer.id)) return;

      this.customerLoggedIn = true;
      this.customerId = customer.id ? String(customer.id) : this.customerId;
      this.customerEmail = customer.email || this.customerEmail;
      this.customerName =
        [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        customer.name ||
        this.customerName;
    } catch (error) {
      this.customerLoggedIn = false;
      console.warn(
        "ProductReviews: Failed to read stored customer session",
        error,
      );
    }
  }

  autoFillCustomerData() {
    const nameInput = document.getElementById("reviewer-name");
    const emailInput = document.getElementById("reviewer-email");

    console.log("ProductReviews: Auto-filling customer data");
    console.log("ProductReviews: Name input:", nameInput);
    console.log("ProductReviews: Email input:", emailInput);
    console.log("ProductReviews: Customer name from data:", this.customerName);
    console.log(
      "ProductReviews: Customer email from data:",
      this.customerEmail,
    );

    if (nameInput && this.customerName) {
      nameInput.value = this.customerName;
      console.log("ProductReviews: Name auto-filled:", this.customerName);
    } else {
      console.log("ProductReviews: Could not auto-fill name");
    }

    if (emailInput && this.customerEmail) {
      emailInput.value = this.customerEmail;
      console.log("ProductReviews: Email auto-filled:", this.customerEmail);
    } else {
      console.log("ProductReviews: Could not auto-fill email");
    }
  }

  openLoginModal() {
    const loginModal = document.getElementById("login-modal");
    if (loginModal) {
      loginModal.style.display = "flex";
    }
  }

  closeLoginModal() {
    const loginModal = document.getElementById("login-modal");
    if (loginModal) {
      loginModal.style.display = "none";
    }
  }

  setupRatingInput() {
    const ratingInput = document.getElementById("rating-input");
    const reviewRating = document.getElementById("review-rating");

    if (!ratingInput || !reviewRating) return;

    ratingInput.querySelectorAll(".star").forEach((star) => {
      star.addEventListener("click", () => {
        const rating = star.dataset.rating;
        reviewRating.value = rating;
        this.updateStarDisplay(rating);
      });

      star.addEventListener("mouseover", () => {
        const rating = star.dataset.rating;
        this.highlightStars(rating);
      });

      star.addEventListener("mouseout", () => {
        const currentRating = reviewRating.value;
        this.highlightStars(currentRating);
      });
    });
  }

  updateStarDisplay(rating) {
    this.highlightStars(rating);
  }

  highlightStars(rating) {
    const ratingInput = document.getElementById("rating-input");
    if (!ratingInput) return;

    ratingInput.querySelectorAll(".star").forEach((star) => {
      const starRating = parseInt(star.dataset.rating);
      if (starRating <= rating) {
        star.classList.add("active");
      } else {
        star.classList.remove("active");
      }
    });
  }

  updateCharCount(value) {
    const charCount = document.getElementById("char-count");
    if (charCount) {
      const count = value.length;
      charCount.textContent = `${count} / 20 minimum`;
      if (count >= 20) {
        charCount.style.color = "#28a745";
      } else {
        charCount.style.color = "#666";
      }
    }
  }

  openModal() {
    const reviewModal = document.getElementById("review-modal");
    if (reviewModal) {
      reviewModal.style.display = "flex";
    }
  }

  closeModal() {
    const reviewModal = document.getElementById("review-modal");
    if (reviewModal) {
      reviewModal.style.display = "none";
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    const reviewForm = document.getElementById("review-form");
    if (!reviewForm) return;

    const formData = new FormData(reviewForm);
    const content = formData.get("content");

    // Validate content length
    if (content.length < 20) {
      alert("Review must be at least 20 characters long");
      return;
    }

    this.applyStoredCustomerSession();

    const reviewData = {
      shop: this.shop,
      productId: String(this.productId),
      productHandle: this.productHandle || this._fallbackProductHandle(),
      productTitle: this.productTitle || this._fallbackProductTitle(),
      customerId: this.customerId || undefined,
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      rating: parseInt(formData.get("rating"), 10),
      title: formData.get("title") || undefined,
      content: content,
      recommend: true,
    };

    if (reviewData.rating === 0) {
      alert("Please select a rating");
      return;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewData),
      });

      if (response.ok) {
        alert("Review submitted successfully!");
        this.closeModal();
        reviewForm.reset();
        const reviewRating = document.getElementById("review-rating");
        if (reviewRating) {
          reviewRating.value = 0;
          this.updateStarDisplay(0);
        }
        this.updateCharCount("");
        this.loadReviews(); // Reload reviews
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);

        // Show detailed error message
        let errorMessage = "Failed to submit review. Please try again.";
        if (errorData.details && Array.isArray(errorData.details)) {
          const errors = errorData.details
            .map((detail) => detail.message)
            .join("\n");
          errorMessage = `Validation errors:\n${errors}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// Auto-initialize if product data is available
document.addEventListener("DOMContentLoaded", () => {
  console.log("ProductReviews: DOMContentLoaded fired");
  const productElement = document.querySelector("[data-product-id]");
  console.log(
    "ProductReviews: Found product element on DOMContentLoaded",
    productElement,
  );

  if (productElement) {
    console.log("ProductReviews: Initializing ProductReviews");
    new ProductReviews();
  } else {
    console.log(
      "ProductReviews: Product element not found, waiting for window load",
    );
    // Try again after window load
    window.addEventListener("load", () => {
      console.log("ProductReviews: Window load fired");
      const productElementAfterLoad =
        document.querySelector("[data-product-id]");
      console.log(
        "ProductReviews: Found product element after window load",
        productElementAfterLoad,
      );
      if (productElementAfterLoad) {
        new ProductReviews();
      } else {
        console.error(
          "ProductReviews: Still cannot find product element after window load",
        );
      }
    });
  }
});

// Export for manual initialization
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProductReviews;
}
