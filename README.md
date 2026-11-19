# Pressroom

A light, editorial blog platform built with NestJS and Next.js.

There is no login, MongoDB, or external object storage:
- Posts are stored in `backend/data/posts.json`.
- Uploaded images are stored in `backend/uploads`.
- The `/admin` editor is open directly.

## Run locally

Backend:
```bash
cd backend
npm install
npm run start:dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open:
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin
- API health: http://localhost:4000/api/health

## Render deployment

The repository includes `render.yaml`.

1. Import the repository into Render.
2. Create the Blueprint from `render.yaml`.
3. Set `FRONTEND_URL` to the Vercel URL.
4. Set `PUBLIC_API_URL` to the Render API URL, without `/api`.

## Vercel deployment

Import the repository and set the frontend root directory to `frontend`.

Set this environment variable:
```text
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

Then deploy.

Local JSON and uploaded-image files are stored on the API service filesystem. Render restarts or redeployments may replace ephemeral files, so attach a Render persistent disk for durable production storage if needed.
