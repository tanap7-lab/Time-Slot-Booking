# Azure Deployment Guide: AUMOVIO Time Slot Booking System

This comprehensive guide walks you through deploying your React + Node.js application to Microsoft Azure. We will use:
- **Azure Database for PostgreSQL Flexible Server** (Database)
- **Azure App Service** (Application hosting)
- **Azure Container Registry** (Docker image storage - optional but recommended)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setup Azure Account & Resources](#setup-azure-account--resources)
3. [Create PostgreSQL Database](#create-postgresql-database)
4. [Deploy Application](#deploy-application)
5. [Configure Environment Variables](#configure-environment-variables)
6. [Verify Deployment](#verify-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Cost Estimates & Optimization](#cost-estimates--optimization)

---

## Prerequisites

### Required
- ✅ An active [Azure Account](https://azure.microsoft.com/) (Free tier available with $200 credit)
- ✅ [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed on your machine
- ✅ [Git](https://git-scm.com/) installed
- ✅ Node.js 22.0+ installed locally

### Recommended (for Docker deployment)
- ✅ [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- ✅ Docker Hub or Azure Container Registry account

### What to Have Ready
- 📝 A unique app name (e.g., `timeslot-booking-prod`)
- 📝 PostgreSQL admin username and strong password
- 📝 Admin credentials for your app (AdminID, AdminPassword)

---

## Setup Azure Account & Resources

### Step 1.1: Create Azure Resource Group

A Resource Group is a logical container for all your Azure resources.

**Via Azure Portal:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **"Resource Groups"** in the top search bar
3. Click **"Create"**
4. Fill in:
   - **Subscription**: Select your subscription
   - **Resource group name**: `timeslot-booking-rg` (or your preferred name)
   - **Region**: Select your closest region (e.g., `East US`, `West Europe`, `Southeast Asia`)
5. Click **"Review + Create"** → **"Create"**

**Via Azure CLI (faster):**
```bash
az group create --name timeslot-booking-rg --location eastus
```

---

## Create PostgreSQL Database

### Step 2.1: Create Azure Database for PostgreSQL

**Via Azure Portal:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **"Azure Database for PostgreSQL flexible servers"**
3. Click **"Create"**

**Configuration:**
- **Subscription**: Select your subscription
- **Resource group**: Select `timeslot-booking-rg`
- **Server name**: `timeslot-booking-db` (must be globally unique)
- **Region**: Same as your resource group (important for latency)
- **PostgreSQL version**: Select `15` or `16` (latest stable)
- **Workload type**: Select `Development`

**Compute & Storage:**
- **Compute tier**: `Burstable` (B1ms or B2s) - Cost-effective for small apps
- **Storage**: `32 GiB` (auto-scaling available)

**Authentication:**
- **Admin username**: `pgadmin` (or your preferred name)
- **Password**: Enter a strong password (min 8 characters, uppercase, lowercase, numbers, special chars)
- **Confirm password**: Repeat the password

Click **"Next: Networking >"**

### Step 2.2: Configure Database Networking

**Networking Tab:**
- **Connectivity method**: Select `Public access (allowed IP addresses)`
- **Allow public access from any Azure service within Azure to this server**: ✅ Check this box (enables App Service to connect)
- **Add current client IP address**: ✅ Check this box (allows local testing)

**Save for Later:**
- Note your server name (e.g., `timeslot-booking-db.postgres.database.azure.com`)
- Note your admin username (e.g., `pgadmin`)
- Note your password

Click **"Review + Create"** → **"Create"**

**Wait for deployment** (usually 5-10 minutes)

### Step 2.3: Get Database Connection String

Once deployed:
1. Click on your PostgreSQL server in the portal
2. Go to **"Overview"** section
3. Note the **Server name** (e.g., `timeslot-booking-db.postgres.database.azure.com`)
4. Go to **"Connect"** section and select **"Strings"**
5. Copy the PostgreSQL connection string and note it

**Your DATABASE_URL should look like:**
```
postgresql://pgadmin:YourStrongPassword@timeslot-booking-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

---

## Deploy Application

### DEPLOYMENT OPTION A: Docker Container (Recommended for Production)

This method containerizes your app for consistent deployment.

#### Step 3A.1: Create Azure Container Registry

**Via Azure Portal:**
1. Search for **"Container Registries"**
2. Click **"Create"**
3. Fill in:
   - **Subscription**: Your subscription
   - **Resource group**: `timeslot-booking-rg`
   - **Registry name**: `timeslotbookingacr` (must be lowercase, 5-50 chars, no hyphens)
   - **Location**: Same region as other resources
   - **SKU**: `Basic` (sufficient for small apps)
4. Click **"Review + Create"** → **"Create"**

**Get your login credentials:**
1. Go to your created ACR
2. Click **"Access keys"**
3. Note:
   - **Login server**: (e.g., `timeslotbookingacr.azurecr.io`)
   - **Username**: (shown in Access keys)
   - **Password**: (show password, copy it)

#### Step 3A.2: Build and Push Docker Image

On your local machine:

```bash
# Navigate to your project
cd "d:\OneDrive - Aumovio SE\2 Work\Timeslot Booking App\Time-Slot-Booking"

# Login to Azure CLI
az login

# Login to your Container Registry
az acr login --name timeslotbookingacr

# Build the Docker image
docker build -t timeslotbookingacr.azurecr.io/booking-app:latest .

# Push to Azure Container Registry
docker push timeslotbookingacr.azurecr.io/booking-app:latest

# Verify (should see your image listed)
az acr repository list --name timeslotbookingacr
```

#### Step 3A.3: Create App Service

**Via Azure Portal:**
1. Search for **"App Services"**
2. Click **"Create"** → **"Web App"**
3. Fill in:
   - **Subscription**: Your subscription
   - **Resource group**: `timeslot-booking-rg`
   - **Name**: `timeslot-booking-app` (must be globally unique, becomes part of URL)
   - **Publish**: Select **"Docker Container"**
   - **Operating System**: Linux
   - **Region**: Same as other resources
   - **App Service Plan**: Create new with name `timeslot-booking-plan`
     - **Sku and size**: Click "Change size" → Select **B1 (Basic)** or **B2** for better performance
4. Click **"Next: Docker >"**

**Docker Configuration:**
- **Image Source**: `Azure Container Registry`
- **Registry**: Select your `timeslotbookingacr`
- **Image**: `booking-app`
- **Tag**: `latest`
- **Startup Command**: (leave empty)

Click **"Review + Create"** → **"Create"**

**Your app URL will be:** `https://timeslot-booking-app.azurewebsites.net`

---

### DEPLOYMENT OPTION B: Direct Code Deployment (Simpler, No Docker)

Skip Option A if using this method.

#### Step 3B.1: Create App Service

**Via Azure Portal:**
1. Search for **"App Services"**
2. Click **"Create"** → **"Web App"**
3. Fill in:
   - **Name**: `timeslot-booking-app`
   - **Publish**: Select **"Code"**
   - **Runtime stack**: **"Node 22 LTS"**
   - **Operating System**: Linux
   - **Region**: Same as your resource group
   - **App Service Plan**: Create new with B1 tier
4. Click **"Review + Create"** → **"Create"**

#### Step 3B.2: Deploy Code

**Via Azure Portal:**
1. Go to your newly created App Service
2. In the left sidebar, click **"Deployment Center"**
3. Select **"Local Git"** as the source
4. Copy the **Git Clone URL** (looks like `https://<app-name>.scm.azurewebsites.net/<app-name>.git`)
5. Get deployment credentials:
   - Click **"Deployment credentials"** in the sidebar
   - Create a new username and password

**From your local machine:**
```bash
cd "d:\OneDrive - Aumovio SE\2 Work\Timeslot Booking App\Time-Slot-Booking"

# Build the app
npm run build

# Add Azure remote
git remote add azure <your-git-clone-url>

# Deploy
git push azure main
# Enter username and password when prompted
```

---

## Configure Environment Variables

### Step 4: Add Application Settings

**Via Azure Portal:**
1. Go to your App Service (e.g., `timeslot-booking-app`)
2. In the left sidebar, click **"Configuration"**
3. Click **"+ New application setting"** for each of these:

| Name | Value | Notes |
|:-----|:------|:------|
| `DATABASE_URL` | `postgresql://pgadmin:YourPassword@timeslot-booking-db.postgres.database.azure.com:5432/postgres?sslmode=require` | Use your actual DB credentials |
| `NODE_ENV` | `production` | Optimizes performance |
| `PORT` | `3000` | (or your preferred port) |
| `AdminID` | `admin` | Your app's admin login username |
| `AdminPassword` | `SecurePassword123!` | Your app's admin login password |

4. After adding all settings, scroll to the top and click **"Save"**
5. Select **"Continue"** when prompted to restart the app

⏳ **Wait 1-2 minutes for the app to restart with new settings**

---

## Verify Deployment

### Step 5.1: Check Application Status

1. Go to your App Service in Azure Portal
2. Click **"Overview"** tab
3. Note the **URL** (e.g., `https://timeslot-booking-app.azurewebsites.net`)
4. Click the URL to open your app in a browser

### Step 5.2: View Application Logs

To verify successful deployment and database initialization:

1. In your App Service, click **"Log Stream"** in the left sidebar
2. You should see output like:
   ```
   Database initialized successfully.
   Server running at http://localhost:3000
   ```

### Step 5.3: Test the Application

Once deployed:
1. Open your app URL: `https://timeslot-booking-app.azurewebsites.net`
2. You should see your Time Slot Booking interface
3. Try creating/viewing time slots to verify database connectivity
4. Test admin login with your configured AdminID and AdminPassword

---

## Troubleshooting

### Common Issues & Solutions

**Issue 1: "Database connection failed"**
- **Cause**: PostgreSQL firewall blocking App Service
- **Fix**:
  1. Go to your PostgreSQL server
  2. Click **"Networking"**
  3. Verify **"Allow public access from any Azure service within Azure to this server"** is ✅ enabled
  4. In **Firewall rules**, add your App Service outbound IP:
     - Go to your App Service → **"Properties"**
     - Note the **Outbound IPs** section
     - Add them to PostgreSQL firewall rules

**Issue 2: "Application times out or returns 502 errors"**
- **Cause**: Insufficient compute resources or startup issues
- **Fix**:
  1. Go to App Service → **"Log Stream"** to check for errors
  2. If memory/CPU is high, upgrade your App Service plan (click **"Scale up"**)
  3. Check environment variables are set correctly in **"Configuration"**

**Issue 3: "Permission denied" when pushing Docker image**
- **Cause**: Not authenticated with Container Registry
- **Fix**:
  ```bash
  az acr login --name timeslotbookingacr
  # Or provide credentials
  az acr login --name timeslotbookingacr -u <username> -p <password>
  ```

**Issue 4: "App Service shows 'Application Error' page"**
- **Cause**: Application crashed or failed to start
- **Fix**:
  1. Go to **"Log Stream"** and check error messages
  2. Verify all required environment variables are set
  3. Check that `package.json` `scripts.start` is correct: `"start": "tsx server.ts"`
  4. Restart the app: Click **"Restart"** button

**Issue 5: "Cannot find module" errors in logs**
- **Cause**: Dependencies not installed
- **Fix** (for Direct Deployment):
  1. Go to **"Advanced Tools"** (Kudu console)
  2. Navigate to your repo directory
  3. Run: `npm install`

---

## Cost Estimates & Optimization

### Current Configuration Costs (2025 estimates)

| Resource | Tier | Estimated Monthly Cost |
|:---------|:-----|:----------------------|
| PostgreSQL (Burstable B1ms) | Flexible Server | ~$20-30 |
| App Service (B1 Basic) | Linux | ~$12 |
| **Total** | | **~$32-42/month** |

### Cost Optimization Tips

1. **Use Free Tier during development**: Azure offers $200 free credits for 30 days
2. **Stop resources when not in use**: 
   ```bash
   # Stop App Service (doesn't apply to PostgreSQL)
   az webapp stop --name timeslot-booking-app --resource-group timeslot-booking-rg
   ```
3. **Downgrade to B1 tier** if B2 is too expensive
4. **Enable auto-scaling**: If traffic spikes are unpredictable
5. **Use Reserved Instances**: For long-term deployments (saves ~30%)

### Monitoring Costs

1. In Azure Portal, search for **"Cost Management + Billing"**
2. View real-time spending under **"Cost Analysis"**
3. Set **"Budgets"** to get alerts when spending exceeds a threshold

---

## Next Steps

### After Successful Deployment

1. **Set up monitoring**: Enable Azure Monitor and Application Insights for your App Service
2. **Configure auto-scaling**: Go to **"Scale out"** to handle traffic spikes automatically
3. **Set up CI/CD**: Use GitHub Actions to auto-deploy on code changes
4. **Enable HTTPS**: Azure provides free SSL/TLS certificates
5. **Backup database**: Configure automated backups in PostgreSQL settings

### Updating Your Application

To deploy new code changes:

**Option A (Docker):**
```bash
git push origin main  # Push to GitHub
docker build -t timeslotbookingacr.azurecr.io/booking-app:v2 .
docker push timeslotbookingacr.azurecr.io/booking-app:v2
# Update App Service to use the new tag
```

**Option B (Direct Deployment):**
```bash
npm run build
git push azure main  # Redeploy
```

---

> [!IMPORTANT]
> **Security Notes:**
> - Never commit `.env` files to Git
> - Use strong, unique passwords for database and admin accounts
> - Rotate credentials regularly
> - Enable PostgreSQL SSL connections (already configured in connection string)
> - Consider using Azure Key Vault for sensitive credentials in production

---

## Support & Resources

- 📖 [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- 📖 [Azure Database for PostgreSQL Documentation](https://learn.microsoft.com/en-us/azure/postgresql/)
- 🆘 [Azure Support](https://azure.microsoft.com/en-us/support/)
- 💬 [Azure Community Forums](https://learn.microsoft.com/en-us/answers/tags/186/azure)

---

**Last Updated:** April 2025 | **Version:** 2.0
