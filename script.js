const authTabs = document.querySelectorAll("[data-auth-tab]");
const authPanels = document.querySelectorAll("[data-auth-panel]");
const openAuthButtons = document.querySelectorAll("[data-open-auth]");
const openCartButtons = document.querySelectorAll("[data-open-cart]");
const openQuizButtons = document.querySelectorAll("[data-open-quiz]");
const openRitualButtons = document.querySelectorAll("[data-open-rituals]");
const cartCount = document.querySelectorAll("[data-cart-count]");
const cartItemsEl = document.querySelector("[data-cart-items]");
const cartEmptyEl = document.querySelector("[data-cart-empty]");
const subtotalEl = document.querySelector("[data-subtotal]");
const shippingEl = document.querySelector("[data-shipping]");
const discountEl = document.querySelector("[data-discount]");
const taxEl = document.querySelector("[data-tax]");
const totalEl = document.querySelector("[data-total]");
const payButton = document.querySelector("[data-pay-button]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const checkoutStatus = document.querySelector("[data-checkout-status]");
const accountChip = document.querySelector("[data-account-chip]");
const accountMessage = document.querySelector("[data-account-message]");
const signOutButton = document.querySelector("[data-signout]");
const loginForm = document.querySelector("[data-login-form]");
const registerForm = document.querySelector("[data-register-form]");
const loginStatus = document.querySelector("[data-login-status]");
const registerStatus = document.querySelector("[data-register-status]");
const newsletterForm = document.querySelector("[data-newsletter-form]");
const newsletterStatus = document.querySelector("[data-newsletter-status]");
const quizForm = document.querySelector("[data-quiz-form]");
const quizResult = document.querySelector("[data-quiz-result]");
const questionForm = document.querySelector("[data-question-form]");
const questionStatus = document.querySelector("[data-question-status]");
const questionNameInput = document.querySelector("[data-question-name]");
const questionEmailInput = document.querySelector("[data-question-email]");
const questionSubmitButton = document.querySelector("[data-question-submit]");
const promoInput = document.querySelector("[data-promo-input]");
const paymentRadios = document.querySelectorAll("input[name='payment']");
const cardFields = document.querySelector("[data-card-fields]");
const cardNumberInput = document.querySelector("[data-card-number]");
const cardExpiryInput = document.querySelector("[data-card-expiry]");
const cardCvcInput = document.querySelector("[data-card-cvc]");
const cardBrand = document.querySelector("[data-card-brand]");
const cardNumberError = document.querySelector("[data-card-number-error]");
const cardExpiryError = document.querySelector("[data-card-expiry-error]");
const cardCvcError = document.querySelector("[data-card-cvc-error]");
const billingSame = document.querySelector("[data-billing-same]");
const billingFields = document.querySelector("[data-billing-fields]");
const altPaymentNote = document.querySelector("[data-alt-payment-note]");
const expressButtons = document.querySelectorAll("[data-express]");

const STORAGE = {
  cart: "mariko_cart",
  user: "mariko_user",
  session: "mariko_session",
  favorites: "mariko_favorites",
  questionLastSent: "mariko_question_last_sent",
};

const QUESTION_COOLDOWN_MS = 60000;

const EMAIL_SETTINGS = {
  serviceId: "YOUR_SERVICE_ID",
  orderTemplateId: "YOUR_ORDER_TEMPLATE_ID",
  questionTemplateId: "YOUR_QUESTION_TEMPLATE_ID",
  publicKey: "YOUR_PUBLIC_KEY",
  toEmail: "demetree95@gmail.com",
};

const isPlaceholderValue = (value) => !value || value.startsWith("YOUR_");

const isCoreEmailConfigured = () =>
  !isPlaceholderValue(EMAIL_SETTINGS.serviceId) &&
  !isPlaceholderValue(EMAIL_SETTINGS.publicKey);

const isOrderEmailConfigured = () =>
  isCoreEmailConfigured() && !isPlaceholderValue(EMAIL_SETTINGS.orderTemplateId);

const isQuestionEmailConfigured = () =>
  isCoreEmailConfigured() && !isPlaceholderValue(EMAIL_SETTINGS.questionTemplateId);

let emailInitialized = false;

const ensureEmailInit = () => {
  if (emailInitialized) return true;
  if (!window.emailjs || !isCoreEmailConfigured()) return false;
  emailjs.init({ publicKey: EMAIL_SETTINGS.publicKey });
  emailInitialized = true;
  return true;
};

const sendEmail = (templateId, params) => {
  if (isPlaceholderValue(templateId)) {
    return Promise.reject(new Error("Email template not configured"));
  }
  if (!ensureEmailInit()) {
    return Promise.reject(new Error("EmailJS not configured"));
  }
  return emailjs.send(EMAIL_SETTINGS.serviceId, templateId, params);
};

const buildMailtoLink = (subject, body) => {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${EMAIL_SETTINGS.toEmail}?subject=${encodedSubject}&body=${encodedBody}`;
};


const getQuestionCooldownRemaining = () => {
  const lastSent = loadJSON(STORAGE.questionLastSent, 0);
  if (!lastSent) return 0;
  const remaining = QUESTION_COOLDOWN_MS - (Date.now() - lastSent);
  return Math.max(0, remaining);
};

const syncQuestionFields = () => {
  if (!questionForm) return;
  if (state.session) {
    if (questionNameInput) {
      questionNameInput.readOnly = false;
    }
    if (questionEmailInput) {
      if (!questionEmailInput.value) {
        questionEmailInput.value = state.session.email || "";
      }
      questionEmailInput.readOnly = false;
    }
  } else {
    if (questionNameInput) {
      questionNameInput.readOnly = false;
    }
    if (questionEmailInput) {
      questionEmailInput.value = "";
      questionEmailInput.readOnly = false;
    }
  }
};

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const formatCurrency = (value) => `$${value.toFixed(2)}`;

const products = {};

document.querySelectorAll("[data-product]").forEach((card) => {
  const id = card.dataset.id;
  if (!id) return;
  products[id] = {
    id,
    name: card.dataset.name || card.querySelector("h3")?.textContent?.trim() || "",
    price: Number(card.dataset.price || 0),
  };
});

const state = {
  cart: loadJSON(STORAGE.cart, {}),
  discountRate: 0,
  favorites: new Set(loadJSON(STORAGE.favorites, [])),
  user: loadJSON(STORAGE.user, null),
  session: loadJSON(STORAGE.session, null),
};

const setStatus = (el, message, type) => {
  if (!el) return;
  el.textContent = message;
  el.dataset.state = type || "";
};

const CARD_BRANDS = [
  { name: "visa", pattern: /^4/, lengths: [13, 16, 19], cvc: 3 },
  { name: "mastercard", pattern: /^(5[1-5]|2[2-7])/, lengths: [16], cvc: 3 },
  { name: "amex", pattern: /^3[47]/, lengths: [15], cvc: 4 },
  { name: "discover", pattern: /^(6011|65|64[4-9]|622)/, lengths: [16, 19], cvc: 3 },
  { name: "jcb", pattern: /^35/, lengths: [16, 19], cvc: 3 },
];

const getCardBrand = (digits) => CARD_BRANDS.find((brand) => brand.pattern.test(digits)) || null;

const luhnCheck = (digits) => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let num = Number(digits[i]);
    if (shouldDouble) {
      num *= 2;
      if (num > 9) num -= 9;
    }
    sum += num;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const formatCardNumber = (digits, brand) => {
  const maxLength = brand?.lengths ? Math.max(...brand.lengths) : 19;
  const trimmed = digits.slice(0, maxLength);
  const groups = brand?.name === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const parts = [];
  let index = 0;
  groups.forEach((size) => {
    if (index >= trimmed.length) return;
    parts.push(trimmed.slice(index, index + size));
    index += size;
  });
  return parts.join(" ").trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const updateCardBrand = (brand) => {
  if (!cardBrand) return;
  if (!brand) {
    cardBrand.textContent = "Card";
    cardBrand.removeAttribute("data-brand");
    return;
  }
  const labelMap = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    jcb: "JCB",
  };
  cardBrand.textContent = labelMap[brand.name] || "Card";
  cardBrand.dataset.brand = brand.name;
};

const setFieldError = (input, errorEl, message) => {
  if (!input || !errorEl) return;
  if (message) {
    input.classList.add("invalid");
    errorEl.textContent = message;
  } else {
    input.classList.remove("invalid");
    errorEl.textContent = "";
  }
};

const validateCardNumber = (digits, brand) => {
  if (!digits) {
    return { valid: false, message: "Card number is required." };
  }
  if (brand && !brand.lengths.includes(digits.length)) {
    return { valid: false, message: "Card number length is invalid." };
  }
  if (digits.length < 12) {
    return { valid: false, message: "Card number is too short." };
  }
  if (!luhnCheck(digits)) {
    return { valid: false, message: "Card number looks invalid." };
  }
  return { valid: true, message: "" };
};

const validateExpiry = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) {
    return { valid: false, message: "Enter MM/YY." };
  }
  const month = Number(digits.slice(0, 2));
  const year = Number(digits.slice(2, 4));
  if (month < 1 || month > 12) {
    return { valid: false, message: "Month must be between 01 and 12." };
  }
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valid: false, message: "Card is expired." };
  }
  return { valid: true, message: "" };
};

const validateCvc = (value, brand) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return { valid: false, message: "CVC is required." };
  }
  const expected = brand?.cvc;
  if (expected && digits.length !== expected) {
    return { valid: false, message: `CVC must be ${expected} digits.` };
  }
  if (!expected && (digits.length < 3 || digits.length > 4)) {
    return { valid: false, message: "CVC must be 3 or 4 digits." };
  }
  return { valid: true, message: "" };
};

const clearCardErrors = () => {
  setFieldError(cardNumberInput, cardNumberError, "");
  setFieldError(cardExpiryInput, cardExpiryError, "");
  setFieldError(cardCvcInput, cardCvcError, "");
  updateCardBrand(null);
};

const setAuthMode = (mode) => {
  authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authTab === mode);
  });
  authPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.authPanel === mode);
  });
};

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
});

const scrollToSection = (selector) => {
  const target = document.querySelector(selector);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth" });
  target.classList.add("pulse");
  setTimeout(() => target.classList.remove("pulse"), 1200);
};

openAuthButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode("login");
    scrollToSection("#account");
  });
});

openCartButtons.forEach((button) => {
  button.addEventListener("click", () => scrollToSection("#cart"));
});

openQuizButtons.forEach((button) => {
  button.addEventListener("click", () => scrollToSection("#quiz"));
});

openRitualButtons.forEach((button) => {
  button.addEventListener("click", () => scrollToSection("#quiz"));
});

const updateCartCount = () => {
  if (!cartCount || cartCount.length === 0) return;
  const count = Object.values(state.cart).reduce((sum, item) => sum + item.qty, 0);
  cartCount.forEach((countEl) => {
    countEl.textContent = count.toString();
  });
};

const calculateTotals = () => {
  const subtotal = Object.values(state.cart).reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = subtotal * state.discountRate;
  const shipping = subtotal === 0 || subtotal >= 75 ? 0 : 6;
  const tax = subtotal > 0 ? (subtotal - discount) * 0.0875 : 0;
  const total = subtotal - discount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
};

const updateSummary = () => {
  const { subtotal, discount, shipping, tax, total } = calculateTotals();
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (discountEl) discountEl.textContent = `-${formatCurrency(discount)}`;
  if (shippingEl) shippingEl.textContent = formatCurrency(shipping);
  if (taxEl) taxEl.textContent = formatCurrency(tax);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (payButton) payButton.textContent = `Pay ${formatCurrency(total)}`;
};

const renderCart = () => {
  if (!cartItemsEl || !cartEmptyEl) return;
  const items = Object.values(state.cart);
  cartItemsEl.innerHTML = "";

  if (items.length === 0) {
    cartEmptyEl.classList.add("active");
  } else {
    cartEmptyEl.classList.remove("active");
    items.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";
      itemEl.dataset.id = item.id;
      itemEl.innerHTML = `
        <div>
          <h4>${item.name}</h4>
          <p>${formatCurrency(item.price)} each</p>
        </div>
        <div class="cart-row">
          <div class="qty-control">
            <button type="button" data-action="decrease">-</button>
            <span>${item.qty}</span>
            <button type="button" data-action="increase">+</button>
          </div>
          <span class="price">${formatCurrency(item.price * item.qty)}</span>
          <button type="button" class="ghost small" data-action="remove">Remove</button>
        </div>
      `;
      cartItemsEl.appendChild(itemEl);
    });
  }

  updateCartCount();
  updateSummary();
};

const addToCart = (id) => {
  const product = products[id];
  if (!product) return;
  if (state.cart[id]) {
    state.cart[id].qty += 1;
  } else {
    state.cart[id] = { ...product, qty: 1 };
  }
  saveJSON(STORAGE.cart, state.cart);
  renderCart();
};

const adjustQuantity = (id, delta) => {
  if (!state.cart[id]) return;
  state.cart[id].qty += delta;
  if (state.cart[id].qty <= 0) {
    delete state.cart[id];
  }
  saveJSON(STORAGE.cart, state.cart);
  renderCart();
};

const removeFromCart = (id) => {
  delete state.cart[id];
  saveJSON(STORAGE.cart, state.cart);
  renderCart();
};

if (cartItemsEl) {
  cartItemsEl.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const itemEl = actionButton.closest(".cart-item");
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    if (actionButton.dataset.action === "increase") {
      adjustQuantity(id, 1);
    }
    if (actionButton.dataset.action === "decrease") {
      adjustQuantity(id, -1);
    }
    if (actionButton.dataset.action === "remove") {
      removeFromCart(id);
    }
  });
}

const highlightButton = (button) => {
  button.classList.add("added");
  setTimeout(() => button.classList.remove("added"), 800);
};

const handleAddClick = (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const id = button.dataset.productId;
  if (!id) return;
  addToCart(id);
  highlightButton(button);
};

document.addEventListener("click", handleAddClick);

const updateFavorites = () => {
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    const card = button.closest("[data-product]");
    const id = card?.dataset.id;
    if (id && state.favorites.has(id)) {
      button.classList.add("active");
      button.textContent = "Saved";
    } else {
      button.classList.remove("active");
      button.textContent = "Save";
    }
  });
};

const toggleFavorite = (button) => {
  const card = button.closest("[data-product]");
  const id = card?.dataset.id;
  if (!id) return;
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveJSON(STORAGE.favorites, Array.from(state.favorites));
  updateFavorites();
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-favorite]");
  if (!button) return;
  toggleFavorite(button);
});

const renderAccount = () => {
  if (!accountChip || !accountMessage || !signOutButton) return;
  if (state.session) {
    accountChip.textContent = `Hi, ${state.session.name.split(" ")[0]}`;
    accountMessage.textContent = `Signed in as ${state.session.email}.`;
    signOutButton.hidden = false;
  } else {
    accountChip.textContent = "Guest";
    accountMessage.textContent = "Not signed in yet.";
    signOutButton.hidden = true;
  }
};

if (signOutButton) {
  signOutButton.addEventListener("click", () => {
    state.session = null;
    saveJSON(STORAGE.session, null);
    renderAccount();
    syncQuestionFields();
    setStatus(loginStatus, "Signed out.", "success");
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();

    if (password.length < 8) {
      setStatus(registerStatus, "Password must be at least 8 characters.", "error");
      return;
    }

    state.user = { name, email, password };
    state.session = { name, email };
    saveJSON(STORAGE.user, state.user);
    saveJSON(STORAGE.session, state.session);
    registerForm.reset();
    setStatus(registerStatus, "Account created! You are signed in.", "success");
    renderAccount();
    syncCheckoutFields();
    syncQuestionFields();
    setAuthMode("login");
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();

    if (!state.user) {
      setStatus(loginStatus, "No account found. Please register first.", "error");
      return;
    }

    if (email !== state.user.email || password !== state.user.password) {
      setStatus(loginStatus, "Email or password is incorrect.", "error");
      return;
    }

    state.session = { name: state.user.name, email: state.user.email };
    saveJSON(STORAGE.session, state.session);
    loginForm.reset();
    setStatus(loginStatus, "Welcome back!", "success");
    renderAccount();
    syncCheckoutFields();
    syncQuestionFields();
  });
}

const syncCheckoutFields = () => {
  if (!checkoutForm || !state.session) return;
  const nameField = checkoutForm.querySelector("input[name='fullname']");
  const emailField = checkoutForm.querySelector("input[name='email']");
  if (nameField && !nameField.value) nameField.value = state.session.name;
  if (emailField && !emailField.value) emailField.value = state.session.email;
};

const setBillingFields = (enabled) => {
  if (!billingFields) return;
  billingFields.classList.toggle("hidden", !enabled);
  billingFields.querySelectorAll("input").forEach((input) => {
    input.disabled = !enabled;
  });
};

const setCardFields = (enabled) => {
  if (!cardFields) return;
  cardFields.classList.toggle("hidden", !enabled);
  cardFields.querySelectorAll("input").forEach((input) => {
    if (input.closest("[data-billing-fields]")) return;
    input.disabled = !enabled;
  });
  if (!enabled) {
    clearCardErrors();
  }
  if (billingSame) {
    setBillingFields(enabled && !billingSame.checked);
  } else if (billingFields) {
    setBillingFields(false);
  }
};

const updatePaymentUi = (method) => {
  const isCard = method === "card";
  setCardFields(isCard);
  if (!altPaymentNote) return;
  if (isCard) {
    altPaymentNote.textContent = "";
    return;
  }
  const noteMap = {
    paypal: "You will be redirected to PayPal to complete your purchase.",
    apple: "Approve with Touch ID or Face ID on your Apple device.",
    paylater: "Split your total into 4 interest-free payments at checkout.",
  };
  altPaymentNote.textContent = noteMap[method] || "You will be redirected to complete payment.";
};

paymentRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    updatePaymentUi(radio.value);
  });
});

const initialPayment = document.querySelector("input[name='payment']:checked")?.value || "card";
updatePaymentUi(initialPayment);

if (billingSame) {
  billingSame.addEventListener("change", () => {
    setBillingFields(!billingSame.checked);
  });
}

if (expressButtons.length) {
  expressButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const labelMap = {
        shop: "Shop Pay",
        paypal: "PayPal",
        apple: "Apple Pay",
        gpay: "Google Pay",
      };
      const label = labelMap[button.dataset.express] || "Express checkout";
      setStatus(checkoutStatus, `${label} is in demo mode here. Use card checkout below.`, "error");
      if (altPaymentNote) {
        altPaymentNote.textContent = `${label} is unavailable in this demo checkout.`;
      }
    });
  });
}

if (cardNumberInput) {
  cardNumberInput.addEventListener("input", () => {
    const digits = cardNumberInput.value.replace(/\D/g, "");
    const brand = getCardBrand(digits);
    cardNumberInput.value = formatCardNumber(digits, brand);
    updateCardBrand(brand);
    if (cardNumberError?.textContent) {
      const result = validateCardNumber(digits, brand);
      setFieldError(cardNumberInput, cardNumberError, result.valid ? "" : result.message);
    }
  });

  cardNumberInput.addEventListener("blur", () => {
    const digits = cardNumberInput.value.replace(/\D/g, "");
    const brand = getCardBrand(digits);
    const result = validateCardNumber(digits, brand);
    setFieldError(cardNumberInput, cardNumberError, result.valid ? "" : result.message);
  });
}

if (cardExpiryInput) {
  cardExpiryInput.addEventListener("input", () => {
    cardExpiryInput.value = formatExpiry(cardExpiryInput.value);
    if (cardExpiryError?.textContent) {
      const result = validateExpiry(cardExpiryInput.value);
      setFieldError(cardExpiryInput, cardExpiryError, result.valid ? "" : result.message);
    }
  });

  cardExpiryInput.addEventListener("blur", () => {
    const result = validateExpiry(cardExpiryInput.value);
    setFieldError(cardExpiryInput, cardExpiryError, result.valid ? "" : result.message);
  });
}

if (cardCvcInput) {
  cardCvcInput.addEventListener("input", () => {
    const digits = cardCvcInput.value.replace(/\D/g, "").slice(0, 4);
    cardCvcInput.value = digits;
    if (cardCvcError?.textContent) {
      const brand = getCardBrand(cardNumberInput?.value.replace(/\D/g, "") || "");
      const result = validateCvc(digits, brand);
      setFieldError(cardCvcInput, cardCvcError, result.valid ? "" : result.message);
    }
  });

  cardCvcInput.addEventListener("blur", () => {
    const brand = getCardBrand(cardNumberInput?.value.replace(/\D/g, "") || "");
    const result = validateCvc(cardCvcInput.value, brand);
    setFieldError(cardCvcInput, cardCvcError, result.valid ? "" : result.message);
  });
}

if (checkoutForm) {
  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const totals = calculateTotals();
    if (totals.subtotal <= 0) {
      setStatus(checkoutStatus, "Your cart is empty. Add items to checkout.", "error");
      return;
    }

    const paymentMethod = checkoutForm.querySelector("input[name='payment']:checked")?.value || "card";
    if (paymentMethod === "card") {
      const digits = cardNumberInput?.value.replace(/\D/g, "") || "";
      const brand = getCardBrand(digits);
      const numberResult = validateCardNumber(digits, brand);
      const expiryResult = validateExpiry(cardExpiryInput?.value || "");
      const cvcResult = validateCvc(cardCvcInput?.value || "", brand);
      setFieldError(cardNumberInput, cardNumberError, numberResult.valid ? "" : numberResult.message);
      setFieldError(cardExpiryInput, cardExpiryError, expiryResult.valid ? "" : expiryResult.message);
      setFieldError(cardCvcInput, cardCvcError, cvcResult.valid ? "" : cvcResult.message);
      if (!numberResult.valid || !expiryResult.valid || !cvcResult.valid) {
        setStatus(checkoutStatus, "Please fix the card details highlighted below.", "error");
        return;
      }
    }
    const orderId = Math.floor(Math.random() * 90000 + 10000);
    const labelMap = { card: "card", paypal: "PayPal", apple: "Apple Pay", paylater: "Pay in 4" };
    const label = labelMap[paymentMethod] || paymentMethod;

    const formData = new FormData(checkoutForm);
    const customerName = (formData.get("fullname") || "").toString().trim();
    const customerEmail = (formData.get("email") || "").toString().trim();
    const customerPhone = (formData.get("phone") || "").toString().trim();
    const address = (formData.get("address") || "").toString().trim();
    const city = (formData.get("city") || "").toString().trim();
    const region = (formData.get("state") || "").toString().trim();
    const postal = (formData.get("postal") || "").toString().trim();
    const country = (formData.get("country") || "").toString().trim();

    const itemsList = Object.values(state.cart)
      .map((item) => `${item.name} x${item.qty} (${formatCurrency(item.price)})`)
      .join(", ");

    const baseMessage = `Payment authorized via ${label}. Order #${orderId} confirmed!`;
    setStatus(checkoutStatus, `${baseMessage} Sending confirmation email...`, "success");

    if (!isOrderEmailConfigured()) {
      setStatus(
        checkoutStatus,
        `${baseMessage} Email sending is not configured. Add EmailJS keys in script.js.`,
        "error"
      );
    } else {
      const emailParams = {
        to_email: EMAIL_SETTINGS.toEmail,
        order_id: orderId,
        payment_method: label,
        customer_name: customerName || "Guest",
        customer_email: customerEmail || "Not provided",
        customer_phone: customerPhone || "Not provided",
        shipping_address: `${address}, ${city}, ${region} ${postal}, ${country}`,
        items: itemsList || "No items listed",
        subtotal: formatCurrency(totals.subtotal),
        discount: formatCurrency(totals.discount),
        shipping: formatCurrency(totals.shipping),
        tax: formatCurrency(totals.tax),
        total: formatCurrency(totals.total),
      };

      sendEmail(EMAIL_SETTINGS.orderTemplateId, emailParams)
        .then(() => {
          setStatus(checkoutStatus, `${baseMessage} Email sent to our team.`, "success");
        })
        .catch(() => {
          setStatus(
            checkoutStatus,
            `${baseMessage} Email could not be sent (check EmailJS settings).`,
            "error"
          );
        });
    }

    state.cart = {};
    state.discountRate = 0;
    saveJSON(STORAGE.cart, state.cart);
    renderCart();
    checkoutForm.reset();
    updatePaymentUi("card");
    clearCardErrors();
  });
}

