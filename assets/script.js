(function(a,b,c){var d=a[c];if(d)return d;b[c]=d=function(){d.q.push(arguments)};d.q=d.q||[];a[c+"Async"]=true})(window,window.analytics=window.analytics||{},"analytics.js");
// Segment analytics snippet
!function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var e=0;e<analytics.methods.length;e++){var key=analytics.methods[e];analytics[key]=analytics.factory(key)}analytics.load=function(key,options){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://cdn.segment.com/analytics.js/v1/"+key+"/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=options};analytics.SNIPPET_VERSION="4.15.3";
analytics.load("YOUR_WRITE_KEY"); // Replace with your Segment Write Key
analytics.page();
}}();

// API base URL - change this to your Render URL when deployed
const API_BASE_URL = 'https://mineral-shop.onrender.com';

// Products array - will be populated from backend
let products = [];

// Load products from backend
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    if (response.ok) {
      products = await response.json();
      console.log('Products loaded from backend:', products);
    } else {
      console.error('Failed to load products from backend');
    }
  } catch (error) {
    console.error('Error loading products:', error);
    // Fallback to default products if backend is not available
    products = [
      { id: 1, name: "Opal Crystal", price: 50.00, image: "https://mineral-shop.onrender.com/images/mineral1.png", description: "A stunning clear quartz crystal, perfect for collectors." },
      { id: 2, name: "Lava Geode", price: 70.00, image: "https://mineral-shop.onrender.com/images/mineral2.png", description: "A vibrant amethyst geode with deep purple hues." },
      { id: 3, name: "Ocean Quartz", price: 30.00, image: "https://mineral-shop.onrender.com/images/mineral3.png", description: "A soft pink rose quartz, symbolizing love." },
      { id: 4, name: "Thunder Cluster", price: 40.00, image: "https://mineral-shop.onrender.com/images/mineral4.png", description: "A bright citrine cluster, radiating positivity." },
      { id: 5, name: "Moss Stone", price: 90.00, image: "https://mineral-shop.onrender.com/images/mineral5.png", description: "A sleek black obsidian stone, grounding and protective." }
    ];
  }
}

