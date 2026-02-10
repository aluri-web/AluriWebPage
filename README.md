# Aluri Platform

Real estate financing platform that connects **property owners** with **investors** seeking investment opportunities backed by real estate.

## Overview

Aluri is a fintech platform that facilitates mortgage loans through real estate crowdfunding. Property owners can apply for loans backed by their properties, while investors can participate in funding these loans and earn attractive returns.

## Tech Stack

| Technology | Usage |
|------------|-------|
| **Next.js 15** | React Framework with App Router |
| **TypeScript** | Static typing |
| **Supabase** | Backend-as-a-Service (Auth + PostgreSQL) |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Charts and visualizations |
| **Lucide React** | Icon library |
| **React Hook Form** | Form handling |
| **date-fns** | Date utilities |

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   └── signout/          # API Route for sign out
│   ├── dashboard/
│   │   ├── admin/            # Admin panel
│   │   │   ├── page.tsx      # Admin main dashboard
│   │   │   ├── usuarios/     # User management
│   │   │   ├── creditos/     # Loan management
│   │   │   ├── colocaciones/ # New loan placements
│   │   │   ├── inversiones/  # View all investments
│   │   │   └── configuracion/# System settings
│   │   ├── inversionista/    # Investor panel
│   │   │   ├── page.tsx      # Main dashboard
│   │   │   ├── marketplace/  # Browse opportunities
│   │   │   ├── mis-inversiones/ # Personal portfolio
│   │   │   ├── billetera/    # Balance and transactions
│   │   │   ├── perfil/       # Personal data
│   │   │   └── configuracion/# Preferences
│   │   └── propietario/      # Property owner panel
│   │       ├── page.tsx      # Main dashboard
│   │       ├── creditos/     # My loans
│   │       └── configuracion/# Preferences
│   ├── inversionistas/       # Public info page
│   │   └── registro-secreto/ # Investor registration
│   ├── login/                # Unified authentication
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── dashboard/
│       ├── AdminSidebar.tsx       # Admin sidebar desktop
│       ├── AdminMobileSidebar.tsx # Admin sidebar mobile
│       ├── AdminSidebarNav.tsx    # Admin navigation
│       ├── Sidebar.tsx            # Investor sidebar desktop
│       ├── MobileSidebar.tsx      # Investor sidebar mobile
│       ├── SidebarNav.tsx         # Investor navigation
│       ├── PropietarioSidebar.tsx # Owner sidebar desktop
│       ├── PropietarioMobileSidebar.tsx # Owner sidebar mobile
│       ├── PropietarioSidebarNav.tsx    # Owner navigation
│       ├── UserInfo.tsx           # Investor user info
│       ├── PropietarioUserInfo.tsx# Owner user info
│       └── PortfolioChart.tsx     # Distribution chart
├── utils/
│   └── supabase/
│       ├── server.ts         # Supabase client for Server Components
│       └── middleware.ts     # Session update helper
└── middleware.ts             # Route protection
```

## User Roles

### 1. Admin
- Full system access
- User, loan, and investment management
- KPIs: total users, active loans, total capital, defaults
- Route: `/dashboard/admin/*`

### 2. Investor (Inversionista)
- Browse investment marketplace
- Invest in mortgage loans
- View portfolio and returns
- Route: `/dashboard/inversionista/*`

### 3. Property Owner (Propietario)
- View loan status
- Track funding progress
- Route: `/dashboard/propietario/*`

## Data Model (Supabase)

### Table: `profiles`
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK, references auth.users |
| full_name | text | Full name |
| email | text | Email address |
| role | text | 'admin' \| 'inversionista' \| 'propietario' |

### Table: `loans`
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| code | text | Unique loan code (e.g., ALU-2024-001) |
| owner_id | uuid | FK to profiles (property owner) |
| status | text | 'draft' \| 'fundraising' \| 'active' \| 'paid' \| 'defaulted' |
| amount_requested | numeric | Requested amount |
| amount_funded | numeric | Funded amount |
| interest_rate_ea | numeric | Effective annual interest rate |
| term_months | integer | Term in months |
| property_info | jsonb | Property info (city, address, property_type, commercial_value) |

### Table: `investments`
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| investor_id | uuid | FK to profiles |
| loan_id | uuid | FK to loans |
| amount_invested | numeric | Invested amount |
| interest_rate_investor | numeric | Investor's interest rate |
| status | text | 'active' \| 'completed' \| 'cancelled' |

## Authentication Flow

1. User logs in at `/login`
2. Server Action validates credentials with Supabase Auth
3. Middleware verifies session and redirects based on role:
   - No session + protected route -> `/login`
   - With session + `/dashboard` -> `/dashboard/{role}`
4. Sign out via POST to `/auth/signout`

## Route Protection Middleware

```typescript
// Protected routes: /dashboard/*
// Public routes: /, /login, /inversionistas, /auth/*

const isProtectedRoute = pathname.startsWith('/dashboard')

if (isProtectedRoute && !user) {
  redirect('/login')
}

if (isProtectedRoute && user) {
  // Validate role and redirect to correct dashboard
}
```

## Features by Module

### Marketplace (Investor)
- Investment opportunities grid
- Risk filters (A1, A2, B1, B2) based on LTV
- Search by city, property type, or code
- Automatic LTV and risk score calculation
- Real-time funding progress

### Investor Dashboard
- Total invested balance
- Weighted average ROI
- Number of active investments
- Distribution chart (invested vs collected)
- Detailed investments table

### Property Owner Dashboard
- Total loans
- Active loans
- Requested vs funded amount
- Recent loans list with status

### Admin Dashboard
- Platform-wide KPIs
- User CRUD management
- Loan administration
- New loan placements creation
- All investments view

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
```

## Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production
npm run start

# Linting
npm run lint
```

## Styling and Theme

The application uses a dark theme with emerald/teal accents:

- **Main background**: `slate-950`, `zinc-900`
- **Primary color**: `emerald-400`, `teal-400`
- **Cards**: `slate-800`, `zinc-900` with `slate-700` borders
- **Text**: `white`, `slate-400`, `zinc-500`

The property owner dashboard uses a light theme with white background.

## Security

- Authentication handled by Supabase Auth
- HTTP-only cookie sessions
- Middleware validates session on each request
- Row Level Security (RLS) in Supabase
- Role-based route protection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

Private project - All rights reserved.

---

Built with Next.js and Supabase
