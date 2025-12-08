NUNCA JAMAIS EM HIPOTESE NENHUMA USE O CóDIGO "cd "e:\Agência\Gold Age\Azera\CRM Azera" ; supabase db reset --debug"


applyTo: '**'
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.


🚀 Azera CRM – Copilot Agent Instructions

Otimizado para Claude Sonnet/Haiku e Grok
Instruções para gerar código direto, limpo e 100% no padrão do projeto.


🎯 Core Principles
BE CONCISE. Generate only what's needed. No verbose explanations.

Copy existing patterns EXACTLY
Never invent new architecture
Prefer pragmatic over perfect
When in doubt, check existing files first


🏗️ Tech Stack
React 18 + TypeScript + Vite
Supabase (Auth, RLS, Storage, RPC)
Zustand (state management)
TailwindCSS (styling only)
Framer Motion (light animations)
TanStack Query (specific cases)
Project Structure:
src/
├── pages/           # Route components
├── components/      # Reusable components
│   ├── ui/         # Base UI components
│   └── team/       # Feature-specific
├── stores/         # Zustand stores
├── services/       # API/business logic
├── hooks/          # Custom hooks
└── lib/            # Utils & configs

🎨 Visual Identity (CRITICAL)
Glass Morphism Pattern
tsx// Containers/Cards
className="rounded-xl bg-white/5 border border-white/10 shadow-xl backdrop-blur"

// Inputs
className="bg-white/5 border border-white/10 rounded-xl 
  focus:ring-2 focus:ring-slate-500/30 transition-all"

// Buttons (Primary)
className="bg-gradient-to-r from-cyan-500 to-cyan-600 
  text-white rounded-lg font-semibold 
  hover:scale-105 hover:from-cyan-600 hover:to-cyan-700 
  transition-all shadow-lg"
Layout Principles

Dark mode by default (bg-slate-900, text-white)
Generous spacing: space-y-6, gap-6
Flexbox/Grid over absolute positioning
Subtle gradients, minimal shadows
Always use Tailwind classes (never external CSS)


📐 Code Conventions
Naming
typescript// Components & Types
PascalCase: UserProfile.tsx, interface UserData {}

// Functions & Variables
camelCase: getUserData(), const isLoading = false

// Files
Components: PascalCase.tsx
Utils/Hooks: camelCase.ts
Import Order (STRICT)
typescript// 1. React & core libs
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Stores
import { useAuthStore } from '@/stores/authStore'

// 3. External libs & configs
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// 4. Components (UI first, then feature)
import Button from '@/components/ui/Button'
import TeamCard from '@/components/team/TeamCard'

// 5. Types & utils
import type { User } from '@/types'

🧩 Component Patterns
Standard Structure
tsxexport default function ComponentName() {
  // 1. Stores/Context
  const { user } = useAuthStore()
  
  // 2. Hooks
  const navigate = useNavigate()
  
  // 3. State
  const [data, setData] = useState<DataType[]>([])
  const [loading, setLoading] = useState(false)
  
  // 4. Effects
  useEffect(() => {
    loadData()
  }, [])
  
  // 5. Handlers
  const handleSubmit = async () => {
    try {
      setLoading(true)
      // logic
      toast.success('Success!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  
  // 6. Render
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
      {/* content */}
    </div>
  )
}
Rules

Split when >250 lines
Extract handlers from JSX
Always handle loading/error states
Use semantic HTML


🗄️ Supabase Patterns
Queries
typescript// Select
const { data, error } = await supabase
  .from('table_name')
  .select('*, related_table(*)')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })

// Single item
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .single()

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert([{ field: value }])
  .select()

// Update
const { error } = await supabase
  .from('table_name')
  .update({ field: newValue })
  .eq('id', id)

// RPC
const { data, error } = await supabase
  .rpc('function_name', { param: value })
