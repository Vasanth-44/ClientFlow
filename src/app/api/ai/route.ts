import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';
const hasApiKey = !!apiKey && apiKey !== 'YOUR_OPENAI_API_KEY';

const openai = hasApiKey ? new OpenAI({ apiKey }) : null;

// Allowed tool types (allowlist prevents prompt injection via unknown types)
const ALLOWED_TOOL_TYPES = new Set([
  'proposal',
  'email',
  'meeting',
  'ask',
  'sales_assistant',
]);

export async function POST(request: Request) {
  try {
    // Guard: reject oversized bodies (prevent resource exhaustion)
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > 100_000) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }

    const body = await request.json();
    const { toolType, data } = body;

    if (!toolType) {
      return NextResponse.json({ error: 'Missing toolType parameter' }, { status: 400 });
    }

    // Validate toolType against allowlist
    if (!ALLOWED_TOOL_TYPES.has(toolType)) {
      return NextResponse.json({ error: 'Invalid toolType' }, { status: 400 });
    }

    // Cap prompt length to prevent excessive token usage
    if (data?.prompt && typeof data.prompt === 'string' && data.prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt too long (max 2000 characters)' }, { status: 400 });
    }
    if (data?.rawNotes && typeof data.rawNotes === 'string' && data.rawNotes.length > 5000) {
      return NextResponse.json({ error: 'Notes too long (max 5000 characters)' }, { status: 400 });
    }

    if (hasApiKey && openai) {
      let prompt = '';
      if (toolType === 'proposal') {
        prompt = `Generate a professional project proposal for a client named "${data.clientName}". 
Project type: ${data.projectType}. 
Budget: INR ${data.budget}. 
Timeline: ${data.timeline}.
Please output a detailed proposal with sections: Scope of Work, Project Timeline, Pricing, and Terms.`;
      } else if (toolType === 'email') {
        prompt = `Generate a professional client email of type "${data.emailType}" for project "${data.projectName}". 
Client contact: ${data.clientName}. 
Additional context: ${data.context || 'None'}.`;
      } else if (toolType === 'meeting') {
        prompt = `Summarize these raw client meeting notes. 
Output a clear high-level summary, bulleted action items, and any identified deadlines. 
Raw Notes:\n${data.rawNotes}`;
      } else if (toolType === 'ask') {
        prompt = `You are a helpful business assistant inside the ClientFlow AI dashboard.
The user is asking: "${data.prompt}".
Context: ClientFlow AI is a CRM, project management, and invoice tracking SaaS application.
Provide a concise, professional, and action-oriented answer (max 4 sentences).`;
      } else if (toolType === 'sales_assistant') {
        prompt = `You are the ClientFlow AI Sales Assistant, a senior SaaS CRM advisor.
Here is the current workspace database context:
- Leads: ${JSON.stringify(data.leads || [])}
- Clients: ${JSON.stringify(data.clients || [])}
- Call Logs: ${JSON.stringify(data.callLogs || [])}
- Proposals: ${JSON.stringify(data.proposals || [])}

The user's query: "${data.prompt}"

Analyze this workspace data and write a professional, highly specific, and actionable reply. Mention lead and client names from the context when relevant. Do not suggest placeholders. Keep your response clear and structured.`;
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      return NextResponse.json({
        content: completion.choices[0]?.message?.content || 'No output generated.',
        isMocked: false,
      });
    }

    // -------------------------------------------------------------
    // MOCK COMPILER FALLBACK (when OPENAI_API_KEY is not defined)
    // -------------------------------------------------------------
    let mockContent = '';

    if (toolType === 'proposal') {
      mockContent = `# Project Proposal: ${data.projectType || 'Software Development'}
Prepared for: **${data.clientName || 'Valued Client'}**
Prepared by: ClientFlow AI
Contract Value: **₹${Number(data.budget || 20000).toLocaleString('en-IN')}**
Estimated Timeline: **${data.timeline || '4 weeks'}**

---

## 1. Scope of Work
We will architect, design, and deploy a custom solution tailored for **${data.clientName}**. 
Specifically, the deliverables for this **${data.projectType || 'Software Project'}** include:
- Requirements Analysis & Figma UI Wireframe wireframing
- Core Frontend Development utilizing React, Next.js App Router, and Tailwind CSS
- Backend database synchronization and RLS security triggers
- Responsive styling optimized for both mobile and desktop viewports
- Final deployment on Vercel with domain routing configurations

## 2. Project Timeline & Milestones
- **Milestone 1: UI Mockups & Architecture Design** (Week 1)
  - Deliver wireframes and layout schemes for client approval.
- **Milestone 2: Core Frontend & Database Schemas** (Weeks 2-3)
  - Set up PostgreSQL tables, trigger syncs, and mock state configurations.
- **Milestone 3: QA Testing & Client Handover** (Week 4)
  - Verify accessibility, performance audits, and launch project to production.

## 3. Pricing & Billing Terms
The total cost for services rendered is **₹${Number(data.budget || 20000).toLocaleString('en-IN')}**.
- **50% upfront deposit** (Advance Paid) required to initialize active project design.
- **50% final milestone balance** due upon successful QA testing handover.
All invoices GST compliant. Payments tracked in ledger sheets.

## 4. General Terms
This proposal remains valid for 30 days from date of receipt. Final codebase intellectual ownership is transferred to client upon receipt of full contract balance.`;
    } else if (toolType === 'email') {
      const eType = data.emailType || 'project update';
      if (eType === 'payment reminder') {
        mockContent = `Subject: Payment Reminder: Invoice INV-2026-002 for ${data.projectName || 'Website Redesign'}

Dear ${data.clientName || 'Client'},\n\nI hope this email finds you well.\n\nThis is a friendly reminder that invoice INV-2026-002 for project "${data.projectName || 'Website'}" is currently pending collection. 
\nOutstanding Balance: Rs ${Number(data.context || 15000).toLocaleString('en-IN')}\nDue Date: Upcoming\n\nPlease let me know if you need another copy of the invoice PDF or have any billing questions. We appreciate your partnership!\n\nBest regards,\n[Your Name]\nClientFlow Admin`;
      } else if (eType === 'project update') {
        mockContent = `Subject: Project Status Update: ${data.projectName || 'Active Development'}

Dear ${data.clientName || 'Client'},\n\nI am writing to share a brief update on the progress of "${data.projectName || 'Active project'}".\n\nWe have successfully completed Milestone 1 (Design & Layout wireframes) and are now shifting focus to core API sync integration.
${data.context ? `\nNotes: ${data.context}\n` : ''}
We remain on schedule for our planned target launch date. Let me know if you would like to hop on a quick call this week to review the current staging deployment!\n\nBest regards,\n[Your Name]`;
      } else {
        mockContent = `Subject: Project Follow-up: Next Steps for ${data.projectName || 'Onboarding'}

Dear ${data.clientName || 'Client'},\n\nI hope you're having a productive week.\n\nFollowing up on our discussions regarding project "${data.projectName || 'Milestone'}". We are excited to get started on development.
${data.context ? `\nContext detail: ${data.context}\n` : ''}
Please review the attached contract guidelines and budget limits. Once approved, we will issue the advance payment invoice to begin scheduling work items.\n\nBest regards,\n[Your Name]`;
      }
    } else if (toolType === 'meeting') {
      mockContent = `# Meeting Minutes: Summary & Action Items

## 1. High-Level Summary
The team met to align on deliverables, timeline dates, and database requirements. Client emphasized the need for a modern layout design, dark mode compatibility, and secure multi-user role segregation.

## 2. Action Items
- **[ ] frontend developer** to install Framer Motion and create responsive sidebar navigation layouts. (Priority: High)
- **[ ] database engineer** to enable Supabase PostgreSQL triggers and implement user table RLS check policies. (Priority: Urgent)
- **[ ] designer** to finalize Figma wireframes and deliver client assets to storage bucket. (Priority: Medium)

## 3. Deadlines
- Core Frontend Review: Next Friday
- Supabase Integration: Within 10 days
- Production Handover: 4 weeks out

---
*Note: These action items have been compiled from raw transcripts:*
> "${data.rawNotes || 'Meeting notes transcripts empty'}"`;
    } else if (toolType === 'ask') {
      const q = (data.prompt || '').toLowerCase();
      if (q.includes('lead')) {
        mockContent = `To manage your sales pipeline, go to the **Leads** section. You can view all prospects, search/filter them, drag-and-drop cards across the Kanban board stages (New Lead, Contacted, Interested, etc.), and record communication histories. When a deal is signed, click the **Convert to Client** button on the lead's timeline page to automatically transfer all details.`;
      } else if (q.includes('invoice') || q.includes('bill') || q.includes('pay')) {
        mockContent = `To track project billing, go to the **Invoices** page. You can generate professional invoices with customizable tax rates and download PDF files. You can also view outstanding dues and record advances or milestone completions under the **Payments** tab of any active project.`;
      } else if (q.includes('project') || q.includes('task')) {
        mockContent = `All project deliverables are tracked in the **Projects** and **Tasks** modules. Inside any project's detail view, you can check off specific tasks, log financial metrics, and upload contracts or assets under the **Documents** tab.`;
      } else if (q.includes('ai') || q.includes('write') || q.includes('proposal')) {
        mockContent = `You can use **AI Tools** from the sidebar to generate professional contract proposals, draft client emails (payment reminders or updates), and extract action items from raw meeting notes. Try generating one and viewing your past generation history!`;
      } else {
        mockContent = `Welcome to **ClientFlow AI**! I am your virtual workspace assistant. You can use this dashboard search bar to ask about CRM pipelines, check invoice terms, or ask for guidance. Try typing a question about **leads**, **projects**, **invoices**, or **AI tools** to see how I can help!`;
      }
    } else if (toolType === 'sales_assistant') {
      const q = (data.prompt || '').toLowerCase();
      const leads = data.leads || [];
      const clients = data.clients || [];
      const callLogs = data.callLogs || [];
      const proposals = data.proposals || [];

      if (q.includes('contact') || q.includes('who should i') || q.includes('today')) {
        const activeLeads = leads.filter((l: any) => l.status !== 'Won' && l.status !== 'Lost');
        
        if (activeLeads.length === 0) {
          mockContent = `### AI Sales Recommendations: Contacts to Make Today
All active leads are currently up-to-date. You have no pending leads in pipeline stages outside Won/Lost. 

**Next Steps**:
- Upload a new list of CSV prospects in the **Outreach Center** to feed the sales pipeline.
- Start a new enterprise cold calling campaign to generate fresh warm targets.`;
        } else {
          mockContent = `### AI Sales Recommendations: Contacts to Make Today
Based on engagement history, pipeline stages, and lead scores, here are your top follow-up priorities for today:

1. **${activeLeads[0]?.full_name || 'Emily Davis'}** (${activeLeads[0]?.business_name || 'Beta Designs'}) — *Status: ${activeLeads[0]?.status || 'Interested'}*
   - **Reason**: Hot engagement. Last call outcome was positive, and they are waiting on details.
   - **Next Action**: Send outreach proposal draft or schedule a meeting.
${activeLeads[1] ? `2. **${activeLeads[1].full_name}** (${activeLeads[1].business_name || 'N/A'}) — *Status: ${activeLeads[1].status}*
   - **Reason**: Recently added lead with high potential.
   - **Next Action**: Dial their number (${activeLeads[1].phone || 'N/A'}) or send a direct email regarding project scoping.` : ''}

**AI Insight**: Focus on moving these leads to the *Proposal Sent* or *Negotiation* stage this afternoon.`;
        }
      } else if (q.includes('value') || q.includes('highest') || q.includes('opportunities')) {
        const highValueProposals = proposals.filter((p: any) => p.status === 'Sent' || p.status === 'Viewed' || p.status === 'Draft');
        const sortedProps = [...highValueProposals].sort((a: any, b: any) => (b.pricing || 0) - (a.pricing || 0));

        if (sortedProps.length === 0) {
          mockContent = `### AI Sales Insights: Highest Value Opportunities
No active proposals found in the database. 

**Recommendations**:
- Go to the **Proposals Vault** to draft a new project contract.
- Review your active projects to see if any milestone payments or upsell opportunities are available.`;
        } else {
          mockContent = `### AI Sales Insights: Highest Value Opportunities
Here are the highest value opportunities currently in your pipeline:

${sortedProps.slice(0, 3).map((p: any, idx: number) => {
  return `${idx + 1}. **${p.title}** — **₹${Number(p.pricing).toLocaleString('en-IN')}**
   - **Lead/Client**: ${p.leads?.full_name || p.clients?.name || 'Prospect'}
   - **Status**: \`${p.status}\` (Created: ${new Date(p.created_at).toLocaleDateString()})
   - **Next Action**: ${p.status === 'Draft' ? 'Finalize scoping & send PDF' : p.status === 'Sent' ? 'Follow up to confirm receipt' : 'Draft negotiation terms'}`;
}).join('\n')}

**Total Pipeline Value**: **₹${sortedProps.reduce((acc: number, cur: any) => acc + (cur.pricing || 0), 0).toLocaleString('en-IN')}** across ${sortedProps.length} proposals.`;
        }
      } else if (q.includes('summarize') || q.includes('summary')) {
        const target = leads.find((l: any) => q.includes(l.full_name.toLowerCase()) || (l.business_name && q.includes(l.business_name.toLowerCase()))) 
          || clients.find((c: any) => q.includes(c.name.toLowerCase()) || (c.business_name && q.includes(c.business_name.toLowerCase())));

        if (target) {
          const isLead = !target.email || leads.some((l: any) => l.id === target.id);
          const status = isLead ? `Lead status: \`${target.status}\`` : 'Active Client';
          const website = target.website ? `[Website](${target.website})` : 'No website recorded';
          
          mockContent = `### AI Summary: ${target.full_name || target.name} (${target.business_name || 'Individual'})
- **Type**: ${isLead ? 'Lead Prospect' : 'Client'}
- **Current Status**: ${status}
- **Contact**: ${target.email || 'No email'} | ${target.phone || 'No phone'} | ${website}

**AI Performance Assessment**:
- **History & Engagement**: This account has regular activity logs in the database. Call logs indicate they are responsive and professional.
- **Project Scope**: Interested in services category: *${target.business_category || 'General Operations'}*.
- **Risk Assessment**: Low risk. Recommended to proceed with immediate follow-up to secure the next billing milestone.`;
        } else {
          const firstLead = leads[0];
          if (firstLead) {
            mockContent = `### AI Summary: ${firstLead.full_name} (${firstLead.business_name || 'Individual'})
- **Type**: Lead Prospect
- **Current Status**: \`${firstLead.status}\`
- **Contact**: ${firstLead.email || 'No email'} | ${firstLead.phone || 'No phone'}

**AI Performance Assessment**:
- **Engagement**: Currently in the *${firstLead.status}* stage of your sales pipeline.
- **Business Category**: *${firstLead.business_category || 'Software Development'}*.
- **Recommended Action**: Send a personalized follow-up summary to schedule a scoping meeting.`;
          } else {
            mockContent = `### AI Sales Summary
No active leads or clients found in your workspace database to summarize. Please insert new clients or leads via the **Leads** or **Clients** dashboard sections first.`;
          }
        }
      } else {
        mockContent = `### AI Sales Assistant Response
Hello! I have scanned your sales pipeline. You currently have **${leads.length} leads**, **${clients.length} clients**, and **${proposals.length} proposals** in active status.

**Quick Options**:
- Ask me *"Which leads should I contact today?"* to analyze engagement velocity.
- Ask me *"Show highest value opportunities"* to pull proposal budgets.
- Ask me *"Summarize [Name]"* to run an analytical report on any lead or client.

How else can I assist your sales team today?`;
      }
    }

    return NextResponse.json({ content: mockContent, isMocked: true });
  } catch (err: any) {
    console.error('Error in AI routing:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
