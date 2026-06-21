import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Type definitions for our mock DB
interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
}

// Check if we should use mock data
export const isMockEnabled = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL';

// Chainable query builder to mimic Supabase PostgrestFilterBuilder
class MockQueryBuilder {
  private data: any[];
  private isSingle = false;
  private isMaybeSingle = false;
  private options: any = null;

  constructor(data: any[], options?: any) {
    this.data = [...data];
    this.options = options;
  }

  select(columns: string = '*', options?: any) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    return this;
  }

  eq(field: string, value: any) {
    this.data = this.data.filter((item) => {
      if (item[field] === undefined) return false;
      return String(item[field]) === String(value);
    });
    return this;
  }

  neq(field: string, value: any) {
    this.data = this.data.filter((item) => {
      if (item[field] === undefined) return true;
      return String(item[field]) !== String(value);
    });
    return this;
  }

  in(field: string, values: any[]) {
    this.data = this.data.filter((item) => {
      if (item[field] === undefined) return false;
      return values.map(v => String(v)).includes(String(item[field]));
    });
    return this;
  }

  order(field: string, { ascending = true } = {}) {
    this.data.sort((a, b) => {
      if (a[field] === undefined || b[field] === undefined) return 0;
      if (a[field] < b[field]) return ascending ? -1 : 1;
      if (a[field] > b[field]) return ascending ? 1 : -1;
      return 0;
    });
    return this;
  }

  limit(count: number) {
    this.data = this.data.slice(0, count);
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Thenable interface to support direct await on builder
  then(resolve: (val: any) => void) {
    let result: any;
    let error: any = null;

    if (this.options?.head) {
      result = null;
    } else if (this.isSingle) {
      if (this.data.length === 0) {
        result = null;
        error = { message: 'Not found' };
      } else {
        result = this.data[0];
      }
    } else if (this.isMaybeSingle) {
      result = this.data.length > 0 ? this.data[0] : null;
    } else {
      result = this.data;
    }

    resolve({
      data: result,
      count: this.data.length,
      error,
    });
  }
}

// -------------------------------------------------------------
// LOCALSTORAGE MOCK CLIENT IMPLEMENTATION
// -------------------------------------------------------------

class MockSupabaseClient {
  private realtimeListeners: { table: string; callback: Function }[] = [];

  channel(name: string) {
    const client = this;
    const channelInstance = {
      on: (event: string, filter: any, callback: Function) => {
        client.realtimeListeners.push({ table: filter.table, callback });
        return channelInstance;
      },
      subscribe: () => {
        return channelInstance;
      }
    };
    return channelInstance;
  }

  removeChannel(channel: any) {
    this.realtimeListeners = [];
  }

  private getStorage(key: string): any[] {
    if (typeof window === 'undefined') return [];
    const val = localStorage.getItem(`clientflow_mock_${key}`);
    return val ? JSON.parse(val) : [];
  }

  private setStorage(key: string, data: any[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`clientflow_mock_${key}`, JSON.stringify(data));
  }

  private getSessionUser(): MockUser | null {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem('clientflow_mock_session');
    return session ? JSON.parse(session) : null;
  }

