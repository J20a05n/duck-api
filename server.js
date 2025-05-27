const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4805;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // for parsing application/json

// Serve static duck images
const ducksDir = path.join(__dirname, 'ducks');
app.use('/ducks', express.static(ducksDir));

// Path for ratings JSON file
const ratingsFile = path.join(__dirname, 'ratings.json');

// Initialize ratings file if it doesn't exist
if (!fs.existsSync(ratingsFile)) {
  fs.writeFileSync(ratingsFile, '{}');
}

// Read duck image filenames from folder
let duckImages = [];

function loadDuckImages() {
  const files = fs.readdirSync(ducksDir);
  duckImages = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
                    .map(file => `/ducks/${file}`);
}

loadDuckImages();

// Helper function to read ratings
function readRatings() {
  try {
    const data = fs.readFileSync(ratingsFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading ratings file:', err);
    return {};
  }
}

// Helper function to write ratings
function writeRatings(ratings) {
  try {
    fs.writeFileSync(ratingsFile, JSON.stringify(ratings, null, 2));
  } catch (err) {
    console.error('Error writing ratings file:', err);
  }
}

// API Endpoint: Save rating for an image
app.post('/api/rate', (req, res) => {
  const { imageUrl, rating } = req.body;
  
  if (!imageUrl || !rating || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Invalid rating data' });
  }
  
  const ratings = readRatings();
  
  if (!ratings[imageUrl]) {
    ratings[imageUrl] = [];
  }
  
  ratings[imageUrl].push(parseInt(rating));
  writeRatings(ratings);
  
  res.json({ 
    success: true, 
    averageRating: calculateAverage(ratings[imageUrl]),
    count: ratings[imageUrl].length
  });
});

// API Endpoint: Get ratings for an image
app.get('/api/ratings', (req, res) => {
  const { imageUrl } = req.query;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL required' });
  }
  
  const ratings = readRatings();
  const imageRatings = ratings[imageUrl] || [];
  
  res.json({
    count: imageRatings.length,
    average: calculateAverage(imageRatings)
  });
});

function calculateAverage(ratingsArray) {
  if (ratingsArray.length === 0) return 0;
  const sum = ratingsArray.reduce((a, b) => a + b, 0);
  return (sum / ratingsArray.length).toFixed(1);
}

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
          background:rgb(221, 251, 234);
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
        .rating-container {
          margin: 20px 0;
        }
        .rating-buttons {
          display: flex;
          justify-content: center;
          gap: 5px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .rating-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #66bb6a;
          background: white;
          color: #66bb6a;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
        }
        .rating-btn:hover {
          background: #66bb6a;
          color: white;
        }
        .rating-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f0f0f0;
          color: #999;
          border-color: #ccc;
        }
        .rating-info {
          margin-top: 10px;
          font-size: 0.9em;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>Here's a duck for you 🦆</h1>
      <img src="${fullUrl}" alt="Random duck" id="duck-image" />
      <div class="rating-container">
        <div>Rate this duck:</div>
        <div class="rating-buttons" id="rating-buttons">
          ${Array.from({length: 10}, (_, i) => i + 1)
            .map(num => `<button class="rating-btn" data-rating="${num}">${num}</button>`)
            .join('')}
        </div>
        <div class="rating-info" id="rating-info"></div>
      </div>
      <br>
      <form method="get" action="/duck">
        <button type="submit">New Duck</button>
      </form>

      <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
      
      <script>
        const duckImage = document.getElementById('duck-image');
        const ratingInfo = document.getElementById('rating-info');
        const ratingButtons = document.getElementById('rating-buttons');
        const currentImageUrl = duckImage.src;
        
        // Load existing ratings
        fetch(\`/api/ratings?imageUrl=\${encodeURIComponent(currentImageUrl)}\`)
          .then(res => res.json())
          .then(data => {
            if (data.count > 0) {
              ratingInfo.textContent = \`Average rating: \${data.average} (from \${data.count} votes)\`;
              //disableAllRatingButtons();
            }
          });
        
        // Function to disable all rating buttons
        function disableAllRatingButtons() {
          const buttons = ratingButtons.querySelectorAll('.rating-btn');
          buttons.forEach(button => {
            button.disabled = true;
          });
        }
        
        // Handle rating clicks
        ratingButtons.addEventListener('click', async (e) => {
          if (!e.target.classList.contains('rating-btn')) return;
          if (e.target.disabled) return;
          
          const rating = parseInt(e.target.dataset.rating);
          
          try {
            const response = await fetch('/api/rate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageUrl: currentImageUrl,
                rating: rating
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              // Show confetti
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
              
              // Update rating info
              ratingInfo.textContent = \`You rated this duck \${rating}. The average rating of this duck is: \${result.averageRating} (from \${result.count} votes)\`;
              
              // Disable all rating buttons
              disableAllRatingButtons();
            }
          } catch (error) {
            console.error('Error submitting rating:', error);
            ratingInfo.textContent = 'Error submitting rating. Please try again.';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Duck API running at http://localhost:${PORT}`);
});
