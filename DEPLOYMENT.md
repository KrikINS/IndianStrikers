# Deployment Guide for Indian Strikers (GCP Infrastructure)

This application is now hosted on **Google Cloud Platform (GCP)** using **Cloud Run** for the combined frontend/backend and **Cloud SQL** for the database.

## 1. Google Cloud SQL (PostgreSQL)
The database is a PostgreSQL 15 instance running on Google Cloud.
- **Host:** `34.93.230.37`
- **Port:** `5432`
- **Database:** `postgres`

Ensure all migrations and schema updates are applied directly to this instance.

## 2. Infrastructure (GCP Cloud Run)
We use a Docker-based deployment that bundles both the React frontend (Vite) and the Node.js API into a single container.

### Deployment Workflow
The project is configured with `cloudbuild.yaml` for automated builds.

1.  **Build & Push:**
    ```bash
    gcloud builds submit --config cloudbuild.yaml
    ```
2.  **Deployment:**
    The `cloudbuild.yaml` automatically triggers a deployment to **Cloud Run** (`strikers-app`).

### Environment Variables (Cloud Run)
The following variables must be configured in the Cloud Run service settings:
- `DATABASE_URL`: `postgresql://postgres:PASSWORD@34.93.230.37:5432/postgres`
- `JWT_SECRET`: (Your production JWT secret)
- `FRONTEND_PROD`: `https://indianstrikers.club`
- `CLOUDINARY_CLOUD_NAME`: (Your config)
- `CLOUDINARY_API_KEY`: (Your config)
- `CLOUDINARY_API_SECRET`: (Your config)

## 3. Removing Legacy Services (Render / Vercel)
If you are receiving emails from **Render**, it means a legacy service is still linked to your GitHub repository.

### To stop Render builds and emails:
1.  Log in to [Render Dashboard](https://dashboard.render.com).
2.  Find the service named `IndianStrikers` or `ins-api`.
3.  Go to **Settings** -> **Danger Zone**.
4.  Click **Disconnect Repository** or **Delete Web Service**.

### To stop Vercel builds (if any):
1.  Log in to [Vercel Dashboard](https://vercel.com).
2.  Select the `IndianStrikers` project.
3.  Go to **Settings** -> **Git**.
4.  Click **Disconnect**.

## 4. Domain Setup (GoDaddy -> GCP)
The domain `indianstrikers.club` should point to the Cloud Run service.
1.  In GCP Console, go to **Cloud Run** -> **Manage Custom Domains**.
2.  Add `indianstrikers.club`.
3.  Update your GoDaddy DNS with the provided records (usually a CNAME or A records).

---
**Note:** Always ensure the `api/.env` and `.env.production` files are kept secure and never committed to version control with real secrets (except as examples).