async function trackProductView(productId) {
  try {
    // Track locally
    let viewCounts = JSON.parse(localStorage.getItem("viewCounts") || "{}");
    viewCounts[productId] = (viewCounts[productId] || 0) + 1;
    localStorage.setItem("viewCounts", JSON.stringify(viewCounts));
    
    // Track on backend
    const username = localStorage.getItem("username") || "anonymous";
    const response = await fetch(`${API_BASE_URL}/api/view/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('View tracked on backend:', data);
    }
    
    analytics.track("Product Viewed", { productId: productId, viewCount: viewCounts[productId] });
  } catch (error) {
    console.error("Error tracking product view:", error);
  }
}

async function addToFavorites(productId) {
  try {
    const username = localStorage.getItem("username");
    if (!username) {
      alert("Please register to add favorites!");
      return;
    }
    
    // Add to backend
    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, productId })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.message === 'Added to favorites') {
        // Add to local storage as backup
        let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
        if (!favorites.includes(productId)) {
          favorites.push(productId);
          localStorage.setItem("favorites", JSON.stringify(favorites));
        }
        analytics.track("Added to Favorites", { productId: productId });
        alert("Added to favorites!");
      } else {
        alert(data.message);
      }
    } else {
      const errorData = await response.json();
      alert(errorData.message || "Failed to add to favorites");
    }
  } catch (error) {
    console.error("Error adding to favorites:", error);
    alert("Failed to add to favorites. Please try again.");
  }
}

async function addToCart(productId) {
  try {
    console.log(`addToCart called with productId: ${productId}`);
    const username = localStorage.getItem("username");
    if (!username) {
      showNotification("Please register to add items to cart!", "error");
      return;
    }
    
    // Add to local storage first for immediate feedback
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push(productId);
    localStorage.setItem("cart", JSON.stringify(cart));
    
    console.log(`Added product ${productId} to cart. New cart:`, cart);
    
    // Update cart count immediately
    updateCartCount();
    
    // Show success message
    showNotification("Added to cart!", "success");
    
    // Try to add to backend
    try {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, productId })
    });
    
    if (response.ok) {
        console.log("Successfully added to backend cart");
      
        // Track analytics
        try {
      analytics.track("Added to Cart", { productId: productId });
        } catch (analyticsError) {
          console.warn("Analytics tracking failed:", analyticsError);
        }
    } else {
      const errorData = await response.json();
        console.warn("Backend add to cart failed:", errorData);
        showNotification(`Backend sync failed: ${errorData.message || 'Unknown error'}`, "warning");
      }
    } catch (backendError) {
      console.warn("Backend request failed:", backendError);
      showNotification("Backend unavailable, item saved locally", "warning");
    }
    
    // If we're on the cart page, refresh the display
    if (window.location.pathname.includes("cart.html")) {
      try {
        await displayCart();
      } catch (displayError) {
        console.error("Failed to refresh cart display:", displayError);
      }
    }
    
  } catch (error) {
    console.error("Error adding to cart:", error);
    showNotification("Failed to add to cart. Please try again.", "error");
    
    // Revert local storage change on error
    try {
      let cart = JSON.parse(localStorage.getItem("cart") || "[]");
      cart = cart.filter(id => id !== productId);
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();
    } catch (revertError) {
      console.error("Failed to revert cart change:", revertError);
    }
  }
}

async function registerUser() {
  try {
    const usernameInput = document.getElementById("username");
    if (!usernameInput) {
      console.error("Username input element not found on register page");
      alert("Registration failed: Username input not found.");
      return;
    }
    const username = usernameInput.value.trim();
    if (username) {
      // Register on backend
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });
      
      if (response.ok) {
        localStorage.setItem("username", username);
        analytics.identify(username);
        console.log("User registered:", username);
        window.location.href = "profile.html";
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Registration failed");
      }
    } else {
      alert("Please enter a username.");
      console.warn("Username input is empty");
    }
  } catch (error) {
    console.error("Error during registration:", error);
    alert("Registration failed. Please try again.");
  }
}


async function displayFavorites() {
  try {
    const favoritesList = document.getElementById("favorites-list");
    if (!favoritesList) {
      console.error("Favorites list element not found on page");
      return;
    }
    
    const username = localStorage.getItem("username");
    if (!username) {
      favoritesList.innerHTML = "<p class='text-lg'>Please register to view favorites.</p>";
      return;
    }
    
    // Get favorites from backend
    const response = await fetch(`${API_BASE_URL}/api/favorites/${username}`);
    if (response.ok) {
      const favorites = await response.json();
      favoritesList.innerHTML = "";
      if (favorites.length === 0) {
        favoritesList.innerHTML = "<p class='text-lg'>No favorites yet.</p>";
        return;
      }
      
      favorites.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
          favoritesList.innerHTML += `
            <div class="bg-white p-4 rounded shadow">
              <a href="product${id}.html" onclick="trackProductView(${id})">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded">
                <h4 class="text-xl font-semibold mt-2">${product.name}</h4>
                <p>$${product.price.toFixed(2)}</p>
              </a>
              <button onclick="addToCart(${id})" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add to Cart</button>
            </div>
          `;
        } else {
          console.warn(`Product with ID ${id} not found in products array`);
        }
      });
    } else {
      // Fallback to localStorage
      const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
      favoritesList.innerHTML = "";
      if (favorites.length === 0) {
        favoritesList.innerHTML = "<p class='text-lg'>No favorites yet.</p>";
        return;
      }
      favorites.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
          favoritesList.innerHTML += `
            <div class="bg-white p-4 rounded shadow">
              <a href="product${id}.html" onclick="trackProductView(${id})">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded">
                <h4 class="text-xl font-semibold mt-2">${product.name}</h4>
                <p>$${product.price.toFixed(2)}</p>
              </a>
              <button onclick="addToCart(${id})" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add to Cart</button>
            </div>
          `;
        } else {
          console.warn(`Product with ID ${id} not found in products array`);
        }
      });
    }
  } catch (error) {
    console.error("Error displaying favorites:", error);
    // Fallback to localStorage
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const favoritesList = document.getElementById("favorites-list");
    if (favoritesList) {
      favoritesList.innerHTML = "";
      if (favorites.length === 0) {
        favoritesList.innerHTML = "<p class='text-lg'>No favorites yet.</p>";
        return;
      }
      favorites.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
          favoritesList.innerHTML += `
            <div class="bg-white p-4 rounded shadow">
              <a href="product${id}.html" onclick="trackProductView(${id})">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded">
                <h4 class="text-xl font-semibold mt-2">${product.name}</h4>
                <p>$${product.price.toFixed(2)}</p>
              </a>
              <button onclick="addToCart(${id})" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add to Cart</button>
            </div>
          `;
        } else {
          console.warn(`Product with ID ${id} not found in products array`);
        }
      });
    }
  }
}

async function displayCart() {
  try {
    console.log("displayCart function called");
    const cartList = document.getElementById("cart-list");
    const cartSummary = document.getElementById("cart-summary");
    const emptyCart = document.getElementById("empty-cart");
    
    if (!cartList) {
      console.error("Cart list element not found on page");
      return;
    }
    
    const username = localStorage.getItem("username");
    if (!username) {
      cartList.innerHTML = `
        <div class="col-span-full text-center">
          <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <i class="fas fa-user-lock text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-2xl font-bold text-gray-700 mb-2">Please Register</h3>
            <p class="text-gray-600 mb-6">You need to register to view your cart.</p>
            <a href="register.html" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block">
              <i class="fas fa-user-plus mr-2"></i>
              Register Now
            </a>
          </div>
        </div>
      `;
      return;
    }
    
    // Get cart from backend
    const response = await fetch(`${API_BASE_URL}/api/cart/${username}`);
    if (response.ok) {
      const cart = await response.json();
      
      console.log(`Backend response status: ${response.status}`);
      console.log(`Backend cart data:`, cart);
      
      if (cart.length === 0) {
        cartList.innerHTML = "";
        cartSummary.classList.add("hidden");
        emptyCart.classList.remove("hidden");
        resetPromoCodeIfCartEmpty(); // Reset promo code if cart is empty
        return;
      }
      
      // Count occurrences of each product
      const cartCounts = {};
      cart.forEach(id => {
        cartCounts[id] = (cartCounts[id] || 0) + 1;
      });
      
      console.log(`Calculated cart counts from backend:`, cartCounts);
      
      let totalPrice = 0;
      let totalItems = 0;
      
      // Clear cart list and add items with animations
      cartList.innerHTML = "";
      
      // Display unique products with counts
      Object.keys(cartCounts).forEach((id, index) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
          const quantity = cartCounts[id];
          const itemTotal = product.price * quantity;
          totalPrice += itemTotal;
          totalItems += quantity;
          
          console.log(`Displaying product ${id} with quantity ${quantity}`);
          
          const cartItem = document.createElement('div');
          cartItem.className = 'cart-item bg-white rounded-xl shadow-lg overflow-hidden fade-in';
          cartItem.style.animationDelay = `${index * 0.1}s`;
          cartItem.setAttribute('data-product-id', id);
          
          cartItem.innerHTML = `
            <div class="relative">
              <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
              <div class="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                ${quantity}
              </div>
            </div>
            <div class="p-6">
              <h4 class="text-xl font-semibold text-gray-800 mb-2">${product.name}</h4>
              <p class="text-gray-600 text-sm mb-3">${product.description}</p>
              <div class="flex items-center justify-between mb-4">
                <div class="text-2xl font-bold text-blue-600">$${product.price.toFixed(2)}</div>
                <div class="text-lg font-semibold text-gray-700">$${itemTotal.toFixed(2)}</div>
              </div>
              
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-gray-600 font-medium">Qty:</span>
                  <button onclick="updateCartQuantity(${id}, ${quantity - 1})" 
                          class="quantity-btn bg-gray-300 text-gray-700 w-8 h-8 rounded-full hover:bg-gray-400 flex items-center justify-center" 
                          ${quantity <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-minus text-xs"></i>
                  </button>
                  <span class="text-lg font-bold text-gray-800 w-8 text-center">${quantity}</span>
                  <button onclick="updateCartQuantity(${id}, ${quantity + 1})" 
                          class="quantity-btn bg-blue-500 text-white w-8 h-8 rounded-full hover:bg-blue-600 flex items-center justify-center">
                    <i class="fas fa-plus text-xs"></i>
                  </button>
                </div>
                <button onclick="removeFromCart(${id})" 
                        class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center">
                  <i class="fas fa-trash mr-2"></i>
                  Remove
                </button>
              </div>
            </div>
          `;
          
          cartList.appendChild(cartItem);
        } else {
          console.warn(`Product with ID ${id} not found in products array`);
        }
      });
      
      // Calculate totals using enhanced calculation function
      const totals = calculateCartTotals(cartCounts);
      
      // Update cart summary with detailed breakdown
      document.getElementById("total-items").textContent = totals.totalItems;
      document.getElementById("total-price").textContent = `$${totals.finalPrice.toFixed(2)}`;
      
      // Show combined discount (automatic + promo)
      const totalDiscount = totals.automaticDiscount + totals.promoCodeDiscount;
      document.getElementById("discount-amount").textContent = `$${totalDiscount.toFixed(2)}`;
      
      // Update promo status if code is applied
      if (appliedPromoCode) {
        const promoStatus = document.getElementById('promo-status');
        if (promoStatus) {
          promoStatus.innerHTML = `
            <div class="text-green-600 font-medium">
              <i class="fas fa-check-circle mr-1"></i>
              Promo code applied: ${appliedPromoCode}
            </div>
          `;
        }
      }
      
      // Show cart summary and hide empty cart
      cartSummary.classList.remove("hidden");
      emptyCart.classList.add("hidden");
      
    } else {
      // Fallback to localStorage
      console.log(`Backend failed, using localStorage fallback`);
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      
      console.log(`localStorage cart data:`, cart);
      
      if (cart.length === 0) {
        cartList.innerHTML = "";
        cartSummary.classList.add("hidden");
        emptyCart.classList.remove("hidden");
        resetPromoCodeIfCartEmpty(); // Reset promo code if cart is empty
        return;
      }
      
      // Count occurrences of each product
      const cartCounts = {};
      cart.forEach(id => {
        cartCounts[id] = (cartCounts[id] || 0) + 1;
      });
      
      console.log(`Calculated cart counts (localStorage):`, cartCounts);
      
      let totalPrice = 0;
      let totalItems = 0;
      
      cartList.innerHTML = "";
      
      Object.keys(cartCounts).forEach((id, index) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
          const quantity = cartCounts[id];
          const itemTotal = product.price * quantity;
          totalPrice += itemTotal;
          totalItems += quantity;
          
          console.log(`Displaying product ${id} with quantity ${quantity} (localStorage fallback)`);
          
          const cartItem = document.createElement('div');
          cartItem.className = 'cart-item bg-white rounded-xl shadow-lg overflow-hidden fade-in';
          cartItem.style.animationDelay = `${index * 0.1}s`;
          cartItem.setAttribute('data-product-id', id);
          
          cartItem.innerHTML = `
            <div class="relative">
              <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
              <div class="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                ${quantity}
              </div>
            </div>
            <div class="p-6">
              <h4 class="text-xl font-semibold text-gray-800 mb-2">${product.name}</h4>
              <p class="text-gray-600 text-sm mb-3">${product.description}</p>
              <div class="flex items-center justify-between mb-4">
                <div class="text-2xl font-bold text-blue-600">$${product.price.toFixed(2)}</div>
                <div class="text-lg font-semibold text-gray-700">$${itemTotal.toFixed(2)}</div>
              </div>
              
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-gray-600 font-medium">Qty:</span>
                  <button onclick="updateCartQuantity(${id}, ${quantity - 1})" 
                          class="quantity-btn bg-gray-300 text-gray-700 w-8 h-8 rounded-full hover:bg-gray-400 flex items-center justify-center" 
                          ${quantity <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-minus text-xs"></i>
                  </button>
                  <span class="text-lg font-bold text-gray-800 w-8 text-center">${quantity}</span>
                  <button onclick="updateCartQuantity(${id}, ${quantity + 1})" 
                          class="quantity-btn bg-blue-500 text-white w-8 h-8 rounded-full hover:bg-blue-600 flex items-center justify-center">
                    <i class="fas fa-plus text-xs"></i>
                  </button>
                </div>
                <button onclick="removeFromCart(${id})" 
                        class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center">
                  <i class="fas fa-trash mr-2"></i>
                  Remove
                </button>
              </div>
            </div>
          `;
          
          cartList.appendChild(cartItem);
        } else {
          console.warn(`Product with ID ${id} not found in products array`);
        }
      });
      
      // Calculate totals using enhanced calculation function
      const totals = calculateCartTotals(cartCounts);
      
      // Update cart summary with detailed breakdown
      document.getElementById("total-items").textContent = totals.totalItems;
      document.getElementById("total-price").textContent = `$${totals.finalPrice.toFixed(2)}`;
      
      // Show combined discount (automatic + promo)
      const totalDiscount = totals.automaticDiscount + totals.promoCodeDiscount;
      document.getElementById("discount-amount").textContent = `$${totalDiscount.toFixed(2)}`;
      
      // Update promo status if code is applied
      if (appliedPromoCode) {
        const promoStatus = document.getElementById('promo-status');
        if (promoStatus) {
          promoStatus.innerHTML = `
            <div class="text-green-600 font-medium">
              <i class="fas fa-check-circle mr-1"></i>
              Promo code applied: ${appliedPromoCode}
            </div>
          `;
        }
      }
      
      cartSummary.classList.remove("hidden");
      emptyCart.classList.add("hidden");
    }
    
  } catch (error) {
    console.error("Error displaying cart:", error);
    
    // Show error message
    const cartList = document.getElementById("cart-list");
    if (cartList) {
      cartList.innerHTML = `
        <div class="col-span-full text-center">
          <div class="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
            <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
            <h3 class="text-2xl font-bold text-red-700 mb-2">Error Loading Cart</h3>
            <p class="text-red-600 mb-6">There was a problem loading your cart. Please try again.</p>
            <div class="space-y-2">
              <button onclick="forceRefreshCart()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full">
                <i class="fas fa-redo mr-2"></i>
                Retry
              </button>
              <button onclick="location.reload()" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors w-full">
                <i class="fas fa-refresh mr-2"></i>
                Reload Page
              </button>
            </div>
            <div class="mt-4 text-sm text-gray-500">
              <p>Error details: ${error.message || 'Unknown error'}</p>
              <p>Check console for more information.</p>
            </div>
          </div>
            </div>
          `;
    }
    
    // Also try to show cart summary if possible
    try {
      const cartSummary = document.getElementById("cart-summary");
      const emptyCart = document.getElementById("empty-cart");
      
      if (cartSummary) cartSummary.classList.add("hidden");
      if (emptyCart) emptyCart.classList.add("hidden");
    } catch (summaryError) {
      console.error("Failed to hide cart summary:", summaryError);
    }
  }
}

async function removeFromCart(productId) {
  try {
    const username = localStorage.getItem("username");
    if (!username) {
      showNotification("Please register to manage cart!", "error");
      return;
    }
    
    // Find the cart item element to animate removal
    let cartItem = document.querySelector(`[onclick*="removeFromCart(${productId})"]`)?.closest('.cart-item');
    
    if (!cartItem) {
      // Fallback if animation element not found
      cartItem = document.querySelector(`[data-product-id="${productId}"]`)?.closest('.cart-item');
    }
    
    if (!cartItem) {
      // Fallback if animation element not found
      const cartItems = document.querySelectorAll('.cart-item');
      for (const item of cartItems) {
        const itemId = item.querySelector('[onclick*="removeFromCart"]')?.getAttribute('onclick')?.match(/\d+/)?.[0];
        if (itemId == productId) {
          cartItem = item;
          break;
        }
      }
    }
    
    if (cartItem) {
      // Add removal animation
      cartItem.style.transform = 'translateX(-100%)';
      cartItem.style.opacity = '0';
      cartItem.style.transition = 'all 0.3s ease';
      
      setTimeout(async () => {
        // Remove from backend
        const response = await fetch(`${API_BASE_URL}/api/cart/${username}/${productId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Remove from local storage as backup
          let cart = JSON.parse(localStorage.getItem("cart") || "[]");
          cart = cart.filter(id => id !== productId);
          localStorage.setItem("cart", JSON.stringify(cart));
          
          analytics.track("Removed from Cart", { productId: productId });
          showNotification("Item removed from cart!", "success");
          
          // Update cart count
          updateCartCount();
          
          // Refresh cart display
          await displayCart();
          
          // Check if cart is now empty and reset promo code if needed
          resetPromoCodeIfCartEmpty();
        } else {
          const errorData = await response.json();
          showNotification(errorData.message || "Failed to remove from cart", "error");
          // Revert animation if failed
          cartItem.style.transform = 'translateX(0)';
          cartItem.style.opacity = '1';
        }
      }, 300);
    } else {
      // Fallback if animation element not found
      const response = await fetch(`${API_BASE_URL}/api/cart/${username}/${productId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        let cart = JSON.parse(localStorage.getItem("cart") || "[]");
        cart = cart.filter(id => id !== productId);
        localStorage.setItem("cart", JSON.stringify(cart));
        
        analytics.track("Removed from Cart", { productId: productId });
        showNotification("Item removed from cart!", "success");
        
        updateCartCount();
        await displayCart();
        
        // Check if cart is now empty and reset promo code if needed
        resetPromoCodeIfCartEmpty();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || "Failed to remove from cart", "error");
      }
    }
  } catch (error) {
    console.error("Error removing from cart:", error);
    showNotification("Failed to remove from cart. Please try again.", "error");
  }
}

async function updateCartQuantity(productId, newQuantity) {
  try {
    console.log(`updateCartQuantity called with productId: ${productId}, newQuantity: ${newQuantity}`);
    
    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    
    const username = localStorage.getItem("username");
    if (!username) {
      showNotification("Please register to manage cart!", "error");
      return;
    }
    
    // Find the quantity display element to animate update
    let cartItem = null;
    let quantityDisplay = null;
    
    try {
      // Try to find element by onclick attribute first
      cartItem = document.querySelector(`[onclick*="updateCartQuantity(${productId}"]`)?.closest('.cart-item');
      if (cartItem) {
        quantityDisplay = cartItem.querySelector('.text-lg.font-bold.text-gray-800');
      }
      
      // If not found, try alternative selectors
      if (!cartItem) {
        cartItem = document.querySelector(`[data-product-id="${productId}"]`)?.closest('.cart-item');
        if (cartItem) {
          quantityDisplay = cartItem.querySelector('.text-lg.font-bold.text-gray-800');
        }
      }
      
      // If still not found, try to find by product ID in the cart list
      if (!cartItem) {
        const cartItems = document.querySelectorAll('.cart-item');
        for (const item of cartItems) {
          const itemId = item.querySelector('[onclick*="updateCartQuantity"]')?.getAttribute('onclick')?.match(/\d+/)?.[0];
          if (itemId == productId) {
            cartItem = item;
            quantityDisplay = item.querySelector('.text-lg.font-bold.text-gray-800');
            break;
          }
        }
      }
    } catch (selectorError) {
      console.warn("Could not find cart item element for animation:", selectorError);
    }
    
    // Add update animation if element found
    if (quantityDisplay) {
      try {
        quantityDisplay.style.transform = 'scale(1.2)';
        quantityDisplay.style.color = '#3B82F6';
        quantityDisplay.style.transition = 'all 0.2s ease';
        
        setTimeout(() => {
          if (quantityDisplay) {
            quantityDisplay.style.transform = 'scale(1)';
            quantityDisplay.style.color = '#1F2937';
          }
        }, 200);
      } catch (animationError) {
        console.warn("Animation failed:", animationError);
      }
    }
    
    // First, try to update on backend
    let backendSuccess = false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/${username}/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      if (response.ok) {
        backendSuccess = true;
        console.log("Backend update successful");
      } else {
        const errorData = await response.json();
        console.warn("Backend update failed:", errorData);
        showNotification(`Backend update failed: ${errorData.message || 'Unknown error'}`, "warning");
      }
    } catch (backendError) {
      console.warn("Backend request failed:", backendError);
      showNotification("Backend unavailable, using local storage", "warning");
    }
    
    // Always update local storage as backup
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    
    console.log(`Before update: Cart had ${cart.filter(id => id == productId).length} instances of product ${productId}`);
    console.log(`Current cart before update:`, cart);
    
    if (newQuantity === 0) {
      cart = cart.filter(id => id !== productId);
    } else {
      // Remove existing instances and add new quantity
      cart = cart.filter(id => id !== productId);
      for (let i = 0; i < newQuantity; i++) {
        cart.push(productId);
      }
    }
    
    console.log(`After update: Cart now has ${cart.filter(id => id == productId).length} instances of product ${productId}`);
    console.log(`Updated cart:`, cart);
    
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Verify the update was successful
    const verifyCart = JSON.parse(localStorage.getItem("cart") || "[]");
    console.log(`Verification: localStorage now contains:`, verifyCart);
    console.log(`Verification: Product ${productId} appears ${verifyCart.filter(id => id == productId).length} times`);
    
    // Track analytics if backend was successful
    if (backendSuccess) {
      try {
        analytics.track("Updated Cart Quantity", { productId: productId, quantity: newQuantity });
      } catch (analyticsError) {
        console.warn("Analytics tracking failed:", analyticsError);
      }
    }
    
    showNotification(`Quantity updated to ${newQuantity}!`, "success");
    
    console.log(`Cart updated successfully. New quantity for product ${productId}: ${newQuantity}`);
    
    // Update cart count
    updateCartCount();
    
    // Refresh cart display
    await displayCart();
    
    // Check if cart is now empty and reset promo code if needed
    resetPromoCodeIfCartEmpty();
    
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    showNotification("Failed to update cart quantity. Please try again.", "error");
    
    // Try to refresh display even if there was an error
    try {
      await displayCart();
    } catch (refreshError) {
      console.error("Failed to refresh cart display:", refreshError);
    }
  }
}

async function clearCart() {
  try {
    const username = localStorage.getItem("username");
    if (!username) {
      showNotification("Please register to manage cart!", "error");
      return;
    }
    
    if (!confirm("Are you sure you want to clear your cart? This action cannot be undone.")) {
      return;
    }
    
    // Add clearing animation
    const cartItems = document.querySelectorAll('.cart-item');
    cartItems.forEach((item, index) => {
      item.style.transition = 'all 0.3s ease';
      item.style.transform = `translateY(-20px)`;
      item.style.opacity = '0';
      item.style.transitionDelay = `${index * 0.1}s`;
    });
    
    setTimeout(async () => {
      // Clear cart on backend
      const response = await fetch(`${API_BASE_URL}/api/cart/${username}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Clear local storage
        localStorage.setItem("cart", "[]");
        
        // Clear promo code state
        appliedPromoCode = null;
        promoDiscount = 0;
        localStorage.removeItem("appliedPromoCode");
        localStorage.removeItem("promoDiscount");
        
        analytics.track("Cart Cleared", { username: username });
        showNotification("Cart cleared successfully!", "success");
        
        // Update cart count
        updateCartCount();
        
        // Refresh cart display
        await displayCart();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || "Failed to clear cart", "error");
        
        // Revert animation if failed
        cartItems.forEach(item => {
          item.style.transform = 'translateY(0)';
          item.style.opacity = '1';
        });
      }
    }, cartItems.length * 100 + 300);
    
  } catch (error) {
    console.error("Error clearing cart:", error);
    showNotification("Failed to clear cart. Please try again.", "error");
  }
}

