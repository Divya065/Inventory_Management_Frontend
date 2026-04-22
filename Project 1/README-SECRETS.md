## Public repo secrets checklist

This repository is public. Do **not** commit real secrets to git.

### What to keep secret
- `Jwt:SigningKey`
- `Razorpay:KeySecret` (and `WebhookSecret` if you use webhooks)
- Any production connection strings / passwords

### How this repo is set up
- `appsettings.Public.json` is a **template** (safe to commit).
- `appsettings.json` and `appsettings.Development.json` should be kept **local only** (ignored by `.gitignore`).

### Local development options

#### Option A: Use environment variables (recommended for public repos)
Set these in your terminal before running the API:
- `Jwt__SigningKey`
- `Upi__MerchantVpa`
- `Razorpay__KeyId`
- `Razorpay__KeySecret`
- `Razorpay__WebhookSecret` (optional)

Example PowerShell:
```powershell
$env:Jwt__SigningKey="your_long_random_key"
$env:Upi__MerchantVpa="yourupi@bank"
$env:Razorpay__KeyId="rzp_test_..."
$env:Razorpay__KeySecret="..."
dotnet run
```

#### Option B: Use .NET user-secrets (good for local dev)
User-secrets are stored on your machine, not in the repo.
```powershell
dotnet user-secrets init
dotnet user-secrets set "Jwt:SigningKey" "your_long_random_key"
dotnet user-secrets set "Upi:MerchantVpa" "yourupi@bank"
dotnet user-secrets set "Razorpay:KeyId" "rzp_test_..."
dotnet user-secrets set "Razorpay:KeySecret" "..."
```

### If secrets were already pushed
1. **Rotate** them (create new keys).
2. If needed, remove them from git history (git filter-repo / BFG).