  // Auth Operations
  auth = {
    signUp: async ({ email, password, options }: any) => {
      const users = this.getStorage('users');
      if (users.find((u) => u.email === email)) {
        return { data: { user: null }, error: { message: 'User already exists' } };
      }
      const newUser: MockUser = {
        id: Math.random().toString(36).substring(2, 15),
        email,
        name: options?.data?.name || email.split('@')[0],
        avatar: options?.data?.avatar || '',
        created_at: new Date().toISOString(),
      };
      users.push(newUser);
      this.setStorage('users', users);
      
      // Auto sign in on signup for mock simplicity
      localStorage.setItem('clientflow_mock_session', JSON.stringify(newUser));
      this.triggerAuthChange('SIGNED_IN', newUser);

      return { data: { user: newUser, session: { user: newUser } }, error: null };
    },

    signInWithPassword: async ({ email, password }: any) => {
      const users = this.getStorage('users');
      const user = users.find((u) => u.email === email);
      if (!user) {
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
      }
      localStorage.setItem('clientflow_mock_session', JSON.stringify(user));
      this.triggerAuthChange('SIGNED_IN', user);
      return { data: { user, session: { user } }, error: null };
    },

    signInWithOAuth: async ({ provider }: any) => {
      // Mock OAuth
      const mockOAuthUser: MockUser = {
        id: 'google-oauth-mock-id',
        email: 'google.user@example.com',
        name: 'Google User',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        created_at: new Date().toISOString(),
      };
      const users = this.getStorage('users');
      if (!users.find(u => u.id === mockOAuthUser.id)) {
        users.push(mockOAuthUser);
        this.setStorage('users', users);
      }
      localStorage.setItem('clientflow_mock_session', JSON.stringify(mockOAuthUser));
      this.triggerAuthChange('SIGNED_IN', mockOAuthUser);
      return { data: { provider }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem('clientflow_mock_session');
      this.triggerAuthChange('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async () => {
      const user = this.getSessionUser();
      if (!user) return { data: { session: null }, error: null };
      return { data: { session: { user, access_token: 'mock-token' } }, error: null };
    },

    getUser: async () => {
      const user = this.getSessionUser();
      return { data: { user }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authListeners.push(callback);
      // Immediately call with current session
      const user = this.getSessionUser();
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners = this.authListeners.filter((l) => l !== callback);
            },
          },
        },
      };
    },
  };

  private authListeners: Function[] = [];
  private triggerAuthChange(event: string, user: MockUser | null) {
    const session = user ? { user } : null;
    this.authListeners.forEach((listener) => listener(event, session));
  }

  private resolveJoins(table: string, items: any[]): any[] {
    if (table === 'projects') {
      const clients = this.getStorage('clients');
      return items.map(item => ({
        ...item,
        clients: clients.find(c => c.id === item.client_id) || null
      }));
    }
    if (table === 'tasks') {
      const projects = this.getStorage('projects');
      return items.map(item => ({
        ...item,
        projects: projects.find(p => p.id === item.project_id) || null
      }));
    }
    if (table === 'invoices') {
      const clients = this.getStorage('clients');
      const projects = this.getStorage('projects');
      return items.map(item => ({
        ...item,
        clients: clients.find(c => c.id === item.client_id) || null,
        projects: projects.find(p => p.id === item.project_id) || null
      }));
    }
    if (table === 'documents') {
      const clients = this.getStorage('clients');
      const projects = this.getStorage('projects');
      return items.map(item => ({
        ...item,
        clients: clients.find(c => c.id === item.client_id) || null,
        projects: projects.find(p => p.id === item.project_id) || null
      }));
    }
    if (table === 'activities') {
      const leads = this.getStorage('leads');
      const clients = this.getStorage('clients');
      return items.map(item => ({
        ...item,
        leads: leads.find(l => l.id === item.lead_id) || null,
        clients: clients.find(c => c.id === item.client_id) || null
      }));
    }
    if (table === 'team_members') {
      const teams = this.getStorage('teams');
      return items.map(item => ({
        ...item,
        teams: teams.find(t => t.id === item.team_id) || null
      }));
    }
    if (table === 'proposals') {
      const clients = this.getStorage('clients');
      const leads = this.getStorage('leads');
      return items.map(item => ({
        ...item,
        clients: clients.find(c => c.id === item.client_id) || null,
        leads: leads.find(l => l.id === item.lead_id) || null
      }));
    }
    if (table === 'call_logs') {
      const leads = this.getStorage('leads');
      const campaigns = this.getStorage('call_campaigns');
      return items.map(item => ({
        ...item,
        leads: leads.find(l => l.id === item.lead_id) || null,
        call_campaigns: campaigns.find(c => c.id === item.campaign_id) || null
      }));
    }
    if (table === 'lead_stage_history') {
      const leads = this.getStorage('leads');
      return items.map(item => ({
        ...item,
        leads: leads.find(l => l.id === item.lead_id) || null
      }));
    }
    return items;
  }

  // Database operations builder
  from(table: string) {
    const client = this;
    let rawData = this.getStorage(table);
    
    // Seed initial mock data if empty
    if (rawData.length === 0 && typeof window !== 'undefined') {
      rawData = this.getInitialSeedData(table);
      this.setStorage(table, rawData);
    }

    const data = this.resolveJoins(table, rawData);

    return {
      select: (columns: string = '*', options?: any) => {
        return new MockQueryBuilder(data, options);
      },

      insert: (record: any) => {
        const user = client.getSessionUser();
        const records = Array.isArray(record) ? record : [record];
        const inserted: any[] = [];

        records.forEach((rec) => {
          const newRec = {
            id: rec.id || Math.random().toString(36).substring(2, 15),
            user_id: user?.id || 'mock-user-id',
            created_at: new Date().toISOString(),
            ...rec,
          };
          
          if (table === 'payments') {
            const total = Number(newRec.total_amount) || 0;
            const received = Number(newRec.received) || 0;
            newRec.pending = total - received;
          }

          rawData.push(newRec);
          inserted.push(newRec);

          // Trigger realtime listeners
          client.realtimeListeners
            .filter((l) => l.table === table)
            .forEach((l) => {
              l.callback({
                eventType: 'INSERT',
                new: newRec,
              });
            });
        });

        client.setStorage(table, rawData);
        return {
          select: () => {
            return {
              single: () => Promise.resolve({ data: client.resolveJoins(table, inserted)[0], error: null }),
              then: (resolve: any) => resolve({ data: client.resolveJoins(table, inserted), error: null }),
            };
          },
          then: (resolve: any) => resolve({ data: client.resolveJoins(table, inserted), error: null }),
        };
      },

      update: (updates: any) => {
        return {
          eq: (field: string, value: any) => {
            let updatedCount = 0;
            const updatedData = rawData.map((item) => {
              if (String(item[field]) === String(value)) {
                updatedCount++;
                const newRec = { ...item, ...updates };
                if (table === 'payments') {
                  const total = Number(newRec.total_amount) || 0;
                  const received = Number(newRec.received) || 0;
                  newRec.pending = total - received;
                }
                
                // Trigger realtime update listeners
                client.realtimeListeners
                  .filter((l) => l.table === table)
                  .forEach((l) => {
                    l.callback({
                      eventType: 'UPDATE',
                      new: newRec,
                    });
                  });

                return newRec;
              }
              return item;
            });

            if (updatedCount > 0) {
              client.setStorage(table, updatedData);
            }
            const affectedRaw = updatedData.filter(i => String(i[field]) === String(value));
            return Promise.resolve({ data: client.resolveJoins(table, affectedRaw), error: null });
          },
        };
      },

      delete: () => {
        return {
          eq: (field: string, value: any) => {
            const toDelete = rawData.filter((item) => String(item[field]) === String(value));
            const filtered = rawData.filter((item) => String(item[field]) !== String(value));
            client.setStorage(table, filtered);

            toDelete.forEach((oldRec) => {
              client.realtimeListeners
                .filter((l) => l.table === table)
                .forEach((l) => {
                  l.callback({
                    eventType: 'DELETE',
                    old: oldRec,
                  });
                });
            });

            return Promise.resolve({ error: null });
          },
        };
      },
    };
  }

  // File storage mockup
  storage = {
    from: (bucketName: string) => {
      const client = this;
      return {
        upload: async (filePath: string, file: File) => {
          // In mock mode, we create a data URL or object URL
          const url = URL.createObjectURL(file);
          const docs = client.getStorage('documents');
          const newDoc = {
            id: Math.random().toString(36).substring(2, 15),
            file_name: file.name,
            file_url: url,
            file_type: file.type || 'application/octet-stream',
            created_at: new Date().toISOString(),
          };
          // We don't save the document to the table here directly,
          // rather the standard API flow uploads the file first, returns URL,
          // and then does an insert on the 'documents' table.
          return { data: { path: filePath, url }, error: null };
        },
        getPublicUrl: (filePath: string) => {
          return { data: { publicUrl: filePath } };
        }
      };
    }
  };

  private getInitialSeedData(table: string): any[] {
    switch (table) {
      case 'users':
        return [
          {
            id: 'google-oauth-mock-id',
            email: 'admin@clientflow.ai',
            name: 'Vasanth',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            created_at: new Date().toISOString(),
          }
        ];
      case 'clients':
        return [
          {
            id: 'c1',
            user_id: 'google-oauth-mock-id',
            name: 'John Doe',
            business_name: 'Acme Corp',
            email: 'john@acme.com',
            phone: '+1 555-0199',
            website: 'https://acme.com',
            address: '123 Enterprise Way, Suite 500, San Francisco, CA',
            notes: 'Prefers communication via Slack. Always pays invoices early.',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'c2',
            user_id: 'google-oauth-mock-id',
            name: 'Sarah Connor',
            business_name: 'Cyberdyne Systems',
            email: 'sarah@cyberdyne.io',
            phone: '+1 555-0245',
            website: 'https://cyberdyne.io',
            address: '456 Tech Park, Austin, TX',
            notes: 'Urgent project requirements. Strict security compliance needed.',
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'projects':
        return [
          {
            id: 'p1',
            client_id: 'c1',
            user_id: 'google-oauth-mock-id',
            name: 'Website Redesign',
            description: 'Redesign client landing page, services directory, and checkout flow using Next.js.',
            budget: 25000,
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'In Progress',
            priority: 'High',
            created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'p2',
            client_id: 'c2',
            user_id: 'google-oauth-mock-id',
            name: 'Mobile App API Integration',
            description: 'Build Supabase database schema and OAuth handlers for iOS/Android frontend apps.',
            budget: 15000,
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Lead',
            priority: 'Medium',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'tasks':
        return [
          {
            id: 't1',
            project_id: 'p1',
            user_id: 'google-oauth-mock-id',
            name: 'Design Figma Wireframes',
            deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'High',
            status: 'Completed',
            created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 't2',
            project_id: 'p1',
            user_id: 'google-oauth-mock-id',
            name: 'Implement Next.js App Router',
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'High',
            status: 'In Progress',
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 't3',
            project_id: 'p1',
            user_id: 'google-oauth-mock-id',
            name: 'Supabase Syncing and Realtime Hooks',
            deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'Medium',
            status: 'Todo',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'payments':
        return [
          {
            id: 'pay1',
            project_id: 'p1',
            user_id: 'google-oauth-mock-id',
            total_amount: 25000,
            advance_paid: 10000,
            received: 10000,
            pending: 15000,
            created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'invoices':
        return [
          {
            id: 'i1',
            client_id: 'c1',
            project_id: 'p1',
            user_id: 'google-oauth-mock-id',
            invoice_number: 'INV-2026-001',
            amount: 10000,
            tax: 18,
            due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Paid',
            created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'i2',
            client_id: 'c1',
            project_id: 'p1',
            user_id: 'google-oauth-mock-id',
            invoice_number: 'INV-2026-002',
            amount: 15000,
            tax: 18,
            due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Unpaid',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'documents':
        return [
          {
            id: 'd1',
            project_id: 'p1',
            client_id: 'c1',
            user_id: 'google-oauth-mock-id',
            file_name: 'Design_Proposal_Acme.pdf',
            file_url: '#',
            file_type: 'application/pdf',
            created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'notifications':
        return [
          {
            id: 'n1',
            user_id: 'google-oauth-mock-id',
            message: 'Acme Corp paid INV-2026-001.',
            type: 'payment',
            is_read: false,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'n2',
            user_id: 'google-oauth-mock-id',
            message: 'Website Redesign project is nearing its deadline!',
            type: 'alert',
            is_read: false,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'leads':
        return [
          {
            id: 'l1',
            user_id: 'google-oauth-mock-id',
            full_name: 'John Smith',
            business_name: 'Alpha Labs',
            email: 'john@alphalabs.co',
            phone: '+1 555-0111',
            website: 'https://alphalabs.co',
            business_category: 'Software Development',
            lead_source: 'Google Search',
            status: 'New Lead',
            notes: 'Interested in a SaaS landing page built with Next.js.',
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'l2',
            user_id: 'google-oauth-mock-id',
            full_name: 'Emily Davis',
            business_name: 'Beta Designs',
            email: 'emily@betadesigns.com',
            phone: '+1 555-0222',
            website: 'https://betadesigns.com',
            business_category: 'Branding & UI/UX',
            lead_source: 'Twitter/X',
            status: 'Interested',
            notes: 'Needs brand identity work. Ready for a scoping call.',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'l3',
            user_id: 'google-oauth-mock-id',
            full_name: 'Michael Chen',
            business_name: 'Delta Consulting',
            email: 'michael@deltaconsulting.io',
            phone: '+1 555-0333',
            website: 'https://deltaconsulting.io',
            business_category: 'Marketing Strategy',
            lead_source: 'Referral',
            status: 'Proposal Sent',
            notes: 'Sent contract outline of ₹50,000 for ad campaign setup.',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'activities':
        return [
          {
            id: 'act1',
            user_id: 'google-oauth-mock-id',
            lead_id: 'l1',
            message: 'Lead John Smith (Alpha Labs) created via self-source website form.',
            type: 'lead',
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act2',
            user_id: 'google-oauth-mock-id',
            lead_id: 'l2',
            message: 'Lead Emily Davis (Beta Designs) created via social media inbound.',
            type: 'lead',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act3',
            user_id: 'google-oauth-mock-id',
            lead_id: 'l2',
            message: 'Emailed Emily to schedule a discovery call.',
            type: 'lead',
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act4',
            user_id: 'google-oauth-mock-id',
            lead_id: 'l3',
            message: 'Drafted and sent professional project proposal to Michael Chen.',
            type: 'lead',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'ai_generations':
        return [
          {
            id: 'gen1',
            user_id: 'google-oauth-mock-id',
            type: 'email',
            input_params: { emailType: 'payment reminder', clientName: 'John Doe' },
            generated_content: 'Subject: Payment Reminder - Invoice Overdue\n\nDear John,\n\nI hope you are doing well. This is a gentle reminder that invoice INV-2026-002 is past its due date. Please process it at your earliest convenience.\n\nBest regards,\nAdministrator',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];
      case 'teams':
        return [
          {
            id: 'team1',
            owner_id: 'demo-user-id',
            name: 'Demo Agency',
            created_at: new Date().toISOString(),
          }
        ];
      case 'team_members':
        return [
          { id: 'tm1', team_id: 'team1', name: 'Alex Johnson', email: 'alex@demo-agency.com', role: 'Owner', status: 'Active', created_at: new Date().toISOString() },
          { id: 'tm2', team_id: 'team1', name: 'Priya Sharma', email: 'priya@demo-agency.com', role: 'Admin', status: 'Active', created_at: new Date().toISOString() },
          { id: 'tm3', team_id: 'team1', name: 'Rohan Verma', email: 'rohan@demo-agency.com', role: 'Member', status: 'Active', created_at: new Date().toISOString() },
          { id: 'tm4', team_id: 'team1', name: 'Sara Chen', email: 'sara@demo-agency.com', role: 'Member', status: 'Pending', created_at: new Date().toISOString() },
        ];
      case 'proposals':
        return [
          {
            id: 'prop1',
            user_id: 'google-oauth-mock-id',
            client_id: 'c1',
            lead_id: 'l3',
            title: 'Website Redesign Proposal',
            scope_of_work: 'Redesigning agency landing page and customer portal.',
            deliverables: 'Figma mockups, React frontend, Supabase migration integration.',
            timeline: '4 weeks',
            pricing: 50000,
            terms: '50% advance deposit, 50% on project signoff.',
            status: 'Sent',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'prop2',
            user_id: 'google-oauth-mock-id',
            client_id: null,
            lead_id: 'l1',
            title: 'SaaS Platform Scoping',
            scope_of_work: 'Architecting custom web app for customer portal.',
            deliverables: 'Architecture document, database design blueprint.',
            timeline: '2 weeks',
            pricing: 25000,
            terms: '100% upfront payment.',
            status: 'Draft',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'lead_stage_history':
        return [
          {
            id: 'lh1',
            lead_id: 'l1',
            stage: 'New Lead',
            entered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: null,
            duration_seconds: null,
          },
          {
            id: 'lh2',
            lead_id: 'l2',
            stage: 'New Lead',
            entered_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 3 * 24 * 60 * 60,
          },
          {
            id: 'lh3',
            lead_id: 'l2',
            stage: 'Interested',
            entered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: null,
            duration_seconds: null,
          },
          {
            id: 'lh4',
            lead_id: 'l3',
            stage: 'New Lead',
            entered_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 2 * 24 * 60 * 60,
          },
          {
            id: 'lh5',
            lead_id: 'l3',
            stage: 'Contacted',
            entered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 4 * 24 * 60 * 60,
          },
          {
            id: 'lh6',
            lead_id: 'l3',
            stage: 'Interested',
            entered_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 3 * 24 * 60 * 60,
          },
          {
            id: 'lh7',
            lead_id: 'l3',
            stage: 'Proposal Sent',
            entered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            left_at: null,
            duration_seconds: null,
          },
        ];
      case 'call_campaigns':
        return [
          {
            id: 'camp1',
            user_id: 'google-oauth-mock-id',
            name: 'Enterprise Outbound Cold Calling',
            industry: 'Information Technology',
            status: 'Active',
            calls_made: 42,
            interested_leads: 12,
            meetings_booked: 3,
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'camp2',
            user_id: 'google-oauth-mock-id',
            name: 'Local SMB Branding Campaign',
            industry: 'Retail & Hospitality',
            status: 'Draft',
            calls_made: 0,
            interested_leads: 0,
            meetings_booked: 0,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'call_logs':
        return [
          {
            id: 'cl1',
            user_id: 'google-oauth-mock-id',
            lead_id: 'l1',
            campaign_id: 'camp1',
            duration: 185,
            outcome: 'Interested',
            transcript: 'Agent: Hi John, calling from ClientFlow. You showed interest in client onboarding systems.\nLead: Yes, we are planning to upgrade our CRM next month.\nAgent: Great, let\'s set up a calendar meet on Wednesday.\nLead: Sounds good.',
            followup_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'cl2',
            user_id: 'google-oauth-mock-id',
            lead_id: 'l2',
            campaign_id: 'camp1',
            duration: 45,
            outcome: 'Call Back Later',
            transcript: 'Agent: Hello Emily, is it a good time to speak?\nLead: I am in a meeting, call me tomorrow afternoon.\nAgent: Will do, thank you.',
            followup_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      case 'audit_logs':
        return [
          {
            id: 'al1',
            user_id: 'google-oauth-mock-id',
            action: 'USER_LOGIN',
            details: 'Successful auth sign in for admin@clientflow.ai',
            ip_address: '127.0.0.1',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'al2',
            user_id: 'google-oauth-mock-id',
            action: 'TEAM_RENAME',
            details: 'Renamed team/agency to LagnaVastra Agency',
            ip_address: '127.0.0.1',
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          },
        ];
      default:
        return [];
    }
  }
}

// Export the client
export const supabase = isMockEnabled
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey);