function updateCartCount() {
  try {
    const cartCountElement = document.getElementById("cart-count");
    if (!cartCountElement) {
      console.warn("Cart count element not found");
      return;
    }
    
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const count = cart.length;
    
    console.log(`updateCartCount: Cart has ${count} items:`, cart);
    console.log(`updateCartCount: Updating element to show ${count}`);
    
    if (count > 0) {
      cartCountElement.textContent = count;
      cartCountElement.classList.remove("hidden");
      console.log(`updateCartCount: Element updated successfully`);
    } else {
      cartCountElement.classList.add("hidden");
      console.log(`updateCartCount: Element hidden (empty cart)`);
    }
  } catch (error) {
    console.error("Error updating cart count:", error);
  }
}

function displayOrderSummary() {
  try {
    const orderSummary = document.getElementById("order-summary");
    if (!orderSummary) {
      console.error("Order summary element not found on page");
      return;
    }
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    orderSummary.innerHTML = "";
    if (cart.length === 0) {
      orderSummary.innerHTML = "<p class='text-lg'>No items in your order.</p>";
      return;
    }
    
    // Count occurrences of each product
    const cartCounts = {};
    cart.forEach(id => {
      cartCounts[id] = (cartCounts[id] || 0) + 1;
    });
    
    let totalPrice = 0;
    
    Object.keys(cartCounts).forEach(id => {
      const product = products.find(p => p.id === parseInt(id));
      if (product) {
        const quantity = cartCounts[id];
        const itemTotal = product.price * quantity;
        totalPrice += itemTotal;
        
        orderSummary.innerHTML += `
          <div class="bg-white p-4 rounded shadow mb-4">
            <img src="${product.image}" alt="${product.name}" class="w-32 h-32 object-cover rounded inline-block">
            <div class="inline-block ml-4">
              <h4 class="text-xl font-semibold">${product.name}</h4>
              <p class="text-lg font-bold text-blue-600">$${product.price.toFixed(2)}</p>
              <p class="text-gray-600">Quantity: ${quantity}</p>
              <p class="text-sm text-gray-500">Item Total: $${itemTotal.toFixed(2)}</p>
              <p>${product.description}</p>
            </div>
          </div>
        `;
      } else {
        console.warn(`Product with ID ${id} not found in products array`);
      }
    });
    
    // Add total price display
    orderSummary.innerHTML += `
      <div class="bg-blue-100 p-6 rounded shadow mt-6 text-center">
        <h3 class="text-3xl font-bold text-blue-800">Order Total: $${totalPrice.toFixed(2)}</h3>
      </div>
    `;
  } catch (error) {
    console.error("Error displaying order summary:", error);
  }
}

