const express = require('express');
const Database = require('better-sqlite3');
const { Analytics } = require('@segment/analytics-node');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Segment Analytics
const analytics = new Analytics({
  writeKey: 'L6lRRM0amDLguOaQFUZ9KffuyucYdUB', // Replace with your Segment Write Key or leave as is for now
  flushAt: 1 // Flush events immediately for testing
});

// Initialize SQLite database
const db = new Database('./database.db');
console.log('Connected to SQLite database.');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY
  );
  
  CREATE TABLE IF NOT EXISTS favorites (
    username TEXT,
    productId INTEGER,
    PRIMARY KEY (username, productId),
    FOREIGN KEY (username) REFERENCES users(username)
  );
  
  CREATE TABLE IF NOT EXISTS cart (
    username TEXT,
    productId INTEGER,
    PRIMARY KEY (username, productId),
    FOREIGN KEY (username) REFERENCES users(username)
  );
  
  CREATE TABLE IF NOT EXISTS viewCounts (
    productId INTEGER PRIMARY KEY,
    viewCount INTEGER DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL,
    image TEXT,
    description TEXT
  );
`);

// Check if products table is empty and seed if needed
const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get();
if (productCount.count === 0) {
  const products = [
    { id: 1, name: 'Quartz', price: 50.00, image: '/images/mineral1.png', description: 'A stunning clear quartz crystal, perfect for collectors.' },
    { id: 2, name: 'Lava Crystal', price: 70.00, image: '/images/mineral2.png', description: 'A vibrant amethyst geode with deep purple hues.' },
    { id: 3, name: 'Ocean Crystal', price: 30.00, image: '/images/mineral3.png', description: 'A soft pink rose quartz, symbolizing love.' },
    { id: 4, name: 'Thunder Crystal', price: 40.00, image: '/images/mineral4.png', description: 'A bright citrine cluster, radiating positivity.' },
    { id: 5, name: 'Moss Crystal', price: 90.00, image: '/images/mineral5.png', description: 'A sleek black obsidian stone, grounding and protective.' }
  ];
  
  const insertProduct = db.prepare('INSERT OR IGNORE INTO products (id, name, price, image, description) VALUES (?, ?, ?, ?, ?)');
  const insertMany = db.transaction((products) => {
    for (const product of products) {
      insertProduct.run(product.id, product.name, product.price, product.image, product.description);
    }
  });
  
  insertMany(products);
  console.log('Products table seeded.');
} else {
  console.log('Products table already has data.');
}

// Middleware
app.use(express.json());
// Edit this line to serve the static files from the current directory
app.use(express.static(__dirname));

// API Endpoints
app.post('/api/register', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO users (username) VALUES (?)');
    const result = stmt.run(username);
    analytics.identify({ userId: username });
    res.json({ message: 'User registered', username });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/view/:productId', (req, res) => {
  const { productId } = req.params;
  try {
    db.prepare('INSERT OR IGNORE INTO viewCounts (productId, viewCount) VALUES (?, 0)').run(productId);
    db.prepare('UPDATE viewCounts SET viewCount = viewCount + 1 WHERE productId = ?').run(productId);
    const row = db.prepare('SELECT viewCount FROM viewCounts WHERE productId = ?').get(productId);
    
    analytics.track({
      userId: req.body.username || 'anonymous',
      event: 'Product Viewed',
      properties: { productId: parseInt(productId), viewCount: row.viewCount }
    });
    res.json({ message: 'View tracked', viewCount: row.viewCount });
  } catch (err) {
    console.error('Error tracking view:', err.message);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

app.post('/api/favorites', (req, res) => {
  const { username, productId } = req.body;
  if (!username || !productId) {
    return res.status(400).json({ error: 'Username and productId are required' });
  }
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO favorites (username, productId) VALUES (?, ?)');
    const result = stmt.run(username, productId);
    
    if (result.changes > 0) {
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

app.get('/api/favorites/:username', (req, res) => {
  const { username } = req.params;
  try {
    const rows = db.prepare('SELECT productId FROM favorites WHERE username = ?').all(username);
    res.json(rows.map(row => row.productId));
  } catch (err) {
    console.error('Error fetching favorites:', err.message);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/cart', (req, res) => {
  const { username, productId } = req.body;
  if (!username || !productId) {
    return res.status(400).json({ error: 'Username and productId are required' });
  }
  try {
    const stmt = db.prepare('INSERT INTO cart (username, productId) VALUES (?, ?)');
    stmt.run(username, productId);
    
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

app.get('/api/cart/:username', (req, res) => {
  const { username } = req.params;
  try {
    const rows = db.prepare('SELECT productId FROM cart WHERE username = ?').all(username);
    res.json(rows.map(row => row.productId));
  } catch (err) {
    console.error('Error fetching cart:', err.message);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/order', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  try {
    const rows = db.prepare('SELECT productId FROM cart WHERE username = ?').all(username);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    analytics.track({
      userId: username,
      event: 'Order Submitted',
      properties: { cart: rows.map(row => row.productId) }
    });
    
    db.prepare('DELETE FROM cart WHERE username = ?').run(username);
    res.json({ message: 'Order submitted, cart cleared' });
  } catch (err) {
    console.error('Error submitting order:', err.message);
    res.status(500).json({ error: 'Failed to submit order' });
  }
});

app.get('/api/most-viewed', (req, res) => {
  try {
    const rows = db.prepare('SELECT productId, viewCount FROM viewCounts ORDER BY viewCount DESC LIMIT 5').all();
    res.json(rows.map(row => row.productId));
  } catch (err) {
    console.error('Error fetching most viewed:', err.message);
    res.status(500).json({ error: 'Failed to fetch most viewed products' });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM products').all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});