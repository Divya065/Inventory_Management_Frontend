# Stock Portfolio Management - Frontend

React frontend application for the Stock Portfolio Management API.

## Features

- **Authentication**: Login and Register functionality with JWT tokens
- **Stock Management**: View, create, edit, and delete stocks
- **Portfolio Management**: Add and remove stocks from your portfolio
- **Comments**: Add comments to stocks and view existing comments
- **Dynamic Layout**: Responsive design with Navbar, Header, Footer, and Body components

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Backend Configuration

Make sure your backend API is running on `http://localhost:5032`. You can update the API URL in `src/config/api.js` if your backend runs on a different port.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Footer.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Stocks.jsx
│   │   ├── StockDetails.jsx
│   │   ├── CreateStock.jsx
│   │   ├── EditStock.jsx
│   │   └── Portfolio.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── stockService.js
│   │   ├── commentService.js
│   │   └── portfolioService.js
│   ├── config/
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── index.html
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies Used

- React 18
- React Router DOM
- Axios
- Vite
- CSS3