if (promoInput) {
  promoInput.addEventListener("input", () => {
    const code = promoInput.value.trim().toUpperCase();
    if (!code) {
      state.discountRate = 0;
      setStatus(checkoutStatus, "", "");
    } else if (code === "GLOW10") {
      state.discountRate = 0.1;
      setStatus(checkoutStatus, "Promo applied: 10% off.", "success");
    } else {
      state.discountRate = 0;
      setStatus(checkoutStatus, "Promo code not recognized.", "error");
    }
    updateSummary();
  });
}

if (newsletterForm) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    newsletterForm.reset();
    setStatus(newsletterStatus, "You are in! Welcome to the glow list.", "success");
  });
}

if (questionForm) {
  questionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus(questionStatus, "", "");
    const formData = new FormData(questionForm);
    let name = (formData.get("sender_name") || "").toString().trim();
    let email = (formData.get("sender_email") || "").toString().trim();
    const question = (formData.get("question") || "").toString().trim();

    if (!state.session) {
      setStatus(questionStatus, "", "");
      return;
    }

    if (!name && state.session.name) {
      name = state.session.name;
      if (questionNameInput) questionNameInput.value = name;
    }
    if (!email && state.session.email) {
      email = state.session.email;
      if (questionEmailInput) questionEmailInput.value = email;
    }

    if (state.session.email && email.toLowerCase() !== state.session.email.toLowerCase()) {
      setStatus(
        questionStatus,
        "Sender email must match your registered account email.",
        "error"
      );
      return;
    }

    const remainingMs = getQuestionCooldownRemaining();
    if (remainingMs > 0) {
      const seconds = Math.ceil(remainingMs / 1000);
      setStatus(
        questionStatus,
        `Please wait ${seconds}s before sending another question.`,
        "error"
      );
      return;
    }

    if (!ensureEmailInit()) {
      setStatus(questionStatus, "", "");
      return;
    }

    setStatus(questionStatus, "Sending your question...", "success");

    const emailParams = {
      to_email: EMAIL_SETTINGS.toEmail,
      from_name: name,
      from_email: email,
      question: question,
      subject: `Question from ${name || "Guest"} (${email || "no email"})`,
    };

    sendEmail(EMAIL_SETTINGS.questionTemplateId, emailParams)
      .then(() => {
        setStatus(questionStatus, "Thanks! Your question was sent.", "success");
        questionForm.reset();
        saveJSON(STORAGE.questionLastSent, Date.now());
        syncQuestionFields();
      })
      .catch(() => {
        setStatus(questionStatus, "Message failed to send. Please try again.", "error");
      });
  });
}

