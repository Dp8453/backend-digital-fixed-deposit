# 🏦 Digital Fixed Deposit Management System - Backend

Enterprise Production-Grade Digital Fixed Deposit Management System Backend built with Node.js, Express, MongoDB Mongoose, JWT Authentication, WebSockets (Socket.IO), and automated cron jobs.

---

## 🚀 Quick Deployment on Render

### Option A: Manual Web Service Deployment (Recommended)

1. Go to your **[Render Dashboard](https://dashboard.render.com/)**.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository: `https://github.com/Dp8453/backend-digital-fixed-deposit.git`
4. Configure the service with the following settings:
   - **Name**: `digital-fixed-deposit-backend` (or your preferred name)
   - **Region**: Choose the closest region (e.g., *Singapore*, *Frankfurt*, *Oregon*)
   - **Branch**: `main`
   - **Root Directory**: `Backend` ⚠️ *(Very important since the code lives inside `/Backend`)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. Under **Advanced / Health Check Path**, set:
   - **Health Check Path**: `/api/v1/health`

6. Under **Environment Variables**, add the following keys:

| Key | Example / Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production environment mode |
| `PORT` | `10000` | Render port (assigned automatically) |
| `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/digital_fd?retryWrites=true&w=majority` | MongoDB Atlas Connection String |
| `JWT_SECRET` | *(64-char random string)* | JWT Access Token Secret |
| `JWT_EXPIRE` | `15m` | Access token lifespan |
| `JWT_REFRESH_SECRET` | *(64-char random string)* | JWT Refresh Token Secret |
| `JWT_REFRESH_EXPIRE` | `7d` | Refresh token lifespan |
| `CLIENT_URL` | `https://your-frontend.vercel.app,http://localhost:5173` | Allowed CORS frontend origins (comma-separated or single) |
| `SMTP_HOST` | `smtp.gmail.com` or `smtp.mailtrap.io` | SMTP Mail Server |
| `SMTP_PORT` | `587` | SMTP Port |
| `SMTP_USER` | `your-email@example.com` | SMTP Username |
| `SMTP_PASS` | `your-app-password` | SMTP Password / App Password |
| `FROM_EMAIL` | `noreply@digitalfd.com` | Email sender address |
| `FROM_NAME` | `Digital Fixed Deposit System` | Email sender name |

7. Click **Create Web Service**. Render will pull the repository, run `npm install`, and boot the server.

---

### Option B: Render Blueprint Deployment (render.yaml)

1. In Render, click **New +** -> **Blueprint**.
2. Select this repository. Render will automatically read `render.yaml` and configure the service and default environment variables.
3. Fill in your secret variables (`MONGO_URI`, `SMTP_USER`, `SMTP_PASS`) and deploy.

---

## 🔍 Verifying the Deployment

Once deployed, visit your Render URL:

- **Root API Status**: `https://<your-service-name>.onrender.com/`
  ```json
  {
    "name": "Digital Fixed Deposit System API",
    "version": "1.0.0",
    "status": "Active & Secured",
    "documentation": "/api/v1/health"
  }
  ```

- **Health Check**: `https://<your-service-name>.onrender.com/api/v1/health`
  ```json
  {
    "success": true,
    "message": "System health status retrieved successfully",
    "data": {
      "application": "Digital Fixed Deposit System API",
      "status": "UP",
      "environment": "production",
      "database": {
        "status": "Connected",
        "connected": true
      }
    }
  }
  ```

---

## 📁 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service & DB Health Check | No |
| `POST` | `/api/v1/auth/register` | User Registration | No |
| `POST` | `/api/v1/auth/login` | User Login | No |
| `POST` | `/api/v1/auth/refresh-token` | Refresh Access Token | No |
| `POST` | `/api/v1/auth/logout` | User Logout | Yes |
| `GET` | `/api/v1/fixed-deposits` | List User Fixed Deposits | Yes |
| `POST` | `/api/v1/fixed-deposits` | Create New Fixed Deposit | Yes |
| `GET` | `/api/v1/dashboard/summary` | User Dashboard Analytics | Yes |
| `GET` | `/api/v1/transactions` | Transaction History | Yes |
| `GET` | `/api/v1/admin/analytics` | Admin Metrics & Overview | Admin Only |
| `GET` | `/api/v1/tickets` | Support Tickets | Yes |
| `GET` | `/api/v1/notifications` | User Notifications | Yes |

---

## 💻 Local Development

```bash
# 1. Navigate to Backend directory
cd Backend

# 2. Install dependencies
npm install

# 3. Configure .env file
cp .env.example .env

# 4. Start development server
npm run dev
```
