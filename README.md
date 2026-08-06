## InvoiceFlow AI

InvoiceFlow AI is a modern invoice management dashboard built with React, Vite, Supabase, and Google Gemini. It lets users upload invoice PDFs or images, extract structured invoice data with AI, review and edit the results, browse invoices in a folder-style UI, inspect analytics, and connect Gmail for invoice ingestion.

---

## 🚀 What this project does

InvoiceFlow AI provides an end-to-end workflow for invoice processing:

- User authentication with Supabase Auth
- Invoice upload from PDF, PNG, JPG, or WEBP files
- AI extraction using Gemini for invoice fields such as vendor, invoice number, dates, totals, line items, and confidence scores
- Storage of original files and extracted data in Supabase
- Review and edit invoice records in a spreadsheet-style interface
- Browse invoices by folders and view secure previews
- Analytics dashboards for spending trends and vendors
- Gmail integration setup for inbox-based invoice imports

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite
- **Routing:** React Router
- **UI:** Custom Glassmorphism UI with Lucide Icons
- **Charts:** Recharts
- **Backend & Database:** Supabase Auth, Supabase Database, Supabase Storage
- **AI Extraction:** Google Gemini API
- **File Handling:** PDF.js, jsPDF, XLSX

---

## 📂 Project Structure

```text
src/
│
├── components/      # Layout, Sidebar, Header, Folder View
├── context/         # Authentication Context
├── lib/             # Supabase Client Configuration
├── pages/           # Dashboard, Upload, Analytics, Settings, etc.
├── routes/          # Protected Routes
└── utils/           # Gemini API, PDF Utilities, Export Helpers

public/              # Static Assets
supabase/            # Supabase Functions
```

---

## 📋 Prerequisites

Before running the application locally, make sure you have:

- Node.js 18+
- npm
- A Supabase Project
- A Google Gemini API Key
- *(Optional)* Google Cloud OAuth Client ID for Gmail Integration

---

## ⚙️ Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

These variables are used by:

```
src/lib/supabaseClient.js
```

---

## 📦 Installation

```bash
npm install
```

---

## ▶️ Run Locally

```bash
npm run dev
```

Then open the local Vite URL shown in your terminal.

---

## 🏗️ Production Build

```bash
npm run build
```

---

# Supabase Setup

InvoiceFlow AI expects a Supabase project with:

1. Authentication Enabled
2. Storage Bucket named **invoices**
3. Database tables:
   - invoices
   - settings
   - mail_connections
   - folders

---

## Database Schema

### invoices

```sql
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_name text,
  file_path text,
  storage_path text,
  file_type text,
  file_size bigint,
  source text,
  folder text,
  extracted_data jsonb,
  confidence jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);
```

---

### settings

```sql
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  gemini_api_key_encrypted text,
  gemini_model text default 'gemini-2.5-flash',
  confidence_threshold int default 70,
  theme text default 'dark',
  accent_color text default 'purple',
  created_at timestamptz default now()
);
```

---

### mail_connections

```sql
create table if not exists public.mail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  oauth_client_id text,
  refresh_token_encrypted text,
  access_token_encrypted text,
  email text,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
```

---

### folders

```sql
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  created_at timestamptz default now()
);
```

---

## 📁 Storage Bucket

Create a Supabase Storage bucket named **invoices** and configure Storage Policies so authenticated users can upload and access only their own files.

> InvoiceFlow AI stores invoice documents in this bucket and generates signed URLs for secure previews.

---

# 🤖 Gemini Configuration

The Upload workflow calls the Gemini API using the API key stored in **Settings**.

### Steps

1. Sign in
2. Open **Settings**
3. Enter your Gemini API Key
4. Select the Gemini Model
5. Set the Confidence Threshold
6. Save Settings
7. Upload an Invoice

Gemini extraction logic is located in:

```
src/utils/geminiApi.js
```

---

# 🔄 Application Workflow

## 1. Authentication

Users create an account or sign in using Supabase Authentication.

---

## 2. Configure AI

The Settings page securely stores Gemini configuration for the logged-in user.

---

## 3. Upload Invoices

Users upload PDF or image invoices.

The application:

- Uploads files to Supabase Storage
- Sends files to Gemini AI
- Extracts structured invoice data
- Saves metadata into Supabase Database

---

## 4. Review Extracted Data

Browse invoices by folders, preview documents securely, and inspect extracted JSON.

---

## 5. Edit Records

The Excel Sheet page provides a spreadsheet-style interface for editing:

- Vendor
- Invoice Number
- Date
- Amount
- Status

---

## 6. Analytics Dashboard

View insights including:

- Monthly Spending
- Top Vendors
- Average Invoice Value
- Spending Trends

---

## 7. Gmail Integration *(Optional)*

The Mail Connect page prepares Gmail OAuth for automatic invoice importing.

> Production deployments should complete OAuth token exchange using a secure backend or Supabase Edge Functions.

---

# 🛣️ Main Routes

```
/login
/signup
/reset-password
/
/upload
/mail
/invoices
/excel
/analytics
/settings
```

---

# 📝 Production Notes

- Gemini API is currently called directly from the client. Move this to a backend or Supabase Edge Function for production.
- Gmail OAuth requires a secure callback handler and token exchange implementation.
- Analytics currently combine real invoice data with demo visualization values.
- Automated tests have not yet been implemented.

---

# 📜 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build production application
npm run preview  # Preview production build
npm run lint     # Run Oxlint
```

---

# 📄 License

This project is provided **as-is** for learning, portfolio, and demonstration purposes.