Error Handling (MANDATORY)
typescripttry {
  const { data, error } = await supabase.from('table').select('*')
  
  if (error) throw error
  
  return data
} catch (error) {
  console.error('Error loading data:', error)
  toast.error('Failed to load data')
  return null
}

🏪 Zustand Store Pattern
typescriptimport { create } from 'zustand'

interface StoreState {
  // Data
  items: Item[]
  loading: boolean
  
  // Actions
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  removeItem: (id: string) => void
  
  // Async actions
  fetchItems: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  loading: false,
  
  setItems: (items) => set({ items }),
  
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  
  fetchItems: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.from('items').select('*')
      if (error) throw error
      set({ items: data })
    } catch (error) {
      console.error(error)
      toast.error('Failed to load items')
    } finally {
      set({ loading: false })
    }
  }
}))

🔐 Multi-Tenant Rules (CRITICAL)
EVERY query must respect tenant isolation:
typescript// ✅ CORRECT
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('tenant_id', user.tenant_id)

// ❌ WRONG - exposes all tenants
const { data } = await supabase
  .from('leads')
  .select('*')
Role-Based Logic
typescriptconst { user } = useAuthStore()

// Check permissions
if (!['owner', 'admin'].includes(user.role)) {
  toast.error('Unauthorized')
  return
}

// Filter by role
const query = supabase
  .from('leads')
  .select('*')
  .eq('tenant_id', user.tenant_id)

if (user.role === 'vendedor') {
  query.eq('user_id', user.id)
}

🪝 Custom Hooks Pattern
typescriptexport function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  
  const fetchLeads = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', user.tenant_id)
      
      if (error) throw error
      setLeads(data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchLeads()
  }, [])
  
  return { leads, loading, refetch: fetchLeads }
}
```

---

## 📋 Quick Reference Files

Before generating code, check these reference files:
```
src/pages/
  ├── Login.tsx              # Auth patterns
  ├── LeadDetails.tsx        # Detail page pattern
  
src/components/
  ├── team/MinhaEquipe.tsx   # Team/list patterns
  ├── ui/                    # Base components
  
src/stores/
  ├── authStore.ts           # Auth state
  ├── themeStore.ts          # Theme management

✅ DO

Be concise - Code first, explanations minimal
Copy existing patterns - Check reference files
Handle all errors - try/catch + toast + console.error
Respect RLS - Always filter by tenant_id
Use TypeScript - Type everything
Follow visual identity - Glass morphism + gradients
Split large components - Keep under 250 lines
Test multi-tenant - Assume multiple users/tenants


❌ DON'T

❌ Write verbose explanations
❌ Invent new patterns or libraries
❌ Use Redux, Context, or other state management
❌ Write external CSS files
❌ Create services that don't exist
❌ Suggest architecture changes
❌ Leave empty catch blocks
❌ Forget tenant filtering
❌ Use styles that don't match Azera's HUD


🚀 Response Format
When generating code:

Show only the code (no lengthy preambles)
Include necessary imports
Add inline comments for complex logic only
Mention affected files (e.g., "Update src/pages/Dashboard.tsx")
Flag breaking changes if any

Example response:
tsx// src/components/team/TeamMemberCard.tsx
export default function TeamMemberCard({ member }: Props) {
  const handleEdit = () => {
    // logic
  }
  
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      {/* content */}
    </div>
  )
}

Remember: This is production code. Prioritize consistency, security (RLS), and maintainability over cleverness.
**Multi-tenant CRM System** built with React 18 + TypeScript + Vite + Supabase + Zustand.

### Key Components
- **Frontend**: React 18 with TypeScript, Vite for build tooling
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **State Management**: Zustand stores with TypeScript interfaces
- **Styling**: TailwindCSS with custom design system
- **UI Components**: Custom components with Framer Motion animations

