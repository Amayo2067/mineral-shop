const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    
    // Create tables
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS favorites (
          username TEXT,
          productId INTEGER,
          PRIMARY KEY (username, productId),
          FOREIGN KEY (username) REFERENCES users(username)
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS cart (
          username TEXT,
          productId INTEGER,
          PRIMARY KEY (username, productId),
          FOREIGN KEY (username) REFERENCES users(username)
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS viewCounts (
          productId INTEGER PRIMARY KEY,
          viewCount INTEGER DEFAULT 0
        )
      `);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY,
          name TEXT,
          price REAL,
          image TEXT,
          description TEXT
        )
      `);
      
      // Check if products table is empty and seed if needed
      db.get('SELECT COUNT(*) AS count FROM products', (err, row) => {
        if (err) {
          console.error('Error checking products:', err.message);
        } else if (row.count === 0) {
          const products = [
            { id: 1, name: 'Quartz', price: 50.00, image: '/images/mineral1.png', description: 'A stunning clear quartz crystal, perfect for collectors.' },
            { id: 2, name: 'Lava Crystal', price: 70.00, image: '/images/mineral2.png', description: 'A vibrant amethyst geode with deep purple hues.' },
            { id: 3, name: 'Ocean Crystal', price: 30.00, image: '/images/mineral3.png', description: 'A soft pink rose quartz, symbolizing love.' },
            { id: 4, name: 'Thunder Crystal', price: 40.00, image: '/images/mineral4.png', description: 'A bright citrine cluster, radiating positivity.' },
            { id: 5, name: 'Moss Crystal', price: 90.00, image: '/images/mineral5.png', description: 'A sleek black obsidian stone, grounding and protective.' }
          ];
          
          const insertProduct = db.prepare('INSERT OR IGNORE INTO products (id, name, price, image, description) VALUES (?, ?, ?, ?, ?)');
          products.forEach(product => {
            db.run('INSERT OR IGNORE INTO products (id, name, price, image, description) VALUES (?, ?, ?, ?, ?)', 
              [product.id, product.name, product.price, product.image, product.description]);
          });
          console.log('Products table seeded.');
        } else {
          console.log('Products table already has data.');
        }
      });
    });
  }
});

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
  
  db.run('INSERT OR IGNORE INTO users (username) VALUES (?)', [username], function(err) {
    if (err) {
      console.error('Error registering user:', err.message);
      res.status(500).json({ error: 'Registration failed' });
    } else {
      analytics.identify({ userId: username });
      res.json({ message: 'User registered', username });
    }
  });
});

app.post('/api/view/:productId', (req, res) => {
  const { productId } = req.params;
  
  db.serialize(() => {
    db.run('INSERT OR IGNORE INTO viewCounts (productId, viewCount) VALUES (?, 0)', [productId]);
    db.run('UPDATE viewCounts SET viewCount = viewCount + 1 WHERE productId = ?', [productId]);
    
    db.get('SELECT viewCount FROM viewCounts WHERE productId = ?', [productId], (err, row) => {
      if (err) {
        console.error('Error tracking view:', err.message);
        res.status(500).json({ error: 'Failed to track view' });
      } else {
        analytics.track({
          userId: req.body.username || 'anonymous',
          event: 'Product Viewed',
          properties: { productId: parseInt(productId), viewCount: row.viewCount }
        });
        res.json({ message: 'View tracked', viewCount: row.viewCount });
      }
    });
  });
});

app.post('/api/favorites', (req, res) => {
  const { username, productId } = req.body;
  if (!username || !productId) {
    return res.status(400).json({ error: 'Username and productId are required' });
  }
  
  db.run('INSERT OR IGNORE INTO favorites (username, productId) VALUES (?, ?)', [username, productId], function(err) {
    if (err) {
      console.error('Error adding to favorites:', err.message);
      res.status(500).json({ error: 'Failed to add to favorites' });
    } else if (this.changes > 0) {
      analytics.track({
        userId: username,
        event: 'Added to Favorites',
        properties: { productId: parseInt(productId) }
      });
      res.json({ message: 'Added to favorites' });
    } else {
      res.status(400).json({ message: 'Product already in favorites' });
    }
  });
});

app.get('/api/favorites/:username', (req, res) => {
  const { username } = req.params;
  
  db.all('SELECT productId FROM favorites WHERE username = ?', [username], (err, rows) => {
    if (err) {
      console.error('Error fetching favorites:', err.message);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    } else {
      res.json(rows.map(row => row.productId));
    }
  });
});

app.post('/api/cart', (req, res) => {
  const { username, productId } = req.body;
  if (!username || !productId) {
    return res.status(400).json({ error: 'Username and productId are required' });
  }
  
  db.run('INSERT INTO cart (username, productId) VALUES (?, ?)', [username, productId], function(err) {
    if (err) {
      console.error('Error adding to cart:', err.message);
      res.status(500).json({ error: 'Failed to add to cart' });
    } else {
      analytics.track({
        userId: username,
        event: 'Added to Cart',
        properties: { productId: parseInt(productId) }
      });
      res.json({ message: 'Added to cart' });
    }
  });
});

app.get('/api/cart/:username', (req, res) => {
  const { username } = req.params;
  
  db.all('SELECT productId FROM cart WHERE username = ?', [username], (err, rows) => {
    if (err) {
      console.error('Error fetching cart:', err.message);
      res.status(500).json({ error: 'Failed to fetch cart' });
    } else {
      res.json(rows.map(row => row.productId));
    }
  });
});

app.post('/api/order', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  db.all('SELECT productId FROM cart WHERE username = ?', [username], (err, rows) => {
    if (err) {
      console.error('Error submitting order:', err.message);
      res.status(500).json({ error: 'Failed to submit order' });
    } else if (rows.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
    } else {
      analytics.track({
        userId: username,
        event: 'Order Submitted',
        properties: { cart: rows.map(row => row.productId) }
      });
      
      db.run('DELETE FROM cart WHERE username = ?', [username], function(err) {
        if (err) {
          console.error('Error clearing cart:', err.message);
        }
        res.json({ message: 'Order submitted, cart cleared' });
      });
    }
  });
});

app.get('/api/most-viewed', (req, res) => {
  db.all('SELECT productId, viewCount FROM viewCounts ORDER BY viewCount DESC LIMIT 5', (err, rows) => {
    if (err) {
      console.error('Error fetching most viewed:', err.message);
      res.status(500).json({ error: 'Failed to fetch most viewed products' });
    } else {
      res.json(rows.map(row => row.productId));
    }
  });
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err.message);
      res.status(500).json({ error: 'Failed to fetch products' });
    } else {
      res.json(rows);
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});