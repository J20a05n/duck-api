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
        newBadge = badges['first_click'];
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

//#region leaderboard
// Path for leaderboard JSON file
const leaderboardFile = path.join(__dirname, 'leaderboard.json');

// Initialize leaderboard file if it doesn't exist
if (!fs.existsSync(leaderboardFile)) {
  fs.writeFileSync(leaderboardFile, '[]');
}

// Helper function to read leaderboard
function readLeaderboard() {
  try {
    const data = fs.readFileSync(leaderboardFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading leaderboard file:', err);
    return [];
  }
}

// Helper function to write leaderboard
function writeLeaderboard(leaderboard) {
  try {
    fs.writeFileSync(leaderboardFile, JSON.stringify(leaderboard, null, 2));
  } catch (err) {
    console.error('Error writing leaderboard file:', err);
  }
}

// Duck-related names for random assignment
const duckNames = [
  "Quackers", "Waddles", "Puddles", "Daffy", "Howard", "Mallard", 
  "Feathers", "Bill", "Webby", "Floaty", "Splash", "Bubbles",
  "Rainbow", "Sunny", "Pebbles", "Ripple", "Ducky", "Donald",
  "Goose", "Paddle", "Drizzle", "Misty", "Squeaky", "Chirpy"
];

// Generate a random duck username
function generateDuckUsername() {
  const name = duckNames[Math.floor(Math.random() * duckNames.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${name}#${num.toString().padStart(3, '0')}`;
}

// Get or create user in leaderboard
app.get('/api/leaderboard/user', (req, res) => {
  let leaderboard = readLeaderboard();
  
  // Check if user already has an ID in session
  if (!req.session.userId) {
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username: generateDuckUsername(),
      clicks: 0,
      ducksRated: 0,
      lastActive: new Date().toISOString()
    };
    
    // Add to leaderboard
    leaderboard.push(newUser);
    writeLeaderboard(leaderboard);
    
    // Store user ID in session
    req.session.userId = newUser.id;
  }
  
  // Find user in leaderboard
  const user = leaderboard.find(u => u.id === req.session.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// Update user stats
app.post('/api/leaderboard/update', (req, res) => {
  const { clicks, ducksRated } = req.body;
  
  if (!req.session.userId) {
    return res.status(400).json({ error: 'User not initialized' });
  }
  
  let leaderboard = readLeaderboard();
  const userIndex = leaderboard.findIndex(u => u.id === req.session.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update stats
  if (clicks !== undefined) {
    leaderboard[userIndex].clicks = Math.max(leaderboard[userIndex].clicks, clicks);
  }
  if (ducksRated !== undefined) {
    leaderboard[userIndex].ducksRated = Math.max(leaderboard[userIndex].ducksRated, ducksRated);
  }
  
  leaderboard[userIndex].lastActive = new Date().toISOString();
  writeLeaderboard(leaderboard);
  
  res.json({ success: true });
});

// Get full leaderboard
app.get('/api/leaderboard', (req, res) => {
  let leaderboard = readLeaderboard();
  
  // Sort by clicks (descending), then by ducks rated (descending)
  leaderboard.sort((a, b) => {
    if (b.clicks !== a.clicks) return b.clicks - a.clicks;
    return b.ducksRated - a.ducksRated;
  });
  
  res.json(leaderboard);
});
//#endregion leaderboard

//#region store
// Path for user data JSON file
const usersFile = path.join(__dirname, 'users.json');

// Initialize users file if it doesn't exist
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, '{}');
}

// Store items
const storeItems = {
  quack_sound: {
    id: "quack_sound",
    name: "Premium Quack",
    description: "A fancy new quack sound effect!",
    price: 50,
    type: "sound"
  },
  duck_cursor: {
    id: "duck_cursor",
    name: "Duck Cursor",
    description: "Make your cursor more ducky!",
    price: 100,
    type: "cursor"
  },
  duck_pet: {
    id: "duck_pet",
    name: "Duck Pet",
    description: "A little duck that follows your mouse!",
    price: 500,
    type: "pet"
  }
};

app.get('/api/store/items', (req, res) => {
  res.json(storeItems); 
});

// Helper function to read user data
function readUserData() {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading user data:', err);
    return {};
  }
}

// Helper function to write user data
function writeUserData(data) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing user data:', err);
  }
}

// Get user's points and unlocked items
app.get('/api/user/inventory', (req, res) => {
  if (!req.session.userId) {
    return res.status(400).json({ error: 'User not initialized' });
  }

  const users = readUserData();
  const user = users[req.session.userId] || { 
    points: 0, 
    inventory: [] 
  };

  res.json(user);
});

// Purchase item
app.post('/api/store/purchase', (req, res) => {
  const { itemId } = req.body;
  
  if (!req.session.userId || !storeItems[itemId]) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const users = readUserData();
  const user = users[req.session.userId] || { points: 0, inventory: [] };

  // Check if already owned
  if (user.inventory.includes(itemId)) {
    return res.status(400).json({ error: 'Item already owned' });
  }

  // Check if enough points
  if (user.points < storeItems[itemId].price) {
    return res.status(400).json({ error: 'Not enough points' });
  }

  // Deduct points and add to inventory
  user.points -= storeItems[itemId].price;
  user.inventory.push(itemId);
  users[req.session.userId] = user;
  writeUserData(users);

  res.json({ 
    success: true, 
    newPoints: user.points,
    inventory: user.inventory 
  });
});

// Update user points (call this when rating ducks)
app.post('/api/user/add-points', (req, res) => {
  const { points } = req.body;
  
  if (!req.session.userId || !points) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const users = readUserData();
  const user = users[req.session.userId] || { points: 0, inventory: [] };

  user.points += parseInt(points);
  users[req.session.userId] = user;
  writeUserData(users);

  res.json({ 
    success: true, 
    newPoints: user.points 
  });
});
//#endregion store

app.get('/api/credits', (req, res) => {
  const creditsFile = path.join(__dirname, 'credits.json');
  try {
    const data = fs.readFileSync(creditsFile, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading credits file:', err);
    res.status(500).json({});
  }
});

// Helper function to read credits file
function getCredits() {
    const creditsFile = path.join(__dirname, 'credits.json');
    try {
        const data = fs.readFileSync(creditsFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading credits file:', err);
        return {};
    }
}

// API Endpoint: Returns random duck as JSON
// Use in terminal: curl "https://duck-api.j-p-k.de/api/duck"
app.get('/api/duck', (req, res) => {
    // Check if we have duck images
    if (duckImages.length === 0) {
        return res.status(500).json({ 
            error: 'No duck images found',
            attribution: null 
        });
    }

    // Select random duck image
    const randomDuck = duckImages[Math.floor(Math.random() * duckImages.length)];
    
    // Extract filename from URL path
    const fileName = randomDuck.split('/').pop();

    // Get credits information
    const credits = getCredits();
    
    // Prepare attribution data
    let attribution = null;
    if (credits[fileName]) {
        attribution = {
            title: credits[fileName].title,
            author: credits[fileName].author,
            license: credits[fileName].license,
            source: credits[fileName].source
        };
    }

    // Construct full URL
    const fullUrl = `${req.protocol}://${req.get('host')}${randomDuck}`;

    // Return response with attribution
    res.json({
        image: fullUrl,
        attribution: attribution
    });
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
