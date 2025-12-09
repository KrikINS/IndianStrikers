# Deployment Guide for Indian Strikers Management App

## 1. Database (Supabase)
Before deploying the code, ensure your database schema is up to date.

1.  Log in to your **Supabase Dashboard**.
2.  Go to **SQL Editor**.
3.  Run the contents of the file `add_squad_columns.sql` located in your project root. This ensures the Match Selection feature works correctly by adding `squad` and `is_squad_locked` columns to the `matches` table.

## 2. Backend (Render)
We will host the Node.js API (the `api` folder) on Render.

1.  **Create Service:**
    *   Log in to [Render.com](https://render.com).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository (`KrikINS/IndianStrikers`).
2.  **Configuration:**
    *   **Root Directory:** `api`
    *   **Runtime:** Node
    *   **Build Command:** `npm install`
    *   **Start Command:** `node index.js`
3.  **Environment Variables:**
    *   Add the following variables in the "Environment" tab:
        *   `SUPABASE_URL`: (Your Supabase Project URL)
        *   `SUPABASE_SERVICE_ROLE_KEY`: (Your Supabase Service Role Key - **Secret**)
        *   `CLOUDINARY_CLOUD_NAME`: (Your config)
        *   `CLOUDINARY_API_KEY`: (Your config)
        *   `CLOUDINARY_API_SECRET`: (Your config)
        *   `JWT_SECRET`: (Same secret you used locally)
        *   `FRONTEND_PROD`: `https://indianstrikers.club` (or your Vercel URL if user domain isn't ready)
        *   `PORT`: `4000` (Render acts on the exposed port)
4.  **Deploy:** Click **Create Web Service**. Wait for it to go live. Copy the "onrender.com" URL (e.g., `https://ins-api.onrender.com`).

## 3. Frontend (Vercel)
We will host the React app on Vercel.

1.  **Create Project:**
    *   Log in to [Vercel](https://vercel.com).
    *   Click **Add New...** -> **Project**.
    *   Import your GitHub repository.
2.  **Configuration:**
    *   **Framework Preset:** Vite (should auto-detect).
    *   **Root Directory:** `./` (default).
3.  **Environment Variables:**
    *   Add the following:
        *   `VITE_SUPABASE_URL`: (Your Supabase Project URL)
        *   `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
        *   `VITE_API_URL`: **(IMPORTANT)** Paste the Render Backend URL from step 2 (e.g., `https://ins-api.onrender.com/api`).
        *   `VITE_FRONTEND_URL`: `https://indianstrikers.club` (or `http://localhost:3000` for dev, but this is for prod).
4.  **Deploy:** Click **Deploy**.

## 4. Domain Setup (GoDaddy -> Vercel)
To make your app accessible at `indianstrikers.club`:

1.  **Vercel:**
    *   Go to your Vercel Project Settings -> **Domains**.
    *   Add `indianstrikers.club`.
    *   Vercel will give you two records to add to GoDaddy:
        *   **An A Record** pointing to `76.76.21.21`.
        *   **A CNAME Record** for `www` pointing to `cname.vercel-dns.com`.
2.  **GoDaddy:**
    *   Log in to GoDaddy -> My Products -> `indianstrikers.club` -> **DNS**.
    *   Add/Update the **A Record** (@) to `76.76.21.21`.
    *   Add/Update the **CNAME Record** (www) to `cname.vercel-dns.com`.
3.  **Wait:** DNS propagation can take 1-24 hours (usually fast). Vercel will auto-issue an SSL certificate (HTTPS) once verified.

## 5. Post-Deployment Check
1.  Open `https://indianstrikers.club`.
2.  Log in as Admin.
3.  Check if data loads (Players, Matches).
4.  If data fails to load, check the Browser Console (F12) -> Network tab to see if calls to the Render API are failing (CORS issues or wrong URL).
