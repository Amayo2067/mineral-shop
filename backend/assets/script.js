let products = [];

async function fetchProducts() {
  try {
    const response = await axios.get('/api/products');
    products = response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

async function trackProductView(productId) {
  try {
    const username = localStorage.getItem('username') || 'anonymous';
    await axios.post(`/api/view/${productId}`, { username });
  } catch (error) {
    console.error('Error tracking product view:', error);
  }
}

async function addToFavorites(productId) {
  try {
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please register to add to favorites.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.post('/api/favorites', { username, productId });
    alert(response.data.message);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    alert(error.response?.data?.message || 'Failed to add to favorites.');
  }
}

async function addToCart(productId) {
  try {
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please login to add to cart.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.post('/api/cart', { username, productId });
    alert(response.data.message);
  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Failed to add to cart.');
  }
}

async function registerUser() {
  try {
    const usernameInput = document.getElementById('username');
    if (!usernameInput) {
      console.error('Username input not found');
      return;
    }
    const username = usernameInput.value.trim();
    if (!username) {
      alert('Please enter a username.');
      return;
    }
    await axios.post('/api/register', { username });
    localStorage.setItem('username', username);
    window.location.href = 'profile.html';
  } catch (error) {
    console.error('Error during registration:', error);
    alert('Failed to register. Please try again.');
  }
}

async function displayFavorites() {
  try {
    const favoritesList = document.querySelector('#favorites-list');
    if (!favoritesList) {
      console.error('Favorites list not found');
      return;
    }
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please login to view favorites.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.get(`/api/favorites/${username}`);
    const favorites = response.data;
    favoritesList.innerHTML = '';
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
      }
    });
  } catch (error) {
    console.error('Error displaying favorites:', error);
  }
}

async function displayCart() {
  try {
    const cartList = document.querySelector('#cart-list');
    if (!cartList) {
      console.error('Cart list not found');
      return;
    }
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please login to view cart.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.get(`/api/cart/${username}`);
    const cart = response.data;
    cartList.innerHTML = '';
    if (cart.length === 0) {
      cartList.innerHTML = "<p class='text-lg'>Your cart is empty.</p>";
      return;
    }
    cart.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        cartList.innerHTML += `
          <div class="bg-white p-4 rounded shadow">
            <a href="product${id}.html" onclick="trackProductView(${id})">
              <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded">
              <h4 class="text-xl font-semibold mt-2">${product.name}</h4>
              <p>$${product.price.toFixed(2)}</p>
            </a>
          </div>
        `;
      }
    });
  } catch (error) {
    console.error('Error displaying cart:', error);
  }
}

async function displayOrderSummary() {
  try {
    const orderSummary = document.querySelector('#order-summary');
    if (!orderSummary) {
      console.error('Order summary not found');
      return;
    }
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please login to view order summary.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.get(`/api/cart/${username}`);
    const cart = response.data;
    orderSummary.innerHTML = '';
    if (cart.length === 0) {
      orderSummary.innerHTML = "<p class='text-lg'>No items in your order.</p>";
      return;
    }
    cart.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        orderSummary.innerHTML += `
          <div class="bg-white p-4 rounded shadow mb-4">
            <img src="${product.image}" alt="${product.name}" class="w-32 h-32 object-cover rounded inline-block">
            <div class="inline-block ml-4">
              <h4 class="text-xl font-semibold">${product.name}</h4>
              <p>$${product.price.toFixed(2)}</p>
              <p>${product.description}</p>
            </div>
          </div>
        `;
      }
    });
  } catch (error) {
    console.error('Error displaying order summary:', error);
  }
}

async function proceedToOrder() {
  try {
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please login to proceed to order.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.get(`/api/cart/${username}`);
    if (response.data.length > 0) {
      window.location.href = 'order.html';
    } else {
      alert('Your cart is empty.');
    }
  } catch (error) {
    console.error('Error proceeding to order:', error);
    alert('Failed to proceed to order.');
  }
}

async function contactSeller() {
  try {
    const username = localStorage.getItem('username');
    if (!username) {
      alert('Please login to submit order.');
      window.location.href = 'register.html';
      return;
    }
    const response = await axios.get(`/api/cart/${username}`);
    if (response.data.length > 0) {
      await axios.post('/api/order', { username });
      alert('Please contact the seller to complete your order.');
      window.location.href = 'index.html';
    } else {
      alert('No items to order.');
    }
  } catch (error) {
    console.error('Error submitting order:', error);
    alert('Failed to submit order.');
  }
}

async function displayMostViewed() {
  try {
    const mostViewedSection = document.querySelector('#most-viewed');
    if (!mostViewedSection) {
      console.error('Most viewed section not found');
      return;
    }
    const response = await axios.get('/api/most-viewed');
    const mostViewed = response.data;
    mostViewedSection.innerHTML = '';
    if (mostViewed.length === 0) {
      mostViewedSection.innerHTML = "<p class='text-lg'>No products viewed yet.</p>";
      return;
    }
    mostViewed.forEach(id => {
      const product = products.find(p => p.id === id);
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
      }
    });
  } catch (error) {
    console.error('Error displaying most viewed products:', error);
  }
}

window.onload = async function() {
  try {
    await fetchProducts();
    if (window.location.pathname.includes('profile.html')) {
      const username = localStorage.getItem('username');
      if (!username) {
        alert('Please login to access your profile.');
        window.location.href = 'register.html';
        return;
      }
      const usernameDisplay = document.querySelector('#username-display');
      if (usernameDisplay) {
        usernameDisplay.textContent = username;
      } else {
        console.error('Username display not found');
      }
    }
    if (window.location.pathname.includes('favorites.html')) {
      await displayFavorites();
    }
    if (window.location.pathname.includes('cart.html')) {
      await displayCart();
    }
    if (window.location.pathname.includes('order.html')) {
      await displayOrderSummary();
    }
    if (window.location.pathname.includes('index.html')) {
      await displayMostViewed();
    }
  } catch (error) {
    console.error('Error in window.onload:', error);
  }
};