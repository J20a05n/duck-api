# Duck Rating Web Application 🦆

A fun web application where users can rate ducks and collect rewards while earning achievements and participating in a global leaderboard.

## Features

* Rate duck images on a scale of 1-10
* Earn badges for rating milestones
* Track clicks and unlock special achievements
* Participate in a global leaderboard
* Purchase premium items from the store (like a duck pet companion for your cursor)

## API Endpoints

### Main API Endpoint

The primary endpoint for accessing random duck images is available at `/api/duck`. This endpoint returns a random duck image along with attribution information when available.

### Response Format

The endpoint returns a JSON object with the following structure:

```json
{
  "image": "https://your-domain/ducks/duck-image.jpg",
  "attribution": {
    "title": "Duck Image Title",
    "author": "Author Name",
    "license": "License Type",
    "source": "https://source-url.com"
  }
}
```

If no attribution information is available for the image, the `attribution` field will be `null`.

### Usage Examples

You can access the endpoint using curl:

```bash
curl "https://duck-api.j-p-k.de/api/duck"
```

Or using JavaScript fetch:

```javascript
fetch('https://duck-api.j-p-k.de/api/duck')
  .then(response => response.json())
  .then(data => {
    const imageUrl = data.image;
    const attribution = data.attribution;
    // Use the image URL and attribution as needed
  });
```

The endpoint is designed to be easily integrated into other applications while ensuring proper attribution for the original image creators when available.

### Rating System
- **POST /api/rate**: Rate a duck image
- **GET /api/ratings**: Retrieve ratings for a specific image

### User Management
- **GET /api/leaderboard**: View global leaderboard
- **GET /api/leaderboard/user**: Get current user's stats
- **POST /api/leaderboard/update**: Update user statistics

### Store Features
- **GET /api/store/items**: List available store items
- **POST /api/store/purchase**: Purchase items
- **GET /api/user/inventory**: View user's inventory

## Badges System

Users can earn various badges for different achievements:

| Badge Name | Description |
|------------|-------------|
| Duck Starter | Rate your first duck! |
| Duck Enthusiast | Rate 10 ducks! |
| Duck Master | Rate 25 ducks! |
| Duck Legend | Rate 50 ducks! |
| Duck Clicker | Click your first duck! |
| Duck Whisperer | Click 50 ducks! |
| Quack Master | Click 100 ducks! |
| Quack Legend | Click 1000 ducks! |

## License

[MIT License](LICENSE)
