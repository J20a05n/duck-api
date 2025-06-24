let earnedBadges = JSON.parse(sessionStorage.getItem('earnedBadges') || '[]');
let badges = {};

async function loadBadges() {
    try {
        const response = await fetch('/api/badges');
        badges = await response.json();
    } catch (error) {
        console.error('Error loading badges:', error);
        // Provide default badges if loading fails
        badges = {
            1: { name: "Duck Starter", description: "Rated your first duck!", image: "assets/badges/badge-1.png" },
            10: { name: "Duck Enthusiast", description: "Rated 10 ducks!", image: "assets/badges/badge-2.png" },
            25: { name: "Duck Master", description: "Rated 25 ducks!", image: "assets/badges/badge-3.png" },
            50: { name: "Duck Legend", description: "Rated 50 ducks!", image: "assets/badges/badge-4.png" },
            first_click: { name: "Duck Clicker", description: "Clicked your first duck!", image: "assets/badges/badge-4.png" },
            fifty_click: { name: "Duck Whisperer", description: "Clicked ducks 50 times!", image: "assets/badges/badge-5.png" },
            hundret_click: { name: "Quack Master", description: "Clicked ducks 100 times!", image: "assets/badges/badge-6.png" },
            thousand_click: { name: "Quack Legend", description: "Clicked ducks 1000 times!", image: "assets/badges/badge-7.png" }
        };
    }
}

function updateNewDuckButton() {
    const newDuckButton = document.getElementById('new-duck-button');
    const earnedBadges = JSON.parse(sessionStorage.getItem('earnedBadges') || '[]');
    
    // Remove all custom classes
    newDuckButton.classList.remove('custom', 'custom-2', 'custom-3', 'custom-4');
    
    // Apply appropriate class based on number of achievements
    if (earnedBadges.length >= 7) {
        newDuckButton.classList.add('custom-4');
    } else if (earnedBadges.length >= 5) {
        newDuckButton.classList.add('custom-3');
    } else if (earnedBadges.length >= 3) {
        newDuckButton.classList.add('custom-2');
    } else if (earnedBadges.length >= 1) {
        newDuckButton.classList.add('custom');
    }
}

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

function updateBadgesList() {
    // Get earned badges from sessionStorage
    const earnedBadges = JSON.parse(sessionStorage.getItem('earnedBadges') || '[]');
    
    // Clear existing badges
    const badgesList = document.getElementById('badges-list');
    badgesList.innerHTML = '';
    
    // Add all possible badges to the list
    Object.values(badges).forEach(badge => {
        const isEarned = earnedBadges.includes(badge.name);
        const badgeItem = document.createElement('div');
        badgeItem.className = 'badge-item ' + (isEarned ? '' : 'locked');
        badgeItem.innerHTML =
            '<img src="' + badge.image + '" alt="' + badge.name + '">' +
            '<div class="badge-info">' +
                '<div class="badge-name">' + badge.name + '</div>' +
                '<div class="badge-desc">' + badge.description + '</div>' +
            '</div>' +
            (isEarned ? '✅' : '🔒');
        badgesList.appendChild(badgeItem);
    });
}

