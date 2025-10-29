# Corona Visualization

An interactive data visualization exploring Corona-related articles and their relationships over time.

## Features

- Interactive timeline player with auto-play functionality
- Category-based filtering (Media, Entertainment, Knowledge, Government)
- Keyword-based exploration and filtering
- Responsive design for mobile and desktop
- Real-time data visualization with D3.js

## Data

The visualization uses CSV data files containing article information with:
- Publication dates
- Keywords and summaries
- Article types and categories
- URLs and metadata

## Deployment

This project is configured for deployment on Vercel:

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

Or connect your GitHub repository directly to Vercel for automatic deployments.

## Local Development

1. Clone the repository
2. Open `index.html` in a web browser
3. Or use a local server: `npx serve .`

## Technologies

- HTML5/CSS3
- JavaScript (ES6+)
- D3.js for data visualization
- Vercel for hosting
