# Troubleshooting 500 Error on Registration

## The 500 Error Means:
✅ **Good news**: The backend IS receiving your requests!
❌ **Bad news**: The backend is failing to process the registration

## Most Common Causes:

### 1. Missing "User" Role in Database
The register endpoint tries to add users to the "User" role. If this role doesn't exist, you'll get a 500 error.

**Fix:**
```powershell
# Make sure you're in the project root directory
dotnet ef database update
```

This will ensure the database has the "User" and "Admin" roles seeded.

### 2. Check Backend Terminal for Exact Error
When you try to register, check the backend terminal window. It will show the exact error message, such as:
- "Role 'User' does not exist"
- "Database connection failed"
- "Password validation failed"
- etc.

### 3. Database Connection Issue
Make sure SQL Server LocalDB is running:
```powershell
sqllocaldb start MSSQLLocalDB
```

### 4. Password Requirements Not Met
The backend requires:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

## Steps to Fix:

1. **Stop the backend** (Ctrl+C in backend terminal)

2. **Run database migrations:**
   ```powershell
   dotnet ef database update
   ```

3. **Restart the backend:**
   ```powershell
   dotnet run
   ```

4. **Try registering again** with a password that meets all requirements

5. **Check the backend terminal** for any error messages

## Still Not Working?

Share the exact error message from the backend terminal when you try to register.












