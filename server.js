require('dotenv').config();
const express = require('express');
const session = require('express-session');
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

// Add session middleware (before your routes)
app.use(session({
  secret: process.env.SESSION_SECRET, // Change this to a real secret in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Define badge information
const badges = {
  1: {
    name: "Duck Starter",
    description: "Rated your first duck!",
    image: "assets/badges/badge-1.png"
  },
  10: {
    name: "Duck Enthusiast",
    description: "Rated 10 ducks!",
    image: "assets/badges/badge-2.png"
  },
  25: {
    name: "Duck Master",
    description: "Rated 25 ducks!",
    image: "assets/badges/badge-3.png"
  },
  50: {
    name: "Duck Legend",
    description: "Rated 50 ducks!",
    image: "assets/badges/badge-4.png"
  },
  first_click: {
    name: "Duck Clicker",
    description: "Clicked your first duck!",
    image: "assets/badges/badge-4.png"
  },
  fifty_click: {
    name: "Duck Whisperer",
    description: "Clicked ducks 50 times!",
    image: "assets/badges/badge-5.png"
  },
  hundret_click: {
    name: "Quack Master",
    description: "Clicked ducks 100 times!",
    image: "assets/badges/badge-6.png"
  },
  thousand_click: {
    name: "Quack Legend",
    description: "Clicked ducks 1000 times!",
    image: "assets/badges/badge-7.png"
  }
};

app.post('/api/click-badge', (req, res) => {
  const { clickCount } = req.body;
  
  // Initialize session click tracking if needed
  if (!req.session.duckClicks) {
    req.session.duckClicks = 0;
  }
  
  // Update click count
  req.session.duckClicks = Math.max(req.session.duckClicks, clickCount);
  
  let newBadge = null;
  
  // Check for badge eligibility
  if (clickCount === 1 && !req.session.earnedBadges?.includes('Duck Clicker')) {
    newBadge = badges.first_click;
    if (!req.session.earnedBadges) req.session.earnedBadges = [];
    req.session.earnedBadges.push(newBadge.name);
  } 
  else if (clickCount >= 50 && !req.session.earnedBadges?.includes('Duck Whisperer')) {
    newBadge = badges['fifty_click'];
    if (!req.session.earnedBadges) req.session.earnedBadges = [];
    req.session.earnedBadges.push(newBadge.name);
  }
  else if (clickCount >= 100 && !req.session.earnedBadges?.includes('Quack Master')) {
    newBadge = badges['hundret_click'];
    if (!req.session.earnedBadges) req.session.earnedBadges = [];
    req.session.earnedBadges.push(newBadge.name);
  }
  else if (clickCount >= 1000 && !req.session.earnedBadges?.includes('Quack Legend')) {
    newBadge = badges['thousand_click'];
    if (!req.session.earnedBadges) req.session.earnedBadges = [];
    req.session.earnedBadges.push(newBadge.name);
  }
  
  res.json({
    success: true,
    newBadge: newBadge || null,
    totalClicks: req.session.duckClicks
  });
});

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
  
  // Track session ratings - initialize as Set if not exists
  if (!req.session.ratedDucks) {
    req.session.ratedDucks = [];
  }
  
  // Convert to Set for easy manipulation, then back to array for session storage
  const ratedDucksSet = new Set(req.session.ratedDucks);
  ratedDucksSet.add(imageUrl);
  req.session.ratedDucks = Array.from(ratedDucksSet);
  
  const ratedCount = req.session.ratedDucks.length;
  
  // Check for new badges
  const newBadge = Object.keys(badges)
    .filter(threshold => threshold <= ratedCount)
    .map(threshold => badges[threshold])
    .find(badge => !req.session.earnedBadges?.includes(badge.name));
  
  // Initialize earned badges if needed
  if (!req.session.earnedBadges) {
    req.session.earnedBadges = [];
  }
  
  // If new badge earned, add it to session
  if (newBadge && !req.session.earnedBadges.includes(newBadge.name)) {
    req.session.earnedBadges.push(newBadge.name);
  }
  
  res.json({ 
    success: true, 
    averageRating: calculateAverage(ratings[imageUrl]),
    count: ratings[imageUrl].length,
    ratedCount: ratedCount,
    newBadge: newBadge || null
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
      <link rel="icon" href="/assets/favicon.ico" type="image/x-icon">
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
        .badge-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          transform: translateX(200%);
          transition: transform 0.3s ease-out;
          z-index: 1000;
          border-left: 5px solid #66bb6a;
        }
        
        .badge-notification.show {
          transform: translateX(0);
        }
        
        .badge-notification img {
          width: 40px;
          height: 40px;
        }
        
        .badge-notification .badge-content {
          display: flex;
          flex-direction: column;
        }
        
        .badge-notification .badge-title {
          font-weight: bold;
          font-size: 1.1em;
        }
        
        .badge-notification .badge-desc {
          font-size: 0.8em;
          color: #666;
        }
        
        #duck-image {
          cursor: pointer;
          transition: transform 0.2s;
        }
        #duck-image:hover {
          transform: scale(1.02);
        }
        #duck-image:active {
          transform: scale(0.98);
        }
      </style>
    </head>
    <body>
      <audio id="quack-sound" src="/sounds/quack.mp3" preload="auto"></audio>
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

        function showBadgeNotification(badge) {
          const container = document.getElementById('badge-notification-container');
          
          const notification = document.createElement('div');
          notification.className = 'badge-notification';
          notification.innerHTML = 
            '<img src="' + badge.image + '" alt="' + badge.name + '">' +
            '<div class="badge-content">' +
              '<div class="badge-title">' + badge.name + '</div>' +
              '<div class="badge-desc">' + badge.description + '</div>' +
            '</div>';
          
          container.appendChild(notification);
          
          // Trigger the animation
          setTimeout(() => {
            notification.classList.add('show');
          }, 10);
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
              notification.remove();
            }, 300);
          }, 5000);
        }
        
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
              ratingInfo.textContent = 'You rated this duck ' + rating + 
              '. The average rating of this duck is: ' + result.averageRating + 
              ' (from ' + result.count + ' votes)';

              // Disable all rating buttons
              disableAllRatingButtons();
              
              // Show badge notification if earned
              if (result.newBadge) {
                showBadgeNotification(result.newBadge);
              }
            }
          } catch (error) {
            console.error('Error submitting rating:', error);
            ratingInfo.textContent = 'Error submitting rating. Please try again.';
          }
        });
          const quackSound = document.getElementById('quack-sound');
          
          // Track clicks in sessionStorage
          if (!sessionStorage.duckClicks) {
            sessionStorage.duckClicks = 0;
          }
          
          duckImage.addEventListener('click', async function() {
            // Play quack sound
            quackSound.currentTime = 0;
            quackSound.play();
            
            // Increment click count
            const clickCount = parseInt(sessionStorage.duckClicks) + 1;
            sessionStorage.duckClicks = clickCount;
            
            // Check for badge eligibility
            if (clickCount === 1 || clickCount === 50 || clickCount === 100 || clickCount === 1000) {
              try {
                const response = await fetch('/api/click-badge', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    clickCount: clickCount
                  })
                });
                
                const result = await response.json();
                
                if (result.newBadge) {
                  showBadgeNotification(result.newBadge);
                }
              } catch (error) {
                console.error('Error reporting click:', error);
              }
            }
          });
      </script>
      <div id="badge-notification-container"></div>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Duck API running at http://localhost:${PORT}`);
});
