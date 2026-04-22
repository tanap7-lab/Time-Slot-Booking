# Azure Deployment Guide: AUMOVIO Counter Booking System

This guide outlines the steps to deploy your application to Microsoft Azure. We will use **Azure Database for PostgreSQL** for the data and **Azure App Service** to host the web application.

---

## 1. Prerequisites
- An active [Azure Account](https://azure.microsoft.com/).
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed (optional, but recommended).
- [Docker](https://www.docker.com/) (optional, if you choose the container-based path).

---

## 2. Step 1: Set up Azure Database for PostgreSQL

1. **Create the Server**:
   - Go to the [Azure Portal](https://portal.azure.com).
   - Search for **Azure Database for PostgreSQL flexible servers**.
   - Click **Create**.
   - Select your subscription, resource group, and server name.
   - For **Compute + storage**, "Burstable, B1ms" is sufficient for this app.
   - Set an **Admin username** and **Password**.
2. **Configure Networking**:
   - In the **Networking** tab, check **Allow public access from any Azure service within Azure to this server**.
   - Add your current IP address to the firewall rules so you can test locally.
3. **Get the Connection String**:
   - Once created, go to the **Connect** blade.
   - Note down the `Host`, `Username`, and `Password`.
   - Your `DATABASE_URL` will look like: `postgresql://<user>:<password>@<host>:5432/postgres?sslmode=require`.

---

## 3. Step 2: Prepare the Application

I have already added a `Dockerfile` and updated `package.json` to make the app production-ready.

### Option A: Deploy via Docker (Recommended)
This is the most reliable method for Azure.

1. **Build and Push**:
   ```bash
   # Login to Azure
   az login
   az acr login --name <your-registry-name>

   # Build and push to your Azure Container Registry (ACR)
   docker build -t <your-registry-name>.azurecr.io/booking-app:latest .
   docker push <your-registry-name>.azurecr.io/booking-app:latest
   ```
2. **Create App Service for Containers**:
   - Create a new **Web App** in Azure.
   - Select **Docker Container** as the publish method.
   - Point it to your image in ACR.

### Option B: Deploy via Local Git or Zip
If you don't want to use Docker:

1. **Build Locally**: `npm run build`.
2. **Deploy**: Use the Azure Portal or VS Code Azure Extension to upload the folder content.
3. **Start Command**: Set the startup command in Azure Configuration to `npx tsx server.ts`.

---

## 4. Step 3: Configure Environment Variables

In your **Azure App Service**, go to **Settings > Configuration > Application settings** and add:

| Name | Value |
| :--- | :--- |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `AdminID` | Your chosen admin ID |
| `AdminPassword` | Your chosen admin password |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

---

## 5. Step 4: Verification

1. **Browse**: Open the URL provided by Azure (e.g., `https://your-app.azurewebsites.net`).
2. **Database Auto-Init**: The app will automatically create the tables and seed initial slots on its first run in the cloud.
3. **Logs**: Use **Log Stream** in the Azure Portal to verify that "Database initialized successfully" appears.

---

> [!IMPORTANT]
> Ensure that the **PostgreSQL Firewall** allows access from Azure services, otherwise the App Service will be unable to connect to the database.