const formatList = (items) => {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const QUIZ_LABELS = {
  skin: {
    dry: "Dry",
    oily: "Oily",
    combo: "Combination",
  },
  goal: {
    glow: "Glow + tone",
    calm: "Calm redness",
    hydrate: "Deep hydration",
  },
  frequency: {
    daily: "Daily",
    few: "A few times a week",
  },
};

const renderQuizResult = () => {
  if (!quizForm || !quizResult) return;
  const formData = new FormData(quizForm);
  const skinType = formData.get("skin-type");
  const goal = formData.get("goal");
  const frequency = formData.get("frequency");

  const ritualMap = {
    dry: {
      badge: "Dry skin",
      title: "Comforting moisture ritual",
      steps: [
        { label: "Cleanse", product: "Silk Jelly Cleanser" },
        { label: "Hydrate", product: "Radiance Dew Cream" },
        { label: "Seal", product: "Moonlight Barrier Cream" },
      ],
    },
    oily: {
      badge: "Oily skin",
      title: "Featherlight balance ritual",
      steps: [
        { label: "Cleanse", product: "Silk Jelly Cleanser" },
        { label: "Treat", product: "Glow Veil Serum" },
        { label: "Finish", product: "Peptide Eye Veil" },
      ],
    },
    combo: {
      badge: "Combo skin",
      title: "Balanced glow ritual",
      steps: [
        { label: "Cleanse", product: "Calm Cloud Cleanser" },
        { label: "Treat", product: "Glow Veil Serum" },
        { label: "Hydrate", product: "Radiance Dew Cream" },
      ],
    },
  };

  const goalMap = {
    glow: "Lean on Glow Veil Serum for brightening.",
    calm: "Add Barrier Reset Trio to soothe redness.",
    hydrate: "Layer Moonlight Barrier Cream at night.",
  };

  const frequencyText =
    frequency === "daily"
      ? "Use morning and night for best results."
      : "Use 3-4 times per week and adjust as needed.";

  const missing = [];
  if (!skinType) missing.push("skin type");
  if (!goal) missing.push("goal");
  if (!frequency) missing.push("frequency");

  if (missing.length === 3) {
    quizResult.dataset.state = "empty";
    quizResult.innerHTML = `
      <p class="ritual-kicker">Your ritual will appear here.</p>
      <p class="ritual-empty">Complete the quiz to get a personalized routine.</p>
    `;
    return;
  }

  const selectionChips = [];
  if (skinType) selectionChips.push(`Skin type: ${QUIZ_LABELS.skin[skinType]}`);
  if (goal) selectionChips.push(`Goal: ${QUIZ_LABELS.goal[goal]}`);
  if (frequency) selectionChips.push(`Frequency: ${QUIZ_LABELS.frequency[frequency]}`);

  if (missing.length > 0) {
    quizResult.dataset.state = "partial";
    quizResult.innerHTML = `
      <div class="ritual-header">
        <p class="ritual-kicker">Your ritual</p>
        <span class="ritual-badge">Almost there</span>
      </div>
      <h3 class="ritual-title">You're building a custom ritual.</h3>
      <div class="ritual-summary">
        ${selectionChips.map((chip) => `<span class="ritual-chip">${chip}</span>`).join("")}
      </div>
      <p class="ritual-empty">Choose ${formatList(missing)} to reveal your full ritual.</p>
    `;
    return;
  }

  const ritual = ritualMap[skinType] || ritualMap.dry;
  quizResult.dataset.state = "ready";
  quizResult.innerHTML = `
    <div class="ritual-header">
      <p class="ritual-kicker">Your ritual</p>
      <span class="ritual-badge">${ritual.badge}</span>
    </div>
    <h3 class="ritual-title">${ritual.title}</h3>
    <ul class="ritual-steps">
      ${ritual.steps
        .map(
          (step) => `
            <li>
              <span>${step.label}</span>
              <strong>${step.product}</strong>
            </li>
          `
        )
        .join("")}
    </ul>
    <div class="ritual-notes">
      <p><strong>Focus:</strong> ${goalMap[goal]}</p>
      <p><strong>Rhythm:</strong> ${frequencyText}</p>
    </div>
  `;
};

if (quizForm) {
  quizForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderQuizResult();
  });
  quizForm.addEventListener("change", renderQuizResult);
  renderQuizResult();
}