function disableAllRatingButtons() {
    const buttons = document.querySelectorAll('.rating-btn');
    buttons.forEach(button => {
        button.disabled = true;
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadBadges();
    updateBadgesList();
    updateNewDuckButton();

    const duckImage = document.getElementById('duck-image');
    const ratingInfo = document.getElementById('rating-info');
    const ratingButtons = document.getElementById('rating-buttons');
    const quackSound = document.getElementById('quack-sound');
    const menuButton = document.getElementById('menu-button');
    const achievementsPanel = document.getElementById('achievements-panel');

    // Load random duck image
    fetch('/api/duck')
        .then(response => response.json())
        .then(data => {
            duckImage.src = data.image;
        });

    // Load existing ratings for current image
    duckImage.addEventListener('load', () => {
        fetch(`/api/ratings?imageUrl=${encodeURIComponent(duckImage.src)}`)
            .then(res => res.json())
            .then(data => {
                if (data.count > 0) {
                    ratingInfo.textContent = `Average rating: ${data.average} (from ${data.count} votes)`;
                }
            });
    });

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
                    imageUrl: duckImage.src,
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
                ratingInfo.textContent = `You rated this duck ${rating}. The average rating of this duck is: ${result.averageRating} (from ${result.count} votes)`;

                // Disable all rating buttons
                disableAllRatingButtons();
                await updateUserStats();
                
                // Show badge notification if earned
                if (result.newBadge) {
                    earnedBadges.push(result.newBadge.name);
                    sessionStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
                    showBadgeNotification(result.newBadge);
                    updateBadgesList();
                    updateNewDuckButton();
                }
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            ratingInfo.textContent = 'Error submitting rating. Please try again.';
        }
    });

    // Track duck clicks
    duckImage.addEventListener('click', async function() {
        // Play quack sound
        quackSound.currentTime = 0;
        quackSound.play();
        
        // Increment click count
        const clickCount = parseInt(sessionStorage.duckClicks || '0') + 1;
        sessionStorage.duckClicks = clickCount;
        
        // Check for badge eligibility
        if ([1, 50, 100, 1000].includes(clickCount)) {
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
                await updateUserStats();
                
                // Update sessionStorage with earned badges
                if (result.newBadge) {
                    const earnedBadges = JSON.parse(sessionStorage.getItem('earnedBadges') || '[]');
                    earnedBadges.push(result.newBadge.name);
                    sessionStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
                    
                    // Show notification and update UI
                    showBadgeNotification(result.newBadge);
                    updateBadgesList();
                    updateNewDuckButton();
                }
            } catch (error) {
                console.error('Error reporting click:', error);
            }
        }
    });

    // Achievements Menu Functionality
    menuButton.addEventListener('click', async () => {
        await loadBadges();
        updateBadgesList();
        achievementsPanel.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuButton.contains(e.target) && !achievementsPanel.contains(e.target)) {
            achievementsPanel.classList.remove('show');
        }
    });
});

//#region Leaderboard
// Leaderboard functionality
let currentUser = null;

async function initializeUser() {
  try {
    const response = await fetch('/api/leaderboard/user');
    currentUser = await response.json();
    sessionStorage.setItem('userId', currentUser.id);
    updateUserStats();
  } catch (error) {
    console.error('Error initializing user:', error);
  }
}

async function updateUserStats() {
  if (!currentUser) return;
  
  try {
    const response = await fetch('/api/leaderboard/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clicks: parseInt(sessionStorage.duckClicks || '0'),
        ducksRated: JSON.parse(sessionStorage.getItem('earnedBadges') || '[]')
          .filter(b => b.includes('Duck') && !b.includes('Click')).length
      })
    });
    
    if (response.ok) {
      loadLeaderboard();
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    const leaderboard = await response.json();
    
    // Update user stats display
    const userStatsElement = document.getElementById('user-stats');
    const user = leaderboard.find(u => u.id === currentUser?.id);
    
    if (user) {
      userStatsElement.innerHTML = `
        <h4>Your Stats (${user.username})</h4>
        <div>Ducks Clicked: ${user.clicks}</div>
        <div>Ducks Rated: ${user.ducksRated}</div>
        <div>Rank: #${leaderboard.findIndex(u => u.id === user.id) + 1}</div>
      `;
    }
    
    // Update leaderboard list
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    
    leaderboard.slice(0, 20).forEach((user, index) => {
      const item = document.createElement('div');
      item.className = `leaderboard-item ${user.id === currentUser?.id ? 'you' : ''}`;
      item.innerHTML = `
        <div class="rank">${index + 1}</div>
        <div class="username">${user.username}</div>
        <div class="stats">
          <div class="stat">${user.clicks}🦆</div>
          <div class="stat">${user.ducksRated}⭐</div>
        </div>
      `;
      leaderboardList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize leaderboard elements
    const leaderboardButton = document.getElementById('leaderboard-button');
    const leaderboardPanel = document.getElementById('leaderboard-panel');
  
    // Initialize user
    await initializeUser();
  
    // Leaderboard button click handler
    leaderboardButton.addEventListener('click', async () => {
        await loadLeaderboard();
        leaderboardPanel.classList.toggle('show');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!leaderboardButton.contains(e.target) && !leaderboardPanel.contains(e.target)) {
        leaderboardPanel.classList.remove('show');
        }
    });
    
    // Update leaderboard when rating ducks
    // Add this inside your rating click handler:
    
    // Update leaderboard when clicking ducks
    // Add this inside your duck image click handler:
    // await updateUserStats();
});