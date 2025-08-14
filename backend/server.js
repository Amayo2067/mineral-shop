const express = require('express');
const { Pool } = require('pg');
const { Analytics } = require('@segment/analytics-node');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Segment Analytics
const analytics = new Analytics({
  writeKey: 'L6lRRM0amDLguOaQFUZ9KffuyucYdUB', // Replace with your Segment Write Key or leave as is for now
  flushAt: 1 // Flush events immediately for testing
});

// Initialize PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mineral_shop',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.message);
  } else {
    console.log('Connected to PostgreSQL database.');
    
    // Create tables
    createTables();
  }
});

// Create tables function
async function createTables() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY
      )
    `);
    
    // Create favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        username TEXT,
        productId INTEGER,
        PRIMARY KEY (username, productId),
        FOREIGN KEY (username) REFERENCES users(username)
      )
    `);
    
    // Create cart table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart (
        username TEXT,
        productId INTEGER,
        PRIMARY KEY (username, productId),
        FOREIGN KEY (username) REFERENCES users(username)
      )
    `);
    
    // Create viewCounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS viewCounts (
        productId INTEGER PRIMARY KEY,
        viewCount INTEGER DEFAULT 0
      )
    `);
    
    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        image TEXT,
        description TEXT
      )
    `);
    
    console.log('Tables created successfully.');
    
    // Check if products table is empty and seed if needed
    const productCount = await pool.query('SELECT COUNT(*) AS count FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      await seedProducts();
    } else {
      console.log('Products table already has data.');
    }
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Seed products function
async function seedProducts() {
  try {
    const products = [
      { id: 1, name: 'Quartz', price: 50.00, image: '/images/mineral1.png', description: 'A stunning clear quartz crystal, perfect for collectors.' },
      { id: 2, name: 'Lava Crystal', price: 70.00, image: '/images/mineral2.png', description: 'A vibrant amethyst geode with deep purple hues.' },
      { id: 3, name: 'Ocean Crystal', price: 30.00, image: '/images/mineral3.png', description: 'A soft pink rose quartz, symbolizing love.' },
      { id: 4, name: 'Thunder Crystal', price: 40.00, image: '/images/mineral4.png', description: 'A bright citrine cluster, radiating positivity.' },
      { id: 5, name: 'Moss Crystal', price: 90.00, image: '/images/mineral5.png', description: 'A sleek black obsidian stone, grounding and protective.' }
    ];
    
    for (const product of products) {
      await pool.query(
        'INSERT INTO products (id, name, price, image, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [product.id, product.name, product.price, product.image, product.description]
      );
    }
    
    console.log('Products table seeded.');
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

// Middleware
app.use(express.json());
// Serve static files from the parent directory to access images
app.use(express.static(path.join(__dirname, '..')));

// API Endpoints
app.post('/api/register', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO NOTHING RETURNING username',
      [username]
    );
    
    if (result.rows.length > 0) {
      analytics.identify({ userId: username });
      res.json({ message: 'User registered', username });
    } else {
      res.json({ message: 'User already exists', username });
    }
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/view/:productId', async (req, res) => {
  const { productId } = req.params;
  
  try {
    // Insert or update viewCounts
    await pool.query(
      'INSERT INTO viewCounts (productId, viewCount) VALUES ($1, 0) ON CONFLICT (productId) DO NOTHING'
    );
    
    await pool.query(
      'UPDATE viewCounts SET viewCount = viewCount + 1 WHERE productId = $1',
      [productId]
    );
    
    const result = await pool.query(
      'SELECT viewCount FROM viewCounts WHERE productId = $1',
      [productId]
    );
    
    const viewCount = result.rows[0].viewCount;
    
    analytics.track({
      userId: req.body.username || 'anonymous',
      event: 'Product Viewed',
      properties: { productId: parseInt(productId), viewCount: viewCount }
    });
    
    res.json({ message: 'View tracked', viewCount: viewCount });
  } catch (err) {
    console.error('Error tracking view:', err.message);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

app.post('/api/favorites', async (req, res) => {
  const { username, productId } = req.body;
  if (!username || !productId) {
    return res.status(400).json({ error: 'Username and productId are required' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO favorites (username, productId) VALUES ($1, $2) ON CONFLICT (username, productId) DO NOTHING RETURNING username',
      [username, productId]
    );
    
    if (result.rows.length > 0) {
      analytics.track({
        userId: username,
        event: 'Added to Favorites',
        properties: { productId: parseInt(productId) }
      });
      res.json({ message: 'Added to favorites' });
    } else {
      res.status(400).json({ message: 'Product already in favorites' });
    }
  } catch (err) {
    console.error('Error adding to favorites:', err.message);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

app.get('/api/favorites/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT productId FROM favorites WHERE username = $1',
      [username]
    );
    
    res.json(result.rows.map(row => row.productid));
  } catch (err) {
    console.error('Error fetching favorites:', err.message);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/cart', async (req, res) => {
  const { username, productId } = req.body;
  if (!username || !productId) {
    return res.status(400).json({ error: 'Username and productId are required' });
  }
  
  try {
    await pool.query(
      'INSERT INTO cart (username, productId) VALUES ($1, $2) ON CONFLICT (username, productId) DO NOTHING',
      [username, productId]
    );
    
    analytics.track({
      userId: username,
      event: 'Added to Cart',
      properties: { productId: parseInt(productId) }
    });
    
    res.json({ message: 'Added to cart' });
  } catch (err) {
    console.error('Error adding to cart:', err.message);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.get('/api/cart/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT productId FROM cart WHERE username = $1',
      [username]
    );
    
    res.json(result.rows.map(row => row.productid));
  } catch (err) {
    console.error('Error fetching cart:', err.message);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Delete item from cart
app.delete('/api/cart/:username/:productId', async (req, res) => {
  const { username, productId } = req.params;
  
  try {
    await pool.query(
      'DELETE FROM cart WHERE username = $1 AND productId = $2',
      [username, productId]
    );
    
    analytics.track({
      userId: username,
      event: 'Removed from Cart',
      properties: { productId: parseInt(productId) }
    });
    
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    console.error('Error removing from cart:', err.message);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Update cart quantity
app.put('/api/cart/:username/:productId', async (req, res) => {
  const { username, productId } = req.params;
  const { quantity } = req.body;
  
  if (!quantity || quantity < 0) {
    return res.status(400).json({ error: 'Valid quantity is required' });
  }
  
  try {
    if (quantity === 0) {
      // Remove item if quantity is 0
      await pool.query(
        'DELETE FROM cart WHERE username = $1 AND productId = $2',
        [username, productId]
      );
    } else {
      // Remove existing instances and add new quantity
      await pool.query(
        'DELETE FROM cart WHERE username = $1 AND productId = $2',
        [username, productId]
      );
      
      // Add new quantity
      for (let i = 0; i < quantity; i++) {
        await pool.query(
          'INSERT INTO cart (username, productId) VALUES ($1, $2)',
          [username, productId]
        );
      }
    }
    
    analytics.track({
      userId: username,
      event: 'Updated Cart Quantity',
      properties: { productId: parseInt(productId), quantity: quantity }
    });
    
    res.json({ message: 'Cart updated successfully' });
  } catch (err) {
    console.error('Error updating cart:', err.message);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Clear entire cart for a user
app.delete('/api/cart/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    await pool.query(
      'DELETE FROM cart WHERE username = $1',
      [username]
    );
    
    analytics.track({
      userId: username,
      event: 'Cart Cleared',
      properties: { username: username }
    });
    
    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    console.error('Error clearing cart:', err.message);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

app.post('/api/order', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  try {
    const result = await pool.query(
      'SELECT productId FROM cart WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    analytics.track({
      userId: username,
      event: 'Order Submitted',
      properties: { cart: result.rows.map(row => row.productid) }
    });
    
    await pool.query('DELETE FROM cart WHERE username = $1', [username]);
    res.json({ message: 'Order submitted, cart cleared' });
  } catch (err) {
    console.error('Error submitting order:', err.message);
    res.status(500).json({ error: 'Failed to submit order' });
  }
});

app.get('/api/most-viewed', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT productId, viewCount FROM viewCounts ORDER BY viewCount DESC LIMIT 5'
    );
    
    res.json(result.rows.map(row => row.productid));
  } catch (err) {
    console.error('Error fetching most viewed:', err.message);
    res.status(500).json({ error: 'Failed to fetch most viewed products' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});