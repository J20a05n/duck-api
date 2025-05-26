const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4805;

app.use(express.static(path.join(__dirname, 'public')));

// Serve static duck images
const ducksDir = path.join(__dirname, 'ducks');
app.use('/ducks', express.static(ducksDir));

// Read duck image filenames from folder
let duckImages = [];

function loadDuckImages() {
  const files = fs.readdirSync(ducksDir);
  duckImages = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
                    .map(file => `/ducks/${file}`);
}

loadDuckImages();

// API Endpoint: Returns random duck as JSON
app.get('/api/duck', (req, res) => {
  if (duckImages.length === 0) {
    return res.status(500).json({ error: 'No duck images found' });
  }

  const randomDuck = duckImages[Math.floor(Math.random() * duckImages.length)];
  const fullUrl = `${req.protocol}://${req.get('host')}${randomDuck}`;
  res.json({ image: fullUrl });
});

// Web Page Endpoint: Renders a page with a random duck
app.get('/duck', (req, res) => {
  if (duckImages.length === 0) {
    return res.send('<h1>No ducks available 🦆😢</h1>');
  }

  const randomDuck = duckImages[Math.floor(Math.random() * duckImages.length)];
  const fullUrl = `${req.protocol}://${req.get('host')}${randomDuck}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>🦆 Random Duck API</title>
      <link rel="icon" href="/favicon.ico" type="image/x-icon">
      <style>
        body {
          font-family: sans-serif;
          text-align: center;
          padding: 2rem;
          background: #eafaf1;
        }
        img {
          max-width: 90vw;
          height: auto;
          border-radius: 8px;
        }
        button {
          margin-top: 1rem;
          padding: 10px 20px;
          font-size: 1rem;
          background-color: #66bb6a;
          border: none;
          border-radius: 5px;
          color: white;
          cursor: pointer;
        }
        button:hover {
          background-color: #4caf50;
        }
      </style>
    </head>
    <body>
      <h1>Here’s a duck for you 🦆</h1>
      <img src="${fullUrl}" alt="Random duck" />
      <br>
      <form method="get" action="/duck">
        <button type="submit">New Duck</button>
      </form>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Duck API running at http://localhost:${PORT}`);
});