function proceedToOrder() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length > 0) {
      // Save promo code state for order page
      if (appliedPromoCode) {
        localStorage.setItem("appliedPromoCode", appliedPromoCode);
        localStorage.setItem("promoDiscount", promoDiscount.toString());
      }
      
      console.log("Proceeding to order with cart:", cart);
      showNotification("Redirecting to checkout...", "info");
      
      setTimeout(() => {
      window.location.href = "order.html";
      }, 1000);
    } else {
      showNotification("Your cart is empty.", "warning");
      console.warn("Cannot proceed to order: Cart is empty");
    }
  } catch (error) {
    console.error("Error proceeding to order:", error);
    showNotification("Failed to proceed to order. Please try again.", "error");
  }
}

// Load promo code state on page load
function loadPromoCodeState() {
  const savedPromoCode = localStorage.getItem("appliedPromoCode");
  const savedPromoDiscount = localStorage.getItem("promoDiscount");
  
  if (savedPromoCode && savedPromoDiscount) {
    appliedPromoCode = savedPromoCode;
    promoDiscount = parseFloat(savedPromoDiscount);
    
    // Update UI to reflect saved state
    const promoInput = document.getElementById('promo-code');
    const promoStatus = document.getElementById('promo-status');
    const removePromoBtn = document.getElementById('remove-promo');
    
    if (promoInput && promoStatus && removePromoBtn) {
      promoInput.value = savedPromoCode;
      promoInput.classList.add('border-green-500', 'bg-green-50');
      promoInput.classList.remove('border-gray-300');
      
      promoStatus.innerHTML = `
        <div class="text-green-600 font-medium">
          <i class="fas fa-check-circle mr-1"></i>
          Promo code applied: ${savedPromoCode}
        </div>
      `;
      
      removePromoBtn.classList.remove('hidden');
    }
  }
}

