require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT;
const Node_ENV = process.env.Node_ENV;

//#region duck-images
// Path for static duck images
const ducksDir = path.join(__dirname, 'ducks');

// Read duck image filenames from folder
let duckImages = fs.readdirSync(ducksDir)
  .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
  .map(file => `/ducks/${file}`);

app.use('/ducks', express.static(path.join(__dirname, 'ducks'), {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (ext === '.jpg' || ext === '.jpeg') {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (ext === '.png') {
            res.setHeader('Content-Type', 'image/png');
        } else if (ext === '.gif') {
            res.setHeader('Content-Type', 'image/gif');
        }
    }
}));
//#endregion duck-images

//#region ratings
// Path for ratings JSON file
const ratingsFile = path.join(__dirname, 'ratings.json');

// Initialize ratings file if it doesn't exist
if (!fs.existsSync(ratingsFile)) {
  fs.writeFileSync(ratingsFile, '{}');
}

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
//#endregion ratings

//#region middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production' 
  }
}));
//#endregion middleware

//#region badges
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

app.get('/api/badges', (req, res) => {
    res.json(badges);
});
//#endregion badges

//#region ratings
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
    
    // Track session ratings
    if (!req.session.ratedDucks) {
        req.session.ratedDucks = [];
    }
    const ratedDucksSet = new Set(req.session.ratedDucks);
    ratedDucksSet.add(imageUrl);
    req.session.ratedDucks = Array.from(ratedDucksSet);
    const ratedCount = req.session.ratedDucks.length;
    
    // Check for new badges
    let newBadge = null;
    Object.keys(badges).forEach(threshold => {
        const numThreshold = parseInt(threshold);
        if (numThreshold <= ratedCount && !req.session.earnedBadges?.includes(badges[numThreshold].name)) {
            newBadge = badges[numThreshold];
            if (!req.session.earnedBadges) {
                req.session.earnedBadges = [];
            }
            req.session.earnedBadges.push(newBadge.name);
        }
    });
    
    res.json({
        success: true,
        averageRating: calculateAverage(ratings[imageUrl]),
        count: ratings[imageUrl].length,
        ratedCount: ratedCount,
        newBadge: newBadge || null
    });
});

// Get ratings for an image
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
//#endregion ratings

//#region click-badge
app.post('/api/click-badge', (req, res) => {
    const { clickCount } = req.body;
    if (!req.session.duckClicks) {
        req.session.duckClicks = 0;
    }
    req.session.duckClicks = Math.max(req.session.duckClicks, clickCount);
    
    let newBadge = null;
    if (clickCount === 1 && !req.session.earnedBadges?.includes('Duck Clicker')) {
        newBadge = badges.first_click;
        if (!req.session.earnedBadges) req.session.earnedBadges = [];
        req.session.earnedBadges.push(newBadge.name);
    } else if (clickCount >= 50 && !req.session.earnedBadges?.includes('Duck Whisperer')) {
        newBadge = badges['fifty_click'];
        if (!req.session.earnedBadges) req.session.earnedBadges = [];
        req.session.earnedBadges.push(newBadge.name);
    } else if (clickCount >= 100 && !req.session.earnedBadges?.includes('Quack Master')) {
        newBadge = badges['hundret_click'];
        if (!req.session.earnedBadges) req.session.earnedBadges = [];
        req.session.earnedBadges.push(newBadge.name);
    } else if (clickCount >= 1000 && !req.session.earnedBadges?.includes('Quack Legend')) {
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
//#endregion click-badge

// API Endpoint: Returns random duck as JSON
// Use in terminal: curl "https://duck-api.j-p-k.de/api/duck"
app.get('/api/duck', (req, res) => {
  if (duckImages.length === 0) {
    return res.status(500).json({ error: 'No duck images found' });
  }

  const randomDuck = duckImages[Math.floor(Math.random() * duckImages.length)];
  const fullUrl = `${req.protocol}://${req.get('host')}${randomDuck}`;
  res.json({ image: fullUrl });
});

// Web Page Endpoint: Renders the main page
app.get('/duck', (req, res) => {
  if (duckImages.length === 0) {
    return res.send('<h1>No ducks available 🦆😢</h1>');
  }
  res.sendFile(path.join(__dirname, 'public', 'duck.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Duck API running at http://localhost:${PORT}`);
});
