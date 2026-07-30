# MedAssist AI

MedAssist AI is an educational healthcare assistant built to support users with medical information, symptom guidance, and nearby care resources without ever diagnosing or prescribing.

The platform combines a polished Next.js frontend with a secure FastAPI backend, powered by Supabase authentication and Postgres storage. AI responses are intentionally cautious and always include a disclaimer, while emergency patterns are detected before any model query is sent.

Key features:
- AI-powered symptom guidance with required medical disclaimers
- Secure user authentication and personal health history storage
- Nearby healthcare provider lookup using OpenStreetMap/Overpass and Leaflet maps
- Emergency-sensitive filtering to prevent unsafe AI responses
- Clean, responsive interface using TypeScript, Tailwind CSS, and ShadCN-style UI

MedAssist AI is designed as a safe, educational scaffold rather than a clinical system. It is meant for learning and prototyping, not for real medical diagnosis or treatment.

## Local Deployment

1. Clone the repository and open the workspace.
2. Set up the backend:
   - `cd backend`
   - `python -m venv venv`
   - `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (macOS/Linux)
   - `pip install -r requirements.txt`
   - Copy `.env.example` to `.env` and fill in the values for `SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `GROQ_API_KEY`, and `FRONTEND_URL`.
   - Start the backend: `uvicorn app.main:app --reload`
   - The backend will run at `http://localhost:8000`.
3. Set up the frontend:
   - `cd ..\frontend`
   - `npm install`
   - Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`.
   - Start the frontend: `npm run dev`
   - The frontend will run at `http://localhost:3000`.

Once both services are running, open `http://localhost:3000` and sign in with Supabase credentials to use the app locally.