### Project Structure
```
src/
├── components/
│   ├── ui/           # Base components (Button, Card, Input)
│   └── team/         # Feature-specific components
├── pages/            # Route components
├── stores/           # Zustand state management
├── services/         # Supabase API integration
├── lib/              # Utilities and configurations
└── hooks/            # Custom React hooks
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue variants (`bg-blue-600`, `text-blue-400`)
- **Secondary**: Green variants (`bg-emerald-500`, `text-emerald-400`)
- **Accent**: Cyan variants (`bg-cyan-500`, `text-cyan-400`)
- **Neutral**: Slate variants (`bg-slate-200`, `text-slate-300`)

### Component Patterns
```tsx
// Card with consistent styling
<div className="rounded-3xl bg-white/5 border border-white/10 p-6 shadow-2xl">

// Button with hover effects
<button className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-2xl hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95">
```

### Layout Pattern
- **Background**: Fixed gradient overlay for HUD effect
- **Cards**: `rounded-3xl` with `bg-white/5 border border-white/10`
- **Spacing**: `space-y-8` for sections, `gap-6` for grids

## 🔧 Development Workflow

### Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint check
npm run preview  # Preview production build
```

### Environment Setup
- Copy `.env.example` to `.env`
- Configure Supabase credentials
- Run SQL migrations in Supabase dashboard

## 📊 State Management

### Zustand Store Pattern
```tsx
// src/stores/authStore.ts
interface AuthState {
  user: User | null
  member: Membership | null
  tenant: Tenant | null
  // actions
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // state
  user: null,
  member: null,
  tenant: null,
  
  // actions
  signIn: async (email, password) => {
    // implementation
  }
}))
```

### Key Stores
- `authStore.ts`: Authentication and user management
- `notificationStore.ts`: Toast notifications
- Other feature-specific stores

## 🔗 API Integration

### Supabase Service Pattern
```tsx
// src/services/equipeService.ts
export async function getTeamOverview(tenantId: string) {
  const { data, error } = await supabase
    .rpc('get_team_overview', { p_tenant_id: tenantId })
  
  if (error) throw error
  return data
}
```

### Database Types
- Use generated TypeScript types from Supabase
- Multi-tenant isolation with RLS policies
- RPC functions for complex operations

## 🎯 Component Patterns

### Custom UI Components
```tsx
// src/components/ui/Button.tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, ...props }, ref) => {
    // Implementation with consistent styling
  }
)
```

### Page Components
- Use functional components with hooks
- Follow consistent layout structure
- Handle loading states and error boundaries

## 🚀 Deployment

### Build Configuration
- Vite handles production builds
- Static assets served from `/`
- Environment variables prefixed with `VITE_`

### Supabase Deployment
- Database migrations in `supabase/` directory
- RPC functions for complex business logic
- RLS policies for data security

## 📝 Code Conventions

### Naming
- **Components**: PascalCase (e.g., `TeamHeader`, `MemberCard`)
- **Functions**: camelCase (e.g., `handleSubmit`, `loadData`)
- **Files**: kebab-case for components, camelCase for utilities

### Imports
```tsx
// Group imports by type
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/Button'
```

### Error Handling
- Use try/catch blocks for async operations
- Show user-friendly error messages with toast notifications
- Log errors to console for debugging

## 🔐 Security

### Authentication
- Supabase Auth for user management
- JWT tokens handled automatically
- Row Level Security (RLS) for data isolation

### Data Validation
- Client-side validation with Yup schemas
- Server-side validation in Supabase RPC functions
- TypeScript interfaces for type safety

## 🎨 UI/UX Patterns

### Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Grid layouts that adapt to screen size
- Touch-friendly interactive elements

### Animations
- Framer Motion for smooth transitions
- Consistent hover effects on interactive elements
- Loading states with skeleton screens

### Dark Mode
- CSS class-based dark mode (`dark:` prefix)
- Consistent color schemes for both themes
- Automatic theme switching based on user preference</content>
<parameter name="filePath">e:\Agência\Gold Age\Heavens Enterprise\Azera\.github\copilot-instructions.md