function contactSeller() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length > 0) {
      analytics.track("Order Submitted", { cart: cart });
      alert("Please contact the seller to complete your order.");
      localStorage.setItem("cart", "[]");
      
      // Clear promo code state
      appliedPromoCode = null;
      promoDiscount = 0;
      localStorage.removeItem("appliedPromoCode");
      localStorage.removeItem("promoDiscount");
      
      console.log("Order submitted, cart cleared");
      
      // Update cart count
      updateCartCount();
      
      window.location.href = "index.html";
    } else {
      alert("No items to order.");
      console.warn("Cannot submit order: Cart is empty");
    }
  } catch (error) {
    console.error("Error submitting order:", error);
    alert("Failed to submit order. Please try again.");
  }
}

function displayMostViewed() {
  try {
    const mostViewedSection = document.getElementById("most-viewed");
    if (!mostViewedSection) {
      console.error("Most viewed section not found on page");
      return;
    }
    let viewCounts = JSON.parse(localStorage.getItem("viewCounts") || "{}");
    const sortedProducts = Object.keys(viewCounts)
      .map(id => ({ id: parseInt(id), views: viewCounts[id] }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    mostViewedSection.innerHTML = "";
    if (sortedProducts.length === 0) {
      mostViewedSection.innerHTML = "<p class='text-lg'>No products viewed yet.</p>";
      return;
    }
  sortedProducts.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        mostViewedSection.innerHTML += `
          <div class="bg-white p-4 rounded shadow">
            <a href="product${product.id}.html" onclick="trackProductView(${product.id})">
              <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded">
              <h4 class="text-xl font-semibold mt-2">${product.name}</h4>
              <p>$${product.price.toFixed(2)}</p>
            </a>
            <button onclick="addToFavorites(${product.id})" class="mt-2 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Add to Favorites</button>
            <button onclick="addToCart(${product.id})" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add to Cart</button>
          </div>
        `;
      } else {
        console.warn(`Product with ID ${item.id} not found in products array`);
      }
    });
  } catch (error) {
    console.error("Error displaying most viewed products:", error);
  }
}

