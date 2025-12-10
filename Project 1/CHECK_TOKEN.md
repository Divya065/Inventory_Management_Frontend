# How to Fix 401 Unauthorized Error

## Step-by-Step Fix

### 1. Check if Token Exists
Open browser console (F12) and run:
```javascript
localStorage.getItem('token')
```

If it returns `null`, you need to login again.

### 2. Clear Old Token and Login Again
```javascript
// Clear everything
localStorage.clear()

// Then refresh page and login again
```

### 3. Verify Backend is Running
- Check backend terminal shows: `Now listening on: http://localhost:5032`
- Make sure you restarted backend AFTER fixing the JWT config

### 4. Check Token in Console
After logging in, check console for:
- "Token added to request" message
- Token preview should show

### 5. Check Backend Terminal
When you try to load stocks, check backend terminal for:
- JWT validation errors
- Any authentication errors

## Common Issues

1. **Old Token**: Token created before JWT fix won't work
2. **No Token**: Token not stored after login
3. **Backend Not Restarted**: Backend needs restart after JWT config fix
4. **Wrong Signing Key**: Token signed with wrong key

## Quick Fix Command

In browser console (F12):
```javascript
localStorage.clear()
location.reload()
```
Then login again.











