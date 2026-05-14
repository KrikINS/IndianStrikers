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
    The `cloudbuild.yaml` automatically triggers a deployment to **Cloud Run** (`indian-strikers`).


## 3. Domain Setup (GoDaddy -> GCP)
The domain `indianstrikers.club` should point to the Cloud Run service.
1.  In GCP Console, go to **Cloud Run** -> **Manage Custom Domains**.
2.  Add `indianstrikers.club`.
3.  Update your GoDaddy DNS with the provided records (usually a CNAME or A records).

---
**Note:** Always ensure the `api/.env` and `.env.production` files are kept secure and never committed to version control with real secrets (except as examples).
