# Setup Guide - Stock Portfolio Management

This guide will help you set up and run both the backend and frontend applications.

## Backend Setup (ASP.NET Core)

### Prerequisites
- .NET 8.0 SDK
- SQL Server (or SQL Server Express)

### Steps

1. **Configure Database Connection**
   - Open `appsettings.json` or `appsettings.Development.json`
   - Update the `DefaultConnection` string with your SQL Server connection details

2. **Run Database Migrations**
   ```bash
   dotnet ef database update
   ```

3. **Run the Backend**
   ```bash
   dotnet run
   ```
   The API will be available at:
   - HTTP: `http://localhost:5032`
   - HTTPS: `https://localhost:7167`

4. **Verify Backend**
   - Open `http://localhost:5032/swagger` in your browser
   - You should see the Swagger UI with all available endpoints

## Frontend Setup (React)

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Steps

1. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`

## Important Notes

### CORS Configuration
The backend has been configured to allow requests from `http://localhost:3000`. If you change the frontend port, update the CORS policy in `Program.cs`:

```csharp
policy.WithOrigins("http://localhost:YOUR_PORT")
```

### API Configuration
If your backend runs on a different port, update the API URL in `frontend/src/config/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:YOUR_PORT/api'
```

### Authentication
- The application uses JWT authentication
- Tokens are stored in localStorage
- Protected routes require authentication

## Testing the Application

1. **Register a New User**
   - Navigate to `/register`
   - Create an account (password must be at least 12 characters with uppercase, lowercase, digit, and special character)

2. **Login**
   - Navigate to `/login`
   - Use your credentials to login

3. **View Stocks**
   - After login, navigate to `/stocks`
   - You can view, create, edit, and delete stocks

4. **Manage Portfolio**
   - Navigate to `/portfolio`
   - Add stocks to your portfolio by entering their symbol

5. **View Stock Details**
   - Click on any stock to view details
   - Add comments on stock details page

## Troubleshooting

### Backend Issues
- **Database Connection Error**: Check your connection string in `appsettings.json`
- **CORS Errors**: Ensure CORS is configured correctly in `Program.cs`
- **JWT Errors**: Check JWT configuration in `appsettings.json` (Issuer, Audience, SigningKey)

### Frontend Issues
- **API Connection Error**: Verify the backend is running and the API URL is correct
- **Authentication Issues**: Clear localStorage and try logging in again
- **Build Errors**: Delete `node_modules` and `package-lock.json`, then run `npm install` again

## Project Structure

```
Project 1/
├── Controllers/          # API Controllers
├── Models/              # Data Models
├── Dtos/                # Data Transfer Objects
├── Repository/           # Data Access Layer
├── Service/              # Business Logic
├── Data/                 # Database Context
├── frontend/             # React Frontend Application
│   ├── src/
│   │   ├── components/   # React Components
│   │   ├── pages/        # Page Components
│   │   ├── services/     # API Services
│   │   └── contexts/      # React Contexts
└── Program.cs            # Application Entry Point
```

## Next Steps

- Customize the UI styling
- Add more features (search, filters, pagination)
- Implement error handling improvements
- Add loading states and animations
- Deploy to production