window.onload = async function() {
  try {
    // Load products from backend first
    await loadProducts();
    
    // Update cart count on all pages
    updateCartCount();
    
    if (window.location.pathname.includes("profile.html")) {
      const username = localStorage.getItem("username");
      if (!username) {
        console.warn("No username found, redirecting to register.html");
        alert("Please register to access your profile.");
        window.location.href = "register.html";
        return;
      }
      const usernameDisplay = document.getElementById("username-display");
      const usernameValue = document.getElementById("username-value");
      const usernameInitial = document.getElementById("username-initial");
      
      if (usernameDisplay) {
        usernameDisplay.textContent = username;
      } else {
        console.error("Username display element not found on profile page");
      }
      
      if (usernameValue) {
        usernameValue.textContent = username;
      }
      
      if (usernameInitial) {
        usernameInitial.textContent = username.charAt(0).toUpperCase();
      }
    }
    if (window.location.pathname.includes("favorites.html")) {
      await displayFavorites();
    }
    if (window.location.pathname.includes("cart.html")) {
      await displayCart();
    }
    if (window.location.pathname.includes("order.html")) {
      displayOrderSummary();
      loadPromoCodeState(); // Load promo code state on order page
    }
    if (window.location.pathname.includes("index.html")) {
      displayMostViewed();
    }
    analytics.page();
  } catch (error) {
    console.error("Error in window.onload:", error);
  }
};

