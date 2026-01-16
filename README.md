# Keturi Print CRM

A modern CRM application for Keturi Print, built with React, Vite, Tailwind CSS, and Supabase.

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Rename `.env.example` to `.env` and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

## Features (Implemented)
- **Supabase Integration**: Client configured in `src/lib/supabase.ts`.
- **Database Types**: TypeScript definitions in `src/lib/database.types.ts`.
- **UI Architecture**: Tailwind CSS configured with branding.
- **Layout**: Sidebar navigation ready.
- **Dashboard**: Basic landing view.

## Next Steps
- Implement Authentication (Login page).
- Connect Dashboard to real Supabase data.
- Build Order Management forms.
