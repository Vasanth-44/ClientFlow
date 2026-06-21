# ClientFlow AI 🚀

**A complete AI-powered Lead Generation, Sales CRM, and Agency Operating System built with Next.js 16, Tailwind CSS, and OpenAI.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/Vasanth-44/ClientFlow)

---

## ✨ Features

| Module | Description |
|---|---|
| 🎯 **Leads & Sales Pipeline** | Kanban drag-and-drop board with 8 pipeline stages, stage history, lead scoring |
| 👥 **Clients CRM** | Full client profiles, activity logs, project/invoice linking |
| 📁 **Projects & Tasks** | Milestone tracking, task assignments, document uploads |
| 💳 **Payments & Invoices** | Invoice generation, PDF export, payment tracking |
| 📄 **Proposals Vault** | AI-generated proposals with PDF download |
| 🤖 **AI Tools** | Proposal writer, email drafter, meeting summarizer |
| 🧠 **AI Sales Assistant** | Conversational assistant with live pipeline context |
| 📞 **Outreach Center** | Cold calling campaigns, CSV lead import, call log tracking |
| 🌐 **Client Portal** | Shareable project status view for clients |
| 🏢 **Agency Dashboard** | Executive KPIs, team performance, revenue metrics |
| 📊 **Analytics** | Charts, conversion rates, revenue trends |
| 👨‍👩‍👧 **Team Management** | Multi-member teams, role assignments, agency mode |
| 🌙 **Dark Mode** | Full dark/light mode with system detection |

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Vasanth-44/ClientFlow.git
cd ClientFlow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```env
OPENAI_API_KEY=sk-...         # Required for AI Tools
NEXT_PUBLIC_SUPABASE_URL=     # Optional (app runs in mock mode without it)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> **Note:** The app runs fully in mock/demo mode without any API keys. Add your OpenAI key to enable AI features.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Security Features

- **Rate Limiting** — 60 req/min general API, 20 req/min for AI endpoints (per IP)
- **Security Headers** — X-Frame-Options, CSP, HSTS, XSS protection, CORS
- **Method Enforcement** — AI endpoint accepts POST only
- **Environment Variable Guard** — API keys are server-side only, never exposed to the client
- **`.gitignore`** — `.env*` files are excluded from all commits

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Drag & Drop**: @hello-pangea/dnd
- **AI**: OpenAI GPT-4o
- **Database**: Supabase (or built-in mock mode)
- **PDF Export**: jsPDF
- **Icons**: Lucide React

---

## ☁️ Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import `Vasanth-44/ClientFlow`
3. Add your environment variables in the Vercel dashboard
4. Click **Deploy** 🎉

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/ai/             # AI API route (OpenAI + fallback)
│   ├── dashboard/          # Main dashboard
│   ├── leads/              # Leads CRM + Kanban pipeline
│   ├── clients/            # Client management
│   ├── projects/           # Project tracker
│   ├── tasks/              # Task management
│   ├── payments/           # Payment tracking
│   ├── invoices/           # Invoice generation + PDF
│   ├── proposals/          # Proposal vault + AI writer
│   ├── ai-tools/           # AI email/meeting tools
│   ├── ai-sales/           # AI Sales Assistant
│   ├── outreach/           # Cold calling campaigns
│   ├── portal/             # Client portal
│   ├── agency/             # Agency operations dashboard
│   ├── analytics/          # Analytics & charts
│   ├── team/               # Team management
│   ├── documents/          # Document manager
│   └── settings/           # App settings
├── components/             # Shared UI components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── DashboardLayout.tsx
│   └── ui/                 # Primitive UI components
├── context/                # React Context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── lib/
│   └── supabase.ts         # Supabase client + mock DB
└── middleware.ts            # Rate limiting + security headers
```

---

## 📝 License

MIT — Built by [Vasanth](https://github.com/Vasanth-44) with ❤️