// Add notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 ${getNotificationClasses(type)}`;
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="${getNotificationIcon(type)} mr-3"></i>
      <span class="font-medium">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-current hover:opacity-70">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

function getNotificationClasses(type) {
  switch (type) {
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-blue-500 text-white';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success':
      return 'fas fa-check-circle';
    case 'error':
      return 'fas fa-exclamation-circle';
    case 'warning':
      return 'fas fa-exclamation-triangle';
    default:
      return 'fas fa-info-circle';
  }
}

// Promo code system
let appliedPromoCode = null;
let promoDiscount = 0;

function applyPromoCode() {
  const promoInput = document.getElementById('promo-code');
  const promoStatus = document.getElementById('promo-status');
  const removePromoBtn = document.getElementById('remove-promo');
  const promoCode = promoInput.value.trim().toUpperCase();
  
  if (!promoCode) {
    showNotification('Please enter a promo code', 'warning');
    return;
  }
  
  // Available promo codes
  const promoCodes = {
    'WELCOME10': { discount: 0.10, description: '10% off your first order' },
    'MINERAL20': { discount: 0.20, description: '20% off all minerals' },
    'FREESHIP': { discount: 0, description: 'Free shipping on orders over $50' },
    'SPRING15': { discount: 0.15, description: '15% off spring collection' }
  };
  
  if (promoCodes[promoCode]) {
    const promo = promoCodes[promoCode];
    appliedPromoCode = promoCode;
    promoDiscount = promo.discount;
    
    promoStatus.innerHTML = `
      <div class="text-green-600 font-medium">
        <i class="fas fa-check-circle mr-1"></i>
        ${promo.description}
      </div>
    `;
    
    promoInput.classList.add('border-green-500', 'bg-green-50');
    promoInput.classList.remove('border-gray-300');
    
    // Show remove button
    removePromoBtn.classList.remove('hidden');
    
    showNotification(`Promo code applied: ${promo.description}`, 'success');
    
    // Update cart display with new discount
    updateCartDisplay();
  } else {
    appliedPromoCode = null;
    promoDiscount = 0;
    
    promoStatus.innerHTML = `
      <div class="text-red-600 font-medium">
        <i class="fas fa-times-circle mr-1"></i>
        Invalid promo code
      </div>
    `;
    
    promoInput.classList.add('border-red-500', 'bg-red-50');
    promoInput.classList.remove('border-gray-300', 'border-green-500', 'bg-green-50');
    
    // Hide remove button
    removePromoBtn.classList.add('hidden');
    
    showNotification('Invalid promo code. Please try again.', 'error');
    
    // Update cart display
    updateCartDisplay();
  }
}

function removePromoCode() {
  appliedPromoCode = null;
  promoDiscount = 0;
  
  const promoInput = document.getElementById('promo-code');
  const promoStatus = document.getElementById('promo-status');
  const removePromoBtn = document.getElementById('remove-promo');
  
  // Reset input styling
  promoInput.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50');
  promoInput.classList.add('border-gray-300');
  promoInput.value = '';
  
  // Clear status and hide remove button
  promoStatus.innerHTML = '';
  removePromoBtn.classList.add('hidden');
  
  showNotification('Promo code removed', 'info');
  
  // Update cart display
  updateCartDisplay();
}

function updateCartDisplay() {
  // This function will be called to recalculate totals with promo codes
  // It will be integrated with the existing displayCart function
  if (window.location.pathname.includes("cart.html")) {
    displayCart();
  }
}

