export type HelpArticle = {
  slug: string
  title: string
  description: string
  category: string
  content: string
  readTime: number
  popular?: boolean
}

export type HelpCategory = {
  slug: string
  title: string
  icon: string
  description: string
  articles: HelpArticle[]
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    description: 'Set up your account, invite your team, and run your first job in under 10 minutes.',
    articles: [
      {
        slug: 'welcome-to-workforge',
        title: 'Welcome to WorkForge',
        description: 'Learn what WorkForge does and follow the 5-minute setup checklist to get your business running.',
        category: 'getting-started',
        readTime: 4,
        popular: true,
        content: `## What is WorkForge?

WorkForge is a field service management platform built for HVAC, plumbing, electrical, and similar trades businesses. It replaces the whiteboard, the spreadsheet, and the pile of paper invoices with a single system your office staff and field technicians use together in real time.

**Core things WorkForge handles:**
- Creating and dispatching work orders (Jobs)
- Tracking job status from Open through completion
- Invoicing clients and collecting payment on-site
- Managing your team's schedule and assignments
- Tracking equipment, service contracts, and preventive maintenance alerts
- Giving technicians a mobile-friendly view of only their assigned jobs

## The 5-Minute Setup Checklist

WorkForge is designed so you can go from sign-up to your first real job in five minutes. Here is the sequence that gets you there fastest:

**Step 1 — Add your team**
Navigate to **Team** in the left sidebar. Click **Invite Member** and enter the email address of each dispatcher or technician. Select the appropriate role for each person (see the Roles article for details). They will receive an email invitation and can set their password from the link in that email.

**Step 2 — Create your first job**
Go to **Jobs** and click **+ New Job**. Fill in the client name, address, job type (HVAC Service, Plumbing, Electrical, etc.), priority, and assign it to one of the technicians you just invited. Hit **Create Job** — the job now appears on the Kanban board in the **Open** column.

**Step 3 — Send your first invoice**
When the job is complete, open the job drawer and click **Create Invoice**. Add your line items (labor hours, parts, any surcharges), then click **Send**. Your client receives a PDF invoice they can review, and you can collect payment immediately using the payment overlay — card, cash, check, or digital.

## What Happens Next

Once you have the basics running, explore the Schedule view to see all your jobs on a calendar, set up equipment records for your clients' systems, and configure preventive maintenance intervals so WorkForge reminds you when a unit is due for service. The AI Marketing Suite in the Settings area can generate service reminders, seasonal campaigns, and follow-up messages with one click.

WorkForge is designed to grow with your business — Starter covers solo operators and small crews, Pro adds advanced reporting and unlimited team members, and Enterprise adds dedicated support and custom integrations.`
      },
      {
        slug: 'inviting-your-team',
        title: 'Inviting Your Team',
        description: 'How to add dispatchers and technicians, assign roles, and manage pending invitations.',
        category: 'getting-started',
        readTime: 3,
        popular: true,
        content: `## How Invitations Work

WorkForge uses email-based invitations. When you invite a team member, they receive an email with a secure link that lets them set their password and join your company account. Invitations expire after 7 days — if someone misses the window, you can resend from the Team page.

## Sending an Invitation

1. Go to **Team** in the left sidebar
2. Click **Invite Member** (top-right button)
3. Enter their **email address** and select their **role**
4. Click **Send Invite**

The invited person appears in a **Pending Invitations** section at the bottom of the Team page until they accept.

## Roles Explained

Choosing the right role matters because WorkForge enforces permissions based on role throughout the app.

**Admin** — Full access to everything: jobs, invoices, payments, team management, settings, and billing. Use this for owners and office managers who need to see and change anything.

**Dispatcher** — Can create jobs, assign technicians, manage the schedule, and view invoices. Cannot manage team members or billing. This is the right role for your dispatch or scheduling coordinator.

**Technician** — Sees only their own assigned jobs in the Field View. Can update job status, add notes, and upload photos. Cannot see other technicians' jobs, invoices, or company settings.

**Read-Only** — Can view jobs, schedules, and reports but cannot create or modify anything. Useful for business partners, accountants, or silent partners who need visibility without edit access.

## Tips

- **Technicians see only their jobs** — this is intentional and not configurable. It protects client privacy and keeps the mobile experience clean.
- You can change a team member's role at any time from the Team page without re-inviting them.
- If an invitation email lands in spam, have the recipient check their junk folder and search for "WorkForge" — the sender address is noreply@getworkforge.com.
- Admins can revoke access immediately by clicking the three-dot menu on any team member row and selecting **Remove from Team**.`
      },
      {
        slug: 'your-first-job',
        title: 'Creating Your First Job',
        description: 'Step-by-step guide to creating a job, assigning a technician, and moving it through statuses.',
        category: 'getting-started',
        readTime: 5,
        popular: true,
        content: `## Creating a Job

A job (also called a work order) is the central unit of work in WorkForge. Everything else — invoices, payments, photos, notes, equipment history — connects back to a job.

To create your first job, click **Jobs** in the sidebar, then **+ New Job** in the top-right corner.

## Filling In the Job Form

**Client** — Start typing a client name. If the client exists, select them from the dropdown. If they are new, type their full name and an "Add new client" option will appear.

**Address** — The service location. This autofills from the client record if the client has a saved address. You can override it for this job.

**Job Type** — Choose from HVAC Service, Plumbing, Electrical, Appliance Repair, General Maintenance, or other trade types. This affects which equipment categories are shown in the job drawer.

**Priority** — Low, Normal, High, or Emergency. Emergency jobs are highlighted in red on the Kanban board so dispatchers notice them immediately.

**Assigned Technician** — Select from your team. Only users with the Technician or Admin role appear in this dropdown. Unassigned jobs appear in a special "Unassigned" column on the board.

**Scheduled Date / Time** — Optional at creation time. You can schedule the job later from the Schedule view.

**Notes** — Internal notes that only your team sees. Use these for special access instructions, customer preferences, or anything the tech needs to know before arriving.

## Job Statuses

Every job moves through a lifecycle:

**Open** — Job is created and waiting to be dispatched or worked.

**In Progress** — The technician has started work. They update this from their Field View on arrival.

**Pending Parts** — Work is paused because a part needs to be ordered. Use this so dispatchers know why a job is stalled.

**Done** — Work is complete. The job can now be invoiced.

**Cancelled** — Job was cancelled. Cancelled jobs are hidden from the main board but visible in History.

## Moving Jobs Through Statuses

On the **Kanban board**, drag a job card from one column to another to change its status. You can also open the job drawer (click the job title) and use the **Status** dropdown in the top-right of the drawer.

Technicians update their own job status from the Field View — they see a prominent status button at the top of each job card on their mobile interface.

## After the Job

Once a job is marked **Done**, an orange **Create Invoice** button appears in the job drawer. Click it to automatically create an invoice linked to this job, pre-populated with the job details. See the Invoicing section for what to do next.`
      },
      {
        slug: 'understanding-roles',
        title: 'Understanding Roles & Permissions',
        description: 'A deep dive into all five roles — superadmin, admin, dispatcher, technician, and read-only.',
        category: 'getting-started',
        readTime: 6,
        content: `## WorkForge's Role System

WorkForge uses a role-based access control system. Every user in your account has exactly one role, and that role determines what they can see and do. Roles are set when you invite someone and can be changed at any time by an Admin.

## The Five Roles

### Superadmin
Superadmin is a platform-level role reserved for WorkForge staff. Superadmins can access any tenant's account for support and troubleshooting purposes. As a business owner, you will never assign this role to your team.

### Admin
The most powerful role available to business accounts. Admins can:
- Create, edit, and delete any job
- Manage invoices and process payments
- Invite, edit, and remove team members
- Access billing and subscription settings
- View all audit logs
- Create and manage equipment records and service contracts
- Access the AI Marketing Suite and all reporting

**Use this for:** Business owner, office manager, lead dispatcher.

### Dispatcher
Dispatchers are your scheduling and coordination team. They can:
- Create and edit jobs
- Assign jobs to technicians
- View and manage the full schedule
- View all jobs on the Kanban board
- Add notes and update job status
- View invoices (but not create or edit them)

**Cannot:** Manage team members, access billing settings, delete jobs.

**Use this for:** Dispatch coordinator, office administrator.

### Technician
Technicians have a focused, mobile-optimized experience. They can:
- See only their own assigned jobs in the Field View
- Update the status of their jobs (e.g., mark In Progress or Done)
- Add field notes and internal comments
- Upload photos from the job site
- View client address and job details

**Cannot:** See other technicians' jobs, view invoices, access the Kanban board, manage settings.

**Use this for:** Field technicians, subcontractors.

### Read-Only
Read-Only users can view almost everything — jobs, schedules, invoices, reports — but cannot create, edit, or delete anything. They receive no email notifications for job assignments.

**Use this for:** Silent partners, accountants, insurance auditors, owners who want visibility without risk of accidental changes.

## Changing a Role

Go to **Team**, find the user, click the three-dot menu on their row, and select **Edit Role**. The change takes effect immediately — their next page load reflects the new permissions.

## A Note on Technician Privacy

WorkForge intentionally prevents technicians from seeing each other's jobs. This is a deliberate design decision — it protects client information, prevents scheduling confusion, and keeps the mobile interface clean and focused. This behavior cannot be changed through settings.`
      },
      {
        slug: 'mobile-setup',
        title: 'Mobile Setup for Technicians',
        description: 'How technicians use the Field View on mobile, including offline behavior and touch-optimized controls.',
        category: 'getting-started',
        readTime: 4,
        content: `## The Field View

WorkForge has a mobile-optimized interface called the Field View, designed specifically for technicians working in the field. When a technician logs in on their phone, they land directly in the Field View — they never see the full admin dashboard.

## What Technicians See

The Field View shows a list of jobs assigned to the logged-in technician, sorted by scheduled date and time. Each job card shows:
- Client name and service address
- Job type and priority level
- Scheduled time window
- Current status with a tap-to-update button

Tapping a job card opens the job detail view with the full address (tappable to open Maps), any notes the dispatcher added, equipment information, and a photo upload button.

## Updating Job Status

The most common action a technician takes is updating job status. At the top of each job detail view is a large **status button** — tapping it shows the available next statuses. For example, an Open job shows "Mark In Progress" and "Mark Pending Parts." This design ensures status updates happen with one tap, even with gloves on.

## Adding Photos

To add a photo from a job site, open the job detail and tap **Add Photo**. The camera launches immediately — take the photo, confirm it, and it uploads to the job record. Photos are visible to dispatchers and admins in the job drawer instantly.

## Offline Behavior

WorkForge is a Progressive Web App (PWA) with service worker caching. When a technician has no cell signal:
- Their job list loads from the local cache
- They can still view job details, addresses, and notes
- Status updates are queued locally and sync automatically when connectivity returns

The offline banner at the top of the screen shows a yellow indicator when the device is offline. When the connection returns, the banner disappears and pending changes sync in the background.

## Installing as a Home Screen App

For the best mobile experience, technicians should install WorkForge as a home screen app:
- **iPhone/Safari:** Tap the Share button → "Add to Home Screen"
- **Android/Chrome:** Tap the three-dot menu → "Add to Home Screen" or "Install App"

This removes the browser chrome and gives WorkForge its own app icon. The experience is nearly identical to a native app, with faster load times and proper offline support.

## Touch Target Sizes

WorkForge is designed with 44px minimum touch targets throughout the Field View, meeting Apple's Human Interface Guidelines. Buttons are large enough to tap accurately even while wearing work gloves.`
      }
    ]
  },
  {
    slug: 'jobs',
    title: 'Jobs & Work Orders',
    icon: '🔧',
    description: 'Create jobs, manage the Kanban board, add photos and notes, and handle bulk operations.',
    articles: [
      {
        slug: 'creating-jobs',
        title: 'Creating Jobs',
        description: 'Every field in the job creation form explained, with tips for faster data entry.',
        category: 'jobs',
        readTime: 5,
        popular: true,
        content: `## The Job Creation Form

To open the new job form, click **+ New Job** in the top-right of the Jobs page, or press **N** if you are on the Jobs page (keyboard shortcut). The form slides in as a drawer on the right side of the screen.

## Required Fields

**Client** — Start typing a client or company name. WorkForge searches your client database as you type. If the client is new, finish typing their name and select "Add [name] as new client" from the dropdown. The client record is created automatically.

**Service Address** — The physical location where the work will be performed. If the selected client has a saved address, it pre-fills automatically. You can override it by clicking the address field and typing a new one.

**Job Type** — Select the trade category: HVAC Service, HVAC Install, Plumbing, Electrical, Appliance Repair, General Maintenance, or Custom. This affects which equipment types appear in the job drawer's equipment section.

## Optional but Recommended Fields

**Priority** — Low, Normal, High, or Emergency. Setting priority helps dispatchers triage the job board. Emergency jobs display with a red border on the Kanban board and appear at the top of the technician's Field View list.

**Assigned Technician** — Select a technician from the dropdown. If you leave this empty, the job lands in the **Unassigned** column on the Kanban board. Assign it later by opening the job drawer.

**Scheduled Date and Time** — The planned service window. This appears on the technician's Field View and the Schedule calendar view. You can schedule immediately at creation or leave it unscheduled and set it from the Schedule page later.

**Estimated Duration** — How long the job is expected to take. Used to calculate availability on the schedule and display job blocks proportionally on the calendar.

**Notes** — Free-text field for anything the technician needs to know: gate code, dog in yard, client prefers contact via text, specific equipment location, etc. Notes are internal — clients never see them.

## After Creating a Job

The job appears immediately on the Kanban board in the appropriate column. If you assigned a technician, they see it in their Field View right away. If you set a scheduled date, it appears on the Schedule calendar.

From the job drawer, you can also:
- Link the job to an equipment record in the client's history
- Add photos (useful for pre-job condition documentation)
- Create a linked estimate before starting work
- Start a timer to track labor time automatically`
      },
      {
        slug: 'kanban-board',
        title: 'The Kanban Board',
        description: 'Using the board view, drag-and-drop columns, filtering by technician, and searching jobs.',
        category: 'jobs',
        readTime: 4,
        popular: true,
        content: `## Board Overview

The Kanban board is the default view on the Jobs page. It shows all active jobs organized into columns by status: **Open**, **In Progress**, **Pending Parts**, and **Done**. Cancelled jobs are hidden from the board.

Each job card shows the client name, service address, assigned technician's initials, priority badge, and the scheduled date if one is set. Emergency priority jobs have a red border. High priority jobs have an orange border.

## Drag and Drop

To change a job's status, drag its card from one column and drop it into another. For example, dragging a card from **Open** to **In Progress** marks the job as in-progress and records the timestamp. The change is saved instantly — no save button needed.

On touch devices (tablets), drag-and-drop works the same way: press and hold the card for half a second until it lifts, then drag to the target column.

## Filtering by Technician

Above the board, there is a row of technician avatar pills. Click a technician's name to filter the board to show only their jobs. Click again to deselect. You can select multiple technicians at once to compare workloads.

The filter persists while you navigate within the Jobs section but resets when you leave the page.

## Searching Jobs

The search bar at the top of the board searches across job client names, addresses, and notes in real time. Type at least 2 characters and the board immediately shows only matching jobs. The search works on the currently visible columns — it does not search archived or cancelled jobs. For historical job search, go to **History**.

## The Unassigned Column

If you have enabled "Show Unassigned" in the board options (the gear icon next to the column headers), an additional **Unassigned** column appears on the far left. Drag a card from Unassigned to Open to prompt an assignment, or open the job drawer and select a technician from the dropdown.

## Board vs. List View

Click the list icon next to the filter bar to switch to a traditional list/table view. The list view is better for bulk operations, CSV exports, and seeing more job details at once. Both views show the same data.`
      },
      {
        slug: 'job-history',
        title: 'Job History & Restoring Jobs',
        description: 'Where archived and deleted jobs go, how soft-delete works, and how to restore a job.',
        category: 'jobs',
        readTime: 3,
        content: `## The History Page

WorkForge keeps a permanent record of every job you have ever created. The **History** page (in the sidebar under Jobs) shows all completed, cancelled, and archived jobs. Nothing is truly deleted unless you explicitly use the permanent delete option.

## Soft Delete

When you delete a job from the Kanban board or job drawer, WorkForge performs a **soft delete** — the job is hidden from all normal views but preserved in the database. Soft-deleted jobs are recoverable.

This protects you from accidental deletion and ensures your billing history remains intact even if a job is removed from the active board.

## Finding Archived Jobs

Go to **History** in the left sidebar. You can filter by:
- **Status** (Done, Cancelled, Deleted)
- **Date range** (jobs closed in the past week, month, or custom range)
- **Technician** (who completed the job)
- **Client** (see all jobs for a specific client)

The search bar in History searches the full text of job notes and client names, giving you full historical lookup capability.

## Restoring a Deleted Job

1. Navigate to **History**
2. Find the job using filters or search
3. Click the three-dot menu on the job row
4. Select **Restore Job**

The job is moved back to the Kanban board in its previous status. If the previous status was Done, it lands in the Done column. Any linked invoices or payments remain attached.

## Permanent Deletion

Permanent deletion removes the job record and all associated data (photos, notes, time entries) from the database. This cannot be undone. To permanently delete a job, first soft-delete it, then find it in History, open the three-dot menu, and select **Delete Permanently**. WorkForge requires you to confirm by typing the word DELETE before the action completes.

**Warning:** Permanently deleting a job with a linked paid invoice will remove the job reference from the invoice, but the invoice and payment records themselves are preserved (for accounting compliance).`
      },
      {
        slug: 'job-photos-and-notes',
        title: 'Photos, Notes & the Job Timeline',
        description: 'Adding photos from the job drawer, the difference between internal and customer-visible notes, and reading the job timeline.',
        category: 'jobs',
        readTime: 4,
        content: `## The Job Drawer

Click any job card on the Kanban board to open the job drawer — a sliding panel on the right side of the screen. The drawer is the central hub for all activity on a job: status, assignment, invoices, equipment, photos, and notes.

## Adding Photos

Photos are one of the most valuable parts of any field service record. They document pre-job conditions, completed work, damaged equipment, and anything the client disputes later.

To add a photo:
1. Open the job drawer
2. Click the **Photos** tab (camera icon)
3. Click **Add Photo** — on desktop this opens a file picker; on mobile it opens the camera directly
4. The photo uploads immediately and appears in the photo grid with a timestamp

Photos are stored permanently with the job record. Technicians can also add photos from their Field View using the same camera shortcut.

## Types of Notes

WorkForge has two types of notes on a job:

**Internal Notes** — Visible only to your team (admins, dispatchers, and the assigned technician). Use these for access codes, client quirks, pricing instructions, or anything you would not want the client to read. Internal notes have a lock icon to distinguish them.

**Work Notes** — A running log of what was actually done. These can optionally appear on the invoice PDF as a work description for the client. When creating an invoice, you can choose to include work notes in the "Work Performed" field.

## The Job Timeline

Every job has a timeline at the bottom of the drawer — a chronological log of everything that has happened:
- Status changes (with timestamp and who made the change)
- Note additions
- Photo uploads
- Invoice creation and payment collection
- Technician assignment and reassignment
- Equipment links

The timeline is read-only and cannot be edited. It provides an audit trail for disputes and helps managers understand exactly how a job progressed.

## Using Notes Effectively

**Good internal note examples:**
- "Gate code: 4821. Ring doorbell — client is hard of hearing."
- "Client wants technician to call 30 min before arrival."
- "Quoted $350 parts + labor. Client approved. Do not exceed without calling office."

**Good work note examples:**
- "Replaced capacitor on Carrier condenser unit. Refrigerant levels checked — within spec. Cleaned condenser coils."
- "Located blockage in main drain, 18 ft from cleanout. Cleared with snake. Recommended hydro-jetting within 6 months."`
      },
      {
        slug: 'bulk-operations',
        title: 'Bulk Operations & Filtering',
        description: 'How to filter, search, select multiple jobs, and export job data to CSV.',
        category: 'jobs',
        readTime: 3,
        content: `## Filtering the Job Board

The Jobs page has several filtering controls that work together:

**Technician pills** — Click one or more technician names above the board to show only their jobs. Useful during daily dispatch review.

**Priority filter** — The filter bar includes priority buttons (Low / Normal / High / Emergency). Click any combination to show only jobs of those priorities.

**Job type filter** — Filter by trade type (HVAC, Plumbing, Electrical, etc.) to focus on specific service lines.

**Date range** — Filter by scheduled date to see what is on the books for a specific day or week.

All filters stack — selecting "High priority" and "HVAC" shows only high-priority HVAC jobs.

## Switching to List View

Click the list icon (top-right of the board) to switch to the table view. In list view, you can see more jobs at once, sort by column header, and select multiple jobs.

## Selecting Multiple Jobs

In list view, each row has a checkbox on the left. Check individual rows to select them. Check the header checkbox to select all visible jobs. Once jobs are selected, a bulk action bar appears at the bottom of the screen with options:

- **Reassign** — Change the assigned technician for all selected jobs at once
- **Change Status** — Bulk move selected jobs to a new status
- **Export** — Download selected jobs as CSV

## Exporting Job Data

To export jobs:
1. Switch to list view
2. Apply any filters you want
3. Either select specific jobs, or export all filtered results
4. Click **Export CSV** in the bulk action bar or the top-right export button

The CSV includes: Job ID, Client, Address, Type, Priority, Status, Assigned Tech, Scheduled Date, Created Date, and any invoice total linked to the job. This is useful for reporting in Excel, syncing with external accounting tools, or creating custom reports.`
      }
    ]
  },
  {
    slug: 'invoicing',
    title: 'Invoicing & Payments',
    icon: '💰',
    description: 'Create invoices, collect payment on-site, export PDFs, and manage overdue accounts.',
    articles: [
      {
        slug: 'creating-invoices',
        title: 'Creating Invoices',
        description: 'How to link an invoice to a job, add line items for labor and parts, and manage draft vs. sent status.',
        category: 'invoicing',
        readTime: 5,
        popular: true,
        content: `## Creating an Invoice

Invoices in WorkForge are always linked to a job. The cleanest way to create one is from the job drawer: open the job, click **Create Invoice** (the orange button that appears when a job is Done or In Progress), and WorkForge pre-populates the invoice with the client details and job reference number.

You can also create a standalone invoice by going to **Invoices** → **+ New Invoice** and selecting the job to link.

## Invoice Line Items

Every invoice is made up of line items. WorkForge supports three types:

**Labor** — Time-based charges. Enter a description (e.g., "Diagnostic & Repair — 2 hrs"), a quantity (hours), and a rate (hourly rate). The total calculates automatically.

**Parts** — Material charges. Enter the part name or description, quantity, and unit price. For example: "Capacitor 45/5 MFD" × 1 at $38.00.

**Surcharge** — Flat fees added on top of labor and parts. Common examples: after-hours emergency fee ($150), fuel surcharge ($25), permit fee ($200). Surcharges appear as a separate line below the subtotal.

To add a line item, click **+ Add Line Item** and select the type. You can reorder line items by dragging the handle on the left of each row.

## Tax Settings

The tax rate on an invoice pulls from your company settings (Settings → Billing). You can override it per invoice by clicking the tax rate field. Tax is calculated on labor and parts but not on surcharges (configurable in settings).

## Draft vs. Sent

**Draft** — The invoice is saved but not yet sent to the client. Use draft status when you are still calculating parts costs or waiting for the technician's final notes. Draft invoices do not trigger overdue reminders.

**Sent** — The invoice has been sent to the client (either by email or handed to them in person as a PDF). WorkForge starts tracking the due date from when the invoice is marked Sent. The default payment terms are Net 30, configurable in Settings.

To send the invoice, click **Mark as Sent** — this does not automatically email the client, it just changes the status so the due date tracking begins. To email the invoice, use the **Email Invoice** button which sends the PDF via WorkForge's email system.

## Invoice Numbering

Invoices are numbered automatically in sequence (WF-0001, WF-0002, etc.). You can customize the prefix in Settings → Invoicing. The sequence cannot be reset, which ensures your invoice numbers are always unique for accounting purposes.`
      },
      {
        slug: 'collecting-payment',
        title: 'Collecting Payment',
        description: 'The payment overlay: card, cash with change calculator, check, digital methods, and capturing a signature.',
        category: 'invoicing',
        readTime: 5,
        popular: true,
        content: `## Opening the Payment Overlay

To collect payment, open the invoice (from Invoices in the sidebar or from the job drawer), then click **Collect Payment**. This opens a full-screen payment overlay designed to work smoothly on a tablet or phone that you hand to the client.

## Payment Methods

**Card** — Enter the card number, expiration date, and CVV manually, or use a connected Stripe card reader if you have one configured. Card payments are processed immediately and the invoice is automatically marked Paid.

**Cash** — Enter the amount tendered by the client. WorkForge automatically calculates the change due and displays it in large text so you can hand back the correct amount. For example: Invoice total $247.50, client hands you $300.00 → Change: $52.50. The invoice is marked Paid and a cash receipt can be printed or texted to the client.

**Check** — Enter the check number (for your records) and the amount. WorkForge marks the invoice Paid and records the check number in the payment history. For partial check payments, enter the check amount and the remaining balance stays as an open item.

**Digital / Other** — Venmo, Zelle, or other digital payments. Enter the reference or transaction ID and the amount. WorkForge records it as a manual payment entry.

## Signature Capture

After the client confirms the payment amount and method, the overlay shows a signature pad. The client can sign with their finger on a touch screen or with a mouse on desktop. Their signature is:
- Stored with the payment record
- Embedded in the invoice PDF
- Visible in the payment history

To skip the signature (for example, if you are processing the payment remotely), click **Skip Signature**.

## Partial Payments

WorkForge supports partial payments. If a client pays a deposit, enter the deposit amount, select the payment method, and collect the signature. The invoice shows "Partially Paid" with the remaining balance displayed prominently. Collect the balance at job completion or whenever agreed.

## After Payment

Once an invoice is fully paid:
- The invoice status changes to **Paid** (green badge)
- The linked job is automatically archived
- A payment receipt is generated (printable or emailable)
- The payment amount appears in the Payments ledger`
      },
      {
        slug: 'invoice-pdf-export',
        title: 'Invoice PDF Export & Printing',
        description: 'How to download or print invoice PDFs and what customization options are available.',
        category: 'invoicing',
        readTime: 3,
        content: `## Downloading an Invoice PDF

From any invoice, click the **Download PDF** button (the arrow-down icon in the top-right of the invoice view). WorkForge generates the PDF on demand and downloads it to your device. The PDF is fully formatted with your company branding, the client's details, all line items, and the signature if payment has been collected.

## What the PDF Includes

A standard WorkForge invoice PDF contains:
- Your company name, address, and phone number (from Settings → Company)
- Company logo (if uploaded in Settings)
- Invoice number and issue date
- Payment due date (based on your Net terms)
- Client name and address
- Job reference number and job type
- Itemized line items with quantities, rates, and totals
- Subtotal, tax, and grand total
- Payment status (Unpaid / Paid / Partially Paid)
- Collected payment details and signature (if payment was taken in-app)
- "Work Performed" notes if you chose to include job notes

## Printing

Click **Print** from the invoice view to open the browser print dialog with the invoice pre-formatted for letter-size paper. The layout hides browser navigation elements so the printed output looks like a professional document.

Alternatively, download the PDF first and print from your PDF viewer — this gives you better control over print settings like duplex and paper size.

## Emailing an Invoice to a Client

Click **Email Invoice** from the invoice view. WorkForge sends the PDF as an attachment to the client's email address on file. You can add a short message in the email body before sending. The email is sent from noreply@getworkforge.com with your company name in the sender display name.

## Customizing the Invoice Appearance

Go to **Settings → Invoicing** to customize:
- Company logo (PNG or JPG, max 2MB)
- Invoice number prefix (default: WF-)
- Payment terms (Net 15, Net 30, Net 45, Due on Receipt)
- Default tax rate
- Footer message (e.g., "Thank you for your business! — Smith HVAC")
- Whether to include work notes on the PDF by default`
      },
      {
        slug: 'overdue-invoices',
        title: 'Overdue Invoices & Follow-Up',
        description: 'What happens when invoices go overdue, how automated reminders work, and manual follow-up options.',
        category: 'invoicing',
        readTime: 4,
        content: `## When an Invoice Goes Overdue

An invoice becomes **Overdue** when:
1. Its status is **Sent** (not Draft)
2. The current date is past the due date (based on payment terms)
3. It has not been fully paid

Overdue invoices are highlighted with a red badge throughout the app — on the Invoices list, in the job drawer, and on the Dashboard in the "Outstanding" metric card.

## Automated Reminders

WorkForge includes a background worker (cron job) that runs daily at 8:00 AM in your account's timezone. This worker:

**Day 1 overdue** — Sends an automatic "Payment Reminder" email to the client. The email includes the invoice PDF, the amount due, and a polite message requesting payment.

**Day 7 overdue** — Sends a second "Second Notice" reminder with a slightly more direct tone.

**Day 30 overdue** — Sends a final "Final Notice" with a note that the account may be referred for collection.

Automated reminders are enabled by default. You can disable them per-invoice by opening the invoice and toggling **Auto-Reminders** off. You can disable them globally in **Settings → Invoicing → Automated Reminders**.

## Manual Follow-Up

To send a manual reminder at any time:
1. Open the invoice
2. Click **Send Reminder**
3. Optionally edit the message
4. Click **Send**

A log entry is added to the invoice timeline showing when reminders were sent and to which email address.

## Adding Late Fees

WorkForge does not automatically add late fees, but you can manually add one as a Surcharge line item on the invoice. Go to the invoice, click **Edit**, add a new Surcharge line item called "Late Fee," and enter the amount. Save the invoice — if it was already sent, consider emailing the updated version to the client.

## Marking as Uncollectable

For invoices you have decided not to pursue, open the invoice and select **Write Off** from the three-dot menu. This marks the invoice as written off (a different status than paid), removing it from the outstanding balance metrics while preserving the full record for accounting purposes.`
      },
      {
        slug: 'payment-history',
        title: 'Payment History & the Payments Ledger',
        description: 'Understanding the payments ledger, filtering by date and method, and exporting to CSV.',
        category: 'invoicing',
        readTime: 3,
        content: `## The Payments Ledger

The **Payments** page (sidebar → Payments) is a complete record of every payment collected through WorkForge. Unlike the Invoices list, which shows invoice status, the Payments ledger shows individual payment transactions — including partial payments, each payment installment, and any refunds.

## What Each Row Shows

Each payment record includes:
- **Date/Time** of collection
- **Amount** collected
- **Payment Method** (Card, Cash, Check, Digital)
- **Invoice Number** linked to the payment
- **Client Name**
- **Technician** who collected it (if paid in the field)
- **Reference** (check number, transaction ID, or card last 4)

## Filtering the Ledger

Use the filter controls at the top of the Payments page to narrow down records:

- **Date range** — View payments from a specific period (Today, This Week, This Month, or custom range)
- **Payment method** — Filter to see only cash payments, only card payments, etc.
- **Technician** — See what each technician has collected in the field (useful for daily cash reconciliation)
- **Client** — View all payments from a specific client

## Exporting to CSV

Click **Export CSV** to download the filtered payment records. The export includes all columns visible in the table, plus the full invoice amount and outstanding balance for each linked invoice.

The CSV is compatible with QuickBooks, Excel, and Google Sheets for import into your accounting system. WorkForge does not currently offer direct QuickBooks integration — the CSV export workflow is the recommended path.

## Reconciliation Tip

For businesses where technicians collect cash in the field, run the Payments ledger filtered by technician and date at the end of each day. This shows you exactly what each tech collected and in what form, making cash-up at the end of the day fast and accurate.`
      }
    ]
  },
  {
    slug: 'team',
    title: 'Team & Scheduling',
    icon: '👥',
    description: 'Manage team members, use the schedule calendar, understand what techs see, and secure your account.',
    articles: [
      {
        slug: 'managing-team-members',
        title: 'Managing Team Members',
        description: 'Adding and removing users, changing roles, and using the Team page effectively.',
        category: 'team',
        readTime: 4,
        popular: true,
        content: `## The Team Page

The **Team** page (sidebar → Team) shows every user in your WorkForge account. Active members appear in the main list with their name, email, role badge, and the date they joined. Pending invitations appear in a separate section below.

## Adding a New Team Member

Click **Invite Member** in the top-right corner. Enter their email address and select their role. WorkForge sends an invitation email immediately. The invited person appears in the **Pending** section until they accept.

If the invitation expires (after 7 days), find the person in the Pending list and click **Resend Invite**. A fresh invitation link is sent to the same email address.

## Changing a Member's Role

Changing a role takes effect immediately — the member's next action in the app reflects the new permissions.

1. Find the team member on the Team page
2. Click the three-dot menu (⋯) at the right of their row
3. Select **Edit Role**
4. Choose the new role from the dropdown
5. Click **Save**

Note: You cannot change your own role, and you cannot change the role of a user who is above you in the permission hierarchy.

## Removing a Team Member

1. Click the three-dot menu on the member's row
2. Select **Remove from Team**
3. Confirm the action

Removing a team member immediately revokes their access — their next attempted page load will redirect them to the login screen. Any jobs currently assigned to them remain assigned, so you will need to reassign those jobs manually or in bulk using the bulk reassign feature in the Jobs list view.

All of the removed member's historical activity (jobs worked, notes added, payments collected) is preserved in the audit log and on the job timelines.

## Active vs. Inactive Members

Removed team members are not deleted from the historical record. If you need to look up their past activity, go to **Settings → Audit Log** and filter by the member's name. Their entries remain visible even after they have been removed from the team.`
      },
      {
        slug: 'schedule-view',
        title: 'The Schedule View',
        description: 'Using the calendar view, scheduling jobs, and managing the unscheduled jobs list.',
        category: 'team',
        readTime: 4,
        content: `## Overview

The **Schedule** page (sidebar → Schedule) shows all your jobs on a calendar. It is the best place to manage the day-to-day dispatch flow — you can see exactly who is working where, spot gaps in the schedule, and schedule unscheduled jobs without leaving the calendar view.

## Calendar Views

WorkForge's schedule supports three views:

**Day view** — Shows a single day as a vertical timeline. Each technician has their own column, so you can see all your techs' schedules side by side. Jobs appear as time blocks with the client name and job type. This is the most useful view for daily dispatch.

**Week view** — Shows Monday through Sunday with all techs' jobs in a compact layout. Good for looking a few days ahead and spotting gaps.

**Month view** — A traditional calendar month overview. Useful for spotting busy periods and scheduling future jobs.

Switch between views using the Day / Week / Month buttons in the top-right of the Schedule page.

## Scheduling a Job from the Calendar

Any unscheduled job can be dragged from the **Unscheduled Jobs** panel on the left side of the calendar onto a time slot. Release the card on a specific time slot in a technician's column to:
- Set the job's scheduled date and time
- Assign it to that technician (if not already assigned)

You can also click any empty time slot to open the new job form pre-filled with that date and time.

## Moving Scheduled Jobs

To reschedule a job, drag its calendar block to a new time slot or a different technician's column. Changes save automatically. The technician's Field View updates immediately to reflect the new schedule.

## The Unscheduled Jobs Panel

The panel on the left side of the Schedule page lists all jobs that have been created but have no scheduled date. These are jobs waiting to be placed on the calendar. Drag them onto the calendar to schedule them, or click the job title to open the job drawer and schedule from there.`
      },
      {
        slug: 'technician-field-view',
        title: 'What Technicians See: The Field View',
        description: "A walkthrough of the technician experience — their job list, job details, status updates, and what they can't access.",
        category: 'team',
        readTime: 4,
        content: `## The Technician Experience

When a technician logs into WorkForge, they land in the **Field View** — a mobile-optimized interface that shows only their assigned jobs. They never see the Kanban board, other technicians' jobs, invoices, or any admin/dispatch features.

This separation is intentional. It keeps the technician interface clean and fast, and it ensures client information is shared on a need-to-know basis.

## The Job List

The technician's home screen shows a list of their assigned jobs, ordered by scheduled date and time. Each job card shows:
- Client name (large, easy to read)
- Service address (tappable to open in Maps)
- Job type and priority
- Scheduled time window
- Current job status

Jobs scheduled for today are highlighted at the top of the list. Jobs for future dates are grouped below. Completed jobs are hidden from the list after 24 hours.

## Job Detail View

Tapping a job card opens the job detail view. Here the technician sees:
- Full client name and address with a **Get Directions** button
- Job notes added by the dispatcher (these cannot be edited by the technician)
- Equipment information if a piece of equipment is linked to the job
- A large **Status Update** button at the top

## Updating Job Status

The status button at the top of the job detail is the most-used feature for technicians. It shows the current status and the next logical step:
- Open → "Start Job" (moves to In Progress)
- In Progress → "Complete Job" or "Pause — Parts Needed"
- In Progress → "Complete Job" moves the job to Done

Status changes sync instantly to the dispatcher's Kanban board, so the office knows in real time when a tech has started or completed a job.

## Adding Notes and Photos

Technicians can add **work notes** directly from the job detail view by tapping the notes field. They can upload photos using the camera button. Both sync immediately to the job record.

Technicians cannot edit the internal dispatcher notes — those are read-only in the Field View.`
      },
      {
        slug: 'account-security',
        title: 'Account Security',
        description: '2FA setup, failed login lockouts, and how admins can unlock locked accounts.',
        category: 'team',
        readTime: 4,
        content: `## Why Security Matters

WorkForge holds sensitive information: client addresses, job details, invoice amounts, and payment data. A compromised account could expose this to bad actors. Two-factor authentication (2FA) is the single most effective protection against unauthorized access, and WorkForge makes it simple to set up.

## Setting Up Two-Factor Authentication

1. Go to **Settings → Security** (click your avatar in the bottom-left, then Settings)
2. Click **Enable Two-Factor Authentication**
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, or 1Password all work)
4. Enter the 6-digit code from the app to confirm setup
5. Save your **backup codes** — these are shown once and let you access your account if you lose your phone

Once 2FA is enabled, every login requires your password plus the current 6-digit code from your authenticator app.

## Failed Login Lockout

WorkForge locks an account after **10 consecutive failed login attempts**. The lockout:
- Prevents further login attempts for 15 minutes
- Sends a security alert email to the account owner's address
- Is logged in the audit trail with timestamps and IP addresses

This protects accounts from brute-force password attacks.

## Unlocking a Locked Account

If a team member's account is locked (usually because they forgot their password and tried multiple times):

**Admin unlock:**
1. Go to **Team**
2. Find the locked user (they appear with a red lock icon)
3. Click their three-dot menu → **Unlock Account**
4. Their account is unlocked immediately

Alternatively, the user can click **Forgot Password** on the login page to receive a password reset email, which automatically unlocks the account.

## Session Management

WorkForge sessions expire after 30 days of inactivity. Users are asked to log in again after this period. For higher security, you can contact support to configure a shorter session duration for your account.`
      },
      {
        slug: 'permissions-explained',
        title: 'Full Permissions Matrix',
        description: 'A complete breakdown of what each role can create, edit, delete, and view across all areas of WorkForge.',
        category: 'team',
        readTime: 5,
        content: `## The Permission Matrix

This article provides the definitive reference for what each WorkForge role can do. Use this when deciding which role to assign to a new team member.

## Jobs

| Action | Admin | Dispatcher | Technician | Read-Only |
|---|---|---|---|---|
| View all jobs | Yes | Yes | Own only | Yes |
| Create jobs | Yes | Yes | No | No |
| Edit any job | Yes | Yes | Own only | No |
| Delete jobs | Yes | No | No | No |
| Change job status | Yes | Yes | Own only | No |
| Assign technicians | Yes | Yes | No | No |

## Invoicing & Payments

| Action | Admin | Dispatcher | Technician | Read-Only |
|---|---|---|---|---|
| View invoices | Yes | Yes | No | Yes |
| Create invoices | Yes | No | No | No |
| Edit invoices | Yes | No | No | No |
| Collect payment | Yes | Yes | No | No |
| Export payments CSV | Yes | Yes | No | No |
| Issue refunds | Yes | No | No | No |

## Team Management

| Action | Admin | Dispatcher | Technician | Read-Only |
|---|---|---|---|---|
| Invite team members | Yes | No | No | No |
| Change roles | Yes | No | No | No |
| Remove team members | Yes | No | No | No |
| View team list | Yes | Yes | No | No |

## Equipment & Contracts

| Action | Admin | Dispatcher | Technician | Read-Only |
|---|---|---|---|---|
| View equipment | Yes | Yes | Yes (linked jobs) | Yes |
| Add/edit equipment | Yes | Yes | No | No |
| Create contracts | Yes | No | No | No |
| Manage PM schedules | Yes | Yes | No | No |

## Settings

| Action | Admin | Dispatcher | Technician | Read-Only |
|---|---|---|---|---|
| Company settings | Yes | No | No | No |
| Billing/subscription | Yes | No | No | No |
| Invoicing settings | Yes | No | No | No |
| View audit log | Yes | No | No | No |
| AI Marketing Suite | Yes | Yes | No | No |

## Notes on Dispatcher Permissions

Dispatchers have broad operational access — they can do nearly everything needed to run daily field operations. The key restrictions are: they cannot manage billing or subscriptions, cannot invite or remove team members, and cannot permanently delete jobs. This makes the Dispatcher role safe to give to trusted operational staff without granting full administrative access.`
      }
    ]
  },
  {
    slug: 'equipment',
    title: 'Equipment & Contracts',
    icon: '⚙️',
    description: 'Track client equipment, set preventive maintenance schedules, and manage service contracts.',
    articles: [
      {
        slug: 'equipment-registry',
        title: 'The Equipment Registry',
        description: 'How to add equipment records, link them to clients, and use the equipment card.',
        category: 'equipment',
        readTime: 4,
        popular: true,
        content: `## What is the Equipment Registry?

The Equipment Registry is WorkForge's database of every piece of equipment your clients own that you service. For HVAC businesses, this means every air conditioner, furnace, heat pump, and air handler. For plumbers, it might be water heaters, boilers, and water softeners.

Tracking equipment gives you:
- A complete service history for every unit
- Preventive maintenance scheduling
- Warranty tracking
- Faster job creation (equipment auto-populates on the job form)

## Adding an Equipment Record

1. Navigate to **Equipment** in the sidebar
2. Click **+ Add Equipment**
3. Fill in the equipment details:

**Client** — Which client owns this equipment. Start typing to search your client list.

**Equipment Type** — Select the category: HVAC Unit, Furnace, Heat Pump, Water Heater, Boiler, Electrical Panel, etc. This determines which fields are shown (for example, HVAC units show a tonnage field; water heaters show a tank size field).

**Brand & Model** — The manufacturer and model number. For example, "Carrier" and "24ACC636A003." This is critical for ordering parts quickly.

**Serial Number** — The unit's unique identifier, typically found on the rating plate. Essential for warranty claims and parts ordering.

**Install Date** — When the equipment was installed. WorkForge uses this to calculate equipment age and flag units approaching end-of-life.

**Location Description** — Where on the property the equipment is located. "Attic — northwest corner" or "Utility closet, 2nd floor hallway" saves the technician time finding the unit.

**Warranty Expiration** — Track parts and labor warranty expiration dates. WorkForge alerts you before warranties expire.

## The Equipment Card

Each piece of equipment has an equipment card — a dedicated view showing all its details plus the full service history. Every job linked to this equipment appears in the history list in chronological order, showing what work was done, who did it, and when.

This becomes invaluable over time. When a client calls with a recurring problem, you can immediately see the entire repair history and identify patterns.

## Linking Equipment to Jobs

When creating or editing a job, you can link it to one or more pieces of equipment from that client's equipment list. This ensures the service call appears in the equipment's history. The link also shows the technician the equipment details (model, serial, location) directly in the Field View.`
      },
      {
        slug: 'preventive-maintenance',
        title: 'Preventive Maintenance Scheduling',
        description: 'How to set PM intervals, how the alert system works, and the cron worker that fires alerts.',
        category: 'equipment',
        readTime: 5,
        content: `## What is Preventive Maintenance (PM)?

Preventive maintenance visits are scheduled service calls performed at regular intervals, regardless of whether the equipment is showing problems. For HVAC, this typically means annual tune-ups in spring (cooling season prep) and fall (heating season prep). For commercial clients, it might be quarterly inspections.

WorkForge automates the scheduling and reminders so you never forget a PM visit and never lose the recurring revenue that comes with them.

## Setting a PM Interval

On any equipment record, click the **PM Settings** tab. You will see:

**PM Interval** — Choose from monthly, quarterly, semi-annual, or annual. Or enter a custom number of days (e.g., every 90 days).

**Last Service Date** — When this equipment was last serviced. WorkForge calculates the next due date from this date plus the interval.

**PM Notes** — Checklist items to complete during the PM visit. For example: "Check refrigerant levels, clean evaporator coil, replace air filter, inspect capacitors, test thermostat calibration."

Click **Save PM Settings** to activate scheduling for this equipment.

## The Alert System

WorkForge's PM alert system is powered by a background cron worker that runs every morning at 6:00 AM. This worker checks every active equipment record with a PM schedule and creates alerts for equipment due within 7 days.

When an alert is created:
- It appears in the **Equipment Alerts** section of the Equipment page (bell icon with count badge)
- The admin and dispatcher receive an in-app notification
- If email notifications are enabled, an email digest of due PMs is sent to the admin

## Converting Alerts to Jobs

From the Equipment Alerts panel, click **Create Job** next to any alert. This opens the new job form pre-filled with:
- The client's information
- The equipment details
- A note indicating it is a PM visit
- The PM checklist from the equipment's PM settings

You just need to assign a technician and set a date. This converts the alert into a scheduled job in seconds.

## Tracking PM Completion

When a PM job is marked **Done** and linked to the equipment record, WorkForge automatically:
- Updates the **Last Service Date** on the equipment record to today
- Calculates the next PM due date based on the interval
- Clears the active PM alert for that equipment
- Records the PM visit in the equipment service history`
      },
      {
        slug: 'service-contracts',
        title: 'Service Contracts & MRR',
        description: 'How to create service contracts, track monthly recurring revenue, and set visit frequency.',
        category: 'equipment',
        readTime: 4,
        content: `## Service Contracts

A service contract is an agreement with a client where they pay a recurring fee (monthly or annually) in exchange for a defined level of service — typically a set number of PM visits per year and priority scheduling for emergency calls.

WorkForge tracks service contracts so you always know which clients are under contract, what their contract covers, and how much recurring revenue you are generating.

## Creating a Contract

1. Go to **Contracts** in the sidebar
2. Click **+ New Contract**
3. Fill in the contract details:

**Client** — The client this contract covers.

**Contract Name** — A descriptive name, e.g., "Annual HVAC Maintenance Plan" or "Commercial HVAC Gold Plan."

**Coverage** — What equipment is covered under this contract. You can link specific equipment records or select "All client equipment."

**Visit Frequency** — How many service visits are included per year (e.g., 2 visits per year, quarterly visits).

**Monthly Value (MRR)** — The monthly amount the client pays. WorkForge uses this to calculate your total monthly recurring revenue across all active contracts.

**Start Date / End Date** — The contract term. WorkForge alerts you 30 days before contract expiration so you can renew proactively.

**Notes** — Any special terms, priority response commitments, or equipment-specific conditions.

## MRR Dashboard

The Contracts page shows a summary card at the top with your total **Monthly Recurring Revenue** from active contracts. This is the sum of the Monthly Value fields across all contracts with an active status. Use this number to understand your predictable base revenue and how it trends month over month.

## Contract Renewals

WorkForge sends a renewal alert 30 days before any contract expires. To renew:
1. Open the contract
2. Click **Renew Contract**
3. Confirm or update the terms and pricing
4. Set the new end date

WorkForge creates a new contract record with the updated terms while preserving the original for historical records.`
      },
      {
        slug: 'equipment-alerts',
        title: 'Equipment Alerts & PM Due Dates',
        description: 'Understanding the 7-day alert window, what triggers alerts, and how to resolve them.',
        category: 'equipment',
        readTime: 3,
        content: `## How Equipment Alerts Work

Equipment alerts are notifications that a piece of equipment is due for preventive maintenance. WorkForge generates these automatically based on the PM schedule you set on each equipment record.

The alert logic is simple:
- Every morning at 6:00 AM, the WorkForge cron worker calculates how many days until each PM is due
- If the due date is within 7 days (or already past), an alert is created
- Duplicate alerts are not created if one already exists for that equipment

## The Alert Dashboard

Navigate to **Equipment** and look for the orange bell icon with a count badge. Click it to open the **Alerts** panel. This panel shows all active PM alerts sorted by urgency — overdue alerts appear first in red, followed by alerts due in 1-7 days in amber.

Each alert row shows:
- Equipment name, brand, and model
- Client name and address
- Days until due (or days overdue)
- Last service date
- A **Create Job** button to immediately schedule the PM visit

## Alert Priority

Alerts are not just informational — they represent revenue opportunities. A PM visit you fail to schedule is a job you are not billing for. Keep the alert count at zero by reviewing alerts daily and converting them to jobs immediately.

WorkForge also shows an Equipment Alert count on the main Dashboard overview card, so you see it without having to navigate to the Equipment page.

## Resolving Alerts Without a Job

In rare cases, you may want to dismiss an alert without creating a job — for example, if the client cancelled their PM contract or the equipment has been replaced. Open the alert, click **Dismiss**, and select a reason from the dropdown. Dismissed alerts are logged but removed from the active alert count.

## Customizing the Alert Window

The default 7-day alert window works well for most businesses. If you want more lead time — for example, if booking technicians a week out is common — contact WorkForge support to adjust the window to 14 or 30 days for your account.`
      }
    ]
  },
  {
    slug: 'settings',
    title: 'Settings & Security',
    icon: '⚙',
    description: 'Configure 2FA, manage your subscription, use your referral link, and leverage the AI marketing tools.',
    articles: [
      {
        slug: 'two-factor-authentication',
        title: 'Two-Factor Authentication (2FA)',
        description: 'Setting up 2FA with an authenticator app, saving backup codes, and disabling 2FA.',
        category: 'settings',
        readTime: 4,
        content: `## What is 2FA and Why Does it Matter?

Two-factor authentication (2FA) adds a second verification step to your login. Instead of just a password, you also enter a 6-digit code from an app on your phone. Even if someone gets your password, they cannot log in without physical access to your phone.

For a business managing client data and payment information, 2FA is essential. WorkForge supports TOTP-based 2FA, which works with any standard authenticator app.

## Compatible Apps

Any of these apps work with WorkForge 2FA:
- **Google Authenticator** (iOS / Android)
- **Authy** (iOS / Android / Desktop)
- **1Password** (if you use 1Password as your password manager)
- **Microsoft Authenticator** (iOS / Android)

## Setting Up 2FA

1. Click your **avatar or initials** in the bottom-left corner of the sidebar
2. Select **Settings**
3. Click the **Security** tab
4. Click **Enable Two-Factor Authentication**
5. A QR code appears — open your authenticator app, tap the "+" or "Add Account" button, and scan the QR code
6. Your authenticator app will immediately show a 6-digit rotating code
7. Enter the current code into WorkForge to confirm the setup works
8. Click **Enable 2FA**

## Backup Codes

After enabling 2FA, WorkForge shows you 8 backup codes. These are single-use codes that let you log in if you ever lose access to your phone. **Save these immediately** — copy them to a secure location (a password manager, a printed paper stored safely, or a secure note).

If you lose your phone and do not have backup codes, account recovery requires contacting WorkForge support with identity verification.

## Disabling 2FA

1. Go to **Settings → Security**
2. Click **Disable Two-Factor Authentication**
3. Enter your current password to confirm
4. Enter a 6-digit code from your authenticator app
5. Click **Disable**

2FA is disabled immediately. You can re-enable it at any time.

## 2FA for Your Team

Currently, 2FA is configured per-user, not enforced at the account level. Each team member sets up their own 2FA independently. If you want to require 2FA for all team members, contact WorkForge support — account-level 2FA enforcement is available on the Enterprise plan.`
      },
      {
        slug: 'billing-and-subscription',
        title: 'Billing & Subscription',
        description: 'Understanding the Starter, Pro, and Enterprise plans, how to upgrade, and the cancellation flow.',
        category: 'settings',
        readTime: 4,
        content: `## WorkForge Plans

WorkForge offers three subscription tiers:

**Starter** — Designed for solo operators and very small crews. Includes up to 3 team members, core job management, invoicing, and basic reporting. Billed monthly.

**Pro** — Built for growing service businesses. Unlimited team members, full scheduling calendar, equipment registry, service contracts, PM scheduling, the AI Marketing Suite, advanced reporting, and priority support. Billed monthly or annually (annual saves 20%).

**Enterprise** — For multi-location businesses and large fleets. Everything in Pro plus dedicated onboarding, custom integrations, SSO, and a dedicated account manager. Custom pricing — contact sales.

## Viewing Your Current Plan

Go to **Settings → Billing** (Admin only). This page shows:
- Your current plan and billing cycle
- Next billing date and amount
- Payment method on file
- Invoice history (downloadable PDFs of your WorkForge subscription invoices)

## Upgrading Your Plan

1. Go to **Settings → Billing**
2. Click **Upgrade Plan**
3. Select the plan you want to switch to
4. Choose monthly or annual billing
5. Confirm your payment method (you can update it here)
6. Click **Confirm Upgrade**

The upgrade takes effect immediately. If you upgrade mid-billing-cycle, WorkForge prorates the difference — you are only charged for the remaining days in the cycle at the new rate.

## Downgrading or Cancelling

To downgrade from Pro to Starter or to cancel:
1. Go to **Settings → Billing**
2. Click **Manage Plan**
3. Select **Downgrade** or **Cancel Subscription**
4. WorkForge walks you through what you will lose access to (e.g., equipment registry, PM scheduling) and asks for confirmation
5. If downgrading, the change takes effect at the end of your current billing period. If cancelling, access continues through the end of the current period.

Your data is not deleted when you cancel — it is preserved for 90 days in case you return. After 90 days, data is permanently deleted per our data retention policy.`
      },
      {
        slug: 'referral-program',
        title: 'Referral Program',
        description: 'How to find your referral link, understand reward tiers, and share with other service businesses.',
        category: 'settings',
        readTime: 3,
        content: `## How the Referral Program Works

WorkForge rewards you for referring other service businesses. When someone signs up using your referral link and becomes a paying customer, you earn account credits applied to your next billing cycle.

Referrals are tracked at the account level — your referral link is unique to your WorkForge account, not to individual users.

## Finding Your Referral Link

1. Go to **Settings → Referrals**
2. Your unique referral link is displayed at the top of the page
3. Click **Copy Link** to copy it to your clipboard

The link looks like: https://getworkforge.com/r/[your-code]

## Reward Tiers

**1-3 referrals** — $25 account credit per successful referral (per referred customer's first payment received).

**4-10 referrals** — $50 account credit per referral.

**11+ referrals** — $75 account credit per referral + recognition as a WorkForge Community Champion with a badge on your profile.

Credits are applied automatically to your next billing date. If your credits exceed your monthly bill, the remainder rolls forward to the following month.

## Tracking Your Referrals

The Referrals page shows a table of everyone who has signed up using your link, their signup date, and their current status (Trial, Active, or Inactive). You can see your total pending credits and a history of credited amounts.

## Tips for Sharing

The best referral opportunities are other trade business owners you know:
- Fellow contractors at supplier or trade association events
- Subcontractors you work with who run their own businesses
- Business owners in complementary trades (e.g., an HVAC contractor referring a plumber)
- Online communities like contractor Facebook groups or subreddits

The referral program has no expiration — your link works indefinitely, and you continue earning credits as long as referred customers remain active.`
      },
      {
        slug: 'ai-marketing-suite',
        title: 'The AI Marketing Suite',
        description: 'The 6 AI marketing tools, how to get the best results, and example prompts to try.',
        category: 'settings',
        readTime: 5,
        popular: true,
        content: `## What is the AI Marketing Suite?

The AI Marketing Suite is a set of six AI-powered tools that help field service businesses create professional marketing content without needing a marketing team. Available to Pro and Enterprise subscribers, it lives at **Settings → AI Marketing** or from the **Marketing** section in the sidebar.

## The Six Tools

**1. Service Reminder Campaign**
Generates personalized service reminder emails or text messages for clients who have not had service in 6, 12, or 18 months. Input your business name, the service type, and the time since last service. The AI generates a friendly, professional reminder you can send as-is or edit.

*Example: "Write a 12-month HVAC service reminder for Smith Air Conditioning, targeting residential clients in Phoenix."*

**2. Seasonal Promotion**
Creates a promotional message for seasonal demand periods — spring AC tune-up specials, winter furnace inspections, summer cooling deals. Specify the season, promotion details (e.g., "$50 off a summer tune-up"), and your service area.

**3. Review Request**
Generates a polite review request to send after completing a job. Asking for reviews is awkward in person — the AI writes a professional, non-pushy message that links to your Google Business Profile. Clients who have a good experience but are not asked rarely leave reviews on their own.

**4. New Service Announcement**
Launching a new service line? Use this tool to generate an announcement for your existing clients. Describe the new service, its benefits, and any introductory pricing.

**5. Emergency Alert Broadcast**
For weather events or other emergencies (like a heat wave driving HVAC demand through the roof), this tool generates an urgent message to your client list about availability and priority booking.

**6. Re-Engagement Campaign**
Targets clients who have not had service in 2+ years. The AI crafts a "we miss you" style message that reminds them of your services and offers an incentive to book again.

## Getting the Best Results

The more context you give the AI, the better the output:
- Include your business name and trade type
- Mention your service area or city
- Specify the tone (friendly and casual vs. professional and formal)
- Include any specific offers, prices, or deadlines
- If there are things you do NOT want mentioned (e.g., a competitor's name), say so

## Example Prompts to Try

- "Write a fall furnace tune-up reminder for Mountain HVAC serving Denver homeowners. We're offering $89 tune-ups through October 31st. Friendly, professional tone."

- "Create a 5-star review request to send by text message after completing an AC repair. Keep it under 160 characters."

- "Generate a new client welcome email for a plumbing company called Clear Flow Plumbing serving Austin. Highlight 24/7 emergency service and same-day availability."`
      }
    ]
  }
]

export const ALL_ARTICLES: HelpArticle[] = HELP_CATEGORIES.flatMap(c =>
  c.articles.map(a => ({ ...a, category: c.slug }))
)

export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find(c => c.slug === slug)
}

export function getArticleBySlug(category: string, slug: string): HelpArticle | undefined {
  const cat = getCategoryBySlug(category)
  if (!cat) return undefined
  return cat.articles.find(a => a.slug === slug)
}

export function searchArticles(query: string): HelpArticle[] {
  if (!query || query.trim().length < 2) return []
  const q = query.toLowerCase().trim()
  return ALL_ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.content.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q)
  ).slice(0, 10)
}