const ingredientTabs = document.querySelectorAll("[data-ingredient-tab]");
const ingredientPanels = document.querySelectorAll("[data-ingredient-panel]");

ingredientTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    ingredientTabs.forEach((btn) => btn.classList.remove("active"));
    ingredientPanels.forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document
      .querySelector(`[data-ingredient-panel='${tab.dataset.ingredientTab}']`)
      ?.classList.add("active");
  });
});

const countdownEls = document.querySelectorAll("[data-countdown]");
if (countdownEls.length) {
  const dropDate = new Date();
  dropDate.setDate(dropDate.getDate() + 5);
  dropDate.setHours(9, 0, 0, 0);

  const updateCountdown = () => {
    const now = new Date();
    const diff = dropDate - now;
    if (diff <= 0) {
      countdownEls.forEach((el) => (el.textContent = "Live now"));
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    countdownEls.forEach((el) => (el.textContent = `${days}d ${hours}h ${minutes}m`));
  };

  updateCountdown();
  setInterval(updateCountdown, 60000);
}

const revealObserver = new IntersectionObserver(
  (entries, watch) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        watch.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll("[data-reveal]").forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index * 0.06, 0.4)}s`;
  revealObserver.observe(el);
});

const progressObserver = new IntersectionObserver(
  (entries, watch) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const value = Number(entry.target.dataset.progress || 0);
        entry.target.style.width = `${value}%`;
        watch.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);

document.querySelectorAll("[data-progress]").forEach((el) => progressObserver.observe(el));

updateFavorites();
renderCart();
renderAccount();
syncCheckoutFields();
syncQuestionFields();