// Enhanced cart calculation with promo codes
function calculateCartTotals(cartCounts) {
  let totalPrice = 0;
  let totalItems = 0;
  
  Object.keys(cartCounts).forEach(id => {
    const product = products.find(p => p.id === parseInt(id));
    if (product) {
      const quantity = cartCounts[id];
      const itemTotal = product.price * quantity;
      totalPrice += itemTotal;
      totalItems += quantity;
    }
  });
  
  // Apply automatic discount (10% off for orders over $100)
  const automaticDiscount = totalPrice > 100 ? totalPrice * 0.1 : 0;
  
  // Apply promo code discount
  const promoCodeDiscount = totalPrice * promoDiscount;
  
  // Calculate final price
  const finalPrice = totalPrice - automaticDiscount - promoCodeDiscount;
  
  // Update detailed breakdown elements if they exist
  updatePriceBreakdown(totalPrice, automaticDiscount, promoCodeDiscount, finalPrice);
  
  return {
    totalPrice,
    totalItems,
    automaticDiscount,
    promoCodeDiscount,
    finalPrice
  };
}

// Update detailed price breakdown
function updatePriceBreakdown(subtotal, autoDiscount, promoDiscount, finalTotal) {
  const subtotalEl = document.getElementById('subtotal-amount');
  const autoDiscountEl = document.getElementById('auto-discount-amount');
  const promoDiscountEl = document.getElementById('promo-discount-amount');
  const finalTotalEl = document.getElementById('final-total-amount');
  const promoDiscountRow = document.getElementById('promo-discount-row');
  
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (autoDiscountEl) autoDiscountEl.textContent = `$${autoDiscount.toFixed(2)}`;
  if (promoDiscountEl) promoDiscountEl.textContent = `$${promoDiscount.toFixed(2)}`;
  if (finalTotalEl) finalTotalEl.textContent = `$${finalTotal.toFixed(2)}`;
  
  // Show/hide promo discount row
  if (promoDiscountRow) {
    if (promoDiscount > 0) {
      promoDiscountRow.style.display = 'flex';
    } else {
      promoDiscountRow.style.display = 'none';
    }
  }
}

// Reset promo code when cart becomes empty
function resetPromoCodeIfCartEmpty() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (cart.length === 0 && appliedPromoCode) {
    appliedPromoCode = null;
    promoDiscount = 0;
    localStorage.removeItem("appliedPromoCode");
    localStorage.removeItem("promoDiscount");
    
    // Reset UI
    const promoInput = document.getElementById('promo-code');
    const promoStatus = document.getElementById('promo-status');
    const removePromoBtn = document.getElementById('remove-promo');
    
    if (promoInput && promoStatus && removePromoBtn) {
      promoInput.value = '';
      promoInput.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50');
      promoInput.classList.add('border-gray-300');
      promoStatus.innerHTML = '';
      removePromoBtn.classList.add('hidden');
    }
  }
}

// Test cart functionality
function testCartFunctionality() {
  console.log("Testing cart functionality...");
  
  // Check if user is registered
  const username = localStorage.getItem("username");
  console.log("Username:", username);
  
  // Check cart contents
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  console.log("Cart contents:", cart);
  
  // Check if cart elements exist
  const cartList = document.getElementById("cart-list");
  const cartSummary = document.getElementById("cart-summary");
  const emptyCart = document.getElementById("empty-cart");
  
  console.log("Cart list element:", cartList);
  console.log("Cart summary element:", cartSummary);
  console.log("Empty cart element:", emptyCart);
  
  // Check if products are loaded
  console.log("Products loaded:", products.length);
  console.log("Products:", products);
  
  // Check API base URL
  console.log("API base URL:", API_BASE_URL);
  
  return {
    username,
    cart,
    elements: { cartList, cartSummary, emptyCart },
    products: products.length,
    apiUrl: API_BASE_URL
  };
}

// Enhanced error handling for cart operations
function handleCartError(operation, error, fallback = null) {
  console.error(`Cart operation failed: ${operation}`, error);
  
  // Log detailed error information
  if (error.response) {
    console.error("Response status:", error.response.status);
    console.error("Response data:", error.response.data);
  }
  
  // Show user-friendly error message
  let message = "An error occurred while processing your request.";
  
  if (error.message) {
    message = error.message;
  } else if (error.statusText) {
    message = `Server error: ${error.statusText}`;
  }
  
  showNotification(message, "error");
  
  // Execute fallback if provided
  if (fallback && typeof fallback === 'function') {
    try {
      fallback();
    } catch (fallbackError) {
      console.error("Fallback function failed:", fallbackError);
    }
  }
}

// Force refresh cart display
async function forceRefreshCart() {
  try {
    console.log("Force refreshing cart...");
    
    // Clear current display
    const cartList = document.getElementById("cart-list");
    if (cartList) {
      cartList.innerHTML = `
        <div class="col-span-full text-center">
          <div class="animate-pulse">
            <div class="bg-white p-8 rounded-xl shadow-lg">
              <div class="text-gray-500 text-lg">
                <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
                <div>Refreshing cart...</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Wait a bit for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload products if needed
    if (products.length === 0) {
      await loadProducts();
    }
    
    // Refresh cart display
    await displayCart();
    
    showNotification("Cart refreshed successfully!", "success");
    
  } catch (error) {
    console.error("Failed to force refresh cart:", error);
    showNotification("Failed to refresh cart", "error");
  }
}

// Add this to the global scope for debugging
window.forceRefreshCart = forceRefreshCart;
window.testCartFunctionality = testCartFunctionality;
