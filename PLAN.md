# Personal Work Cockpit

## 1. Objective

Build a personal tool that works as a **daily work control center**.

The goal is not to replace Jira, Zoho Desk, Outlook, Gmail, or other existing platforms, but to **centralize the information already available in those systems** and help answer the following questions every day:

> **What do I have pending, what is urgent, what am I waiting for, and what should I do first?**

The project is exclusively for personal/internal use.

---

# 2. Technology Stack

## Frontend

* Next.js
* TypeScript
* Shadcn/ui
* Tailwind CSS

## Backend

* Hono
* Bun
* TypeScript

## Database and Backend Services

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Row Level Security
* Supabase Storage, if needed in future versions

## Integrations

* Jira API
* Zoho Desk API
* Gmail API
* Microsoft Graph API for Outlook and Calendar
* GitHub/GitLab APIs in later phases

## Artificial Intelligence

The application should use an abstraction layer for AI providers so models can be changed without modifying the rest of the system.

Initial model:

* Gemini 2.5 Flash-Lite

Potential future providers:

* DeepSeek
* Kimi
* Qwen
* Other compatible providers

---

# 3. Information Sources

## V1

### Jira

* Assigned issues.
* Pending tasks.
* Priorities.
* Due dates.
* Overdue issues.
* Status.
* Recent comments.
* Possible blockers.

### Zoho Desk

* Assigned tickets.
* Priority.
* Status.
* Age.
* SLA.
* Tickets without a response.
* Tickets approaching their deadline.

### Outlook

* Unread or important emails.
* Emails requiring a response.
* Possible commitments.
* Dates and deadlines mentioned in emails.

### Gmail

* Unread or important emails.
* Emails requiring a response.
* Possible commitments.
* Dates and deadlines mentioned in emails.

### Calendar

* Meetings for the day.
* Upcoming meetings.
* Busy time.
* Available time for focused work.

### Manually Created Tasks

Not all work comes from Jira, Zoho Desk, email, or other integrated systems.

Some tasks may come from:

* Meetings.
* Conversations.
* Phone calls.
* Personal notes.
* Verbal commitments.
* Ideas that need to be followed up on.
* Work that is not formally registered in another system.

The application must allow the user to create tasks manually.

Manually created tasks should support:

* Title.
* Description.
* Priority.
* Status.
* Due date.
* Estimated duration.
* Tags.
* Related person.
* Related project.
* Source.
* Notes.
* Optional relationship with an external item.
* Optional reminder.
* Optional waiting-for status.

Example:

> Prepare the summary from today’s client meeting.

Manual tasks should be treated as first-class items and should appear alongside Jira issues, Zoho tickets, commitments, and other actionable work.

---

# 4. Sources for Later Phases

### GitHub / GitLab

* Pending pull requests.
* Pull requests waiting for approval.
* Issues.
* Pending comments.
* Failed pipelines.
* Relationship between pull requests and Jira tasks.

### Microsoft Teams

Teams will initially be excluded.

The integration will probably require Microsoft Graph/Azure permissions and organizational authorization.

It will be added later as an independent connector without modifying the core application logic.

### OneDrive / SharePoint / Google Drive

Possible future integration for finding documents related to tasks and tickets.

The goal is not to synchronize every file, but to provide **relevant context**.

---

# 5. Main System Concepts

## Tasks

Work explicitly registered in Jira, Zoho Desk, or manually created inside the application.

Tasks may come from:

* Jira issues.
* Zoho Desk tickets.
* Manually created items.
* Commitments extracted from emails.
* Meetings.
* Conversations.
* Future integrations.

Examples:

> Jira CRM-182 — Fix the customer endpoint.

> Prepare the report discussed during today’s meeting.

> Follow up with the client about the missing documentation.

Every task should have a normalized internal representation regardless of its original source.

A task may include:

* Title.
* Description.
* Source.
* External identifier.
* Status.
* Priority.
* Due date.
* Estimated duration.
* Tags.
* Assignee.
* Related people.
* Related project.
* Dependencies.
* Notes.
* Created date.
* Updated date.
* Completion date.

---

## Commitments

Work the user promised to perform even if no formal task exists.

Examples:

> “I’ll review it this afternoon.”

> “I’ll send you the file tomorrow.”

> “I’ll check it before Friday.”

The system should detect these commitments in emails and, later, in other sources.

Commitments may be converted into tasks after user confirmation.

---

## Waiting For

Items that depend on another person or system.

Examples:

* Waiting for credentials from Juan.
* Waiting for pull request approval.
* Waiting for information from the client.
* Waiting for a response to a ticket.
* Waiting for a decision from a manager.

The system should detect when an item has been waiting for too long.

A Waiting For item should support:

* Person or system.
* Expected response.
* Related task.
* Date created.
* Last follow-up date.
* Suggested follow-up date.
* Current status.
* Notes.

---

## Inbox

A collection of potentially actionable items discovered automatically.

Examples:

* An email that appears to require action.
* A future Teams message.
* A new ticket.
* A new issue.
* A pending pull request.
* A detected commitment.
* A task extracted from a meeting.
* A manually captured note that has not yet been converted into a task.

Available actions:

* Convert to task.
* Mark as Waiting For.
* Ignore.
* Resolve.
* Snooze.
* Assign a reminder.
* Link to an existing task.

---

# 6. Daily Dashboard

The main screen should quickly answer the following questions:

## 🔥 Attention Today

Items requiring immediate attention.

Examples:

* Overdue task.
* Ticket with a critical SLA.
* Important email waiting for a response.
* Commitment due today.
* Manual task due today.
* Meeting-related task that has not yet been created or completed.

---

## 📋 Pending Work

Pending work grouped by source.

* Jira.
* Zoho Desk.
* Manually created tasks.
* Email.
* GitHub/GitLab.
* Commitments.

---

## ⏳ Waiting For

People or systems from which the user is waiting for something.

---

## 📅 Today

The day’s calendar.

Display:

* Meetings.
* Times.
* Busy periods.
* Available time.
* Suggested work blocks.

---

## ⚠️ Risks

Automatically detect situations such as:

* Overdue tasks.
* Tickets without a response for too long.
* Too many tasks with the same deadline.
* Blocked dependencies.
* Forgotten commitments.
* Manual tasks that have remained open for too long.
* Work that cannot realistically fit into the available time.
* Important tasks without a clear next action.

---

## 🤖 Recommendation

The system should generate a recommendation:

> **What should I do first?**

Example:

1. Resolve Ticket X because it has been waiting for 27 hours.
2. Finish Jira CRM-182 because it became overdue yesterday.
3. Reply to Juan’s email because it is blocking another task.
4. Work on CRM-201 during the next available focus block.
5. Prepare the summary from today’s meeting before the end of the day.

The recommendation should consider:

* Urgency.
* Importance.
* Due date.
* Age.
* Dependencies.
* Available time.
* Estimated duration.
* Calendar context.
* User context.
* Source.
* Whether the task is blocked.
* Whether the task has a clear next action.

---

# 7. Artificial Intelligence

## Fundamental Principle

**Do not use AI for everything.**

Process information with deterministic rules first.

Examples that do NOT require an LLM:

* Due date has passed.
* Due date is today.
* Ticket is assigned to the user.
* Meeting starts in 30 minutes.
* SLA has expired.
* Email is unread.
* Issue is open.
* Manual task is overdue.
* Task has been waiting for a defined amount of time.

AI should be used when ambiguity exists.

Examples:

* Does this email require action?
* What commitment is the user making?
* Should this email become a task?
* What task should be prioritized?
* Is this message related to an existing task?
* What information is important to highlight?
* What task was created during a meeting?
* What is the next action?
* Is this item blocked?
* Who is responsible for the next step?

---

# 8. Model Strategy

Initially use an economical model such as:

**Gemini 2.5 Flash-Lite**

Use cases:

* Classification.
* Information extraction.
* Summaries.
* Prioritization.
* Commitment detection.
* Task extraction.
* Relationship detection.
* Structured JSON output.

Other providers may be evaluated later:

* DeepSeek.
* Kimi.
* Qwen.
* OpenRouter.
* Other compatible providers.

The architecture must allow the AI model to be changed without modifying the rest of the application.

The AI layer should expose a provider-independent interface, for example:

* `classifyItem`
* `extractCommitment`
* `extractTask`
* `summarizeContent`
* `suggestPriority`
* `recommendNextAction`

---

# 9. Conceptual Architecture

```text
                  ┌───────────────┐
                  │     Jira      │
                  ├───────────────┤
                  │  Zoho Desk    │
                  ├───────────────┤
                  │    Gmail      │
                  ├───────────────┤
                  │   Outlook     │
                  ├───────────────┤
                  │   Calendar    │
                  ├───────────────┤
                  │ Manual Tasks  │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   Connectors  │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Normalization │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   Supabase    │
                  │  PostgreSQL   │
                  └───────┬───────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
         Deterministic Rules       LLM
                │                   │
                └─────────┬─────────┘
                          ▼
                  ┌───────────────┐
                  │ Prioritizer   │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │   Hono API    │
                  │   on Bun      │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ Next.js App   │
                  │ Shadcn/ui     │
                  └───────────────┘
```

---

# 10. Application Structure

## Frontend

The frontend will be built with:

* Next.js.
* TypeScript.
* Shadcn/ui.
* Tailwind CSS.

Responsibilities:

* Dashboard.
* Task list.
* Task creation and editing.
* Inbox.
* Waiting For view.
* Calendar view.
* Daily review.
* Settings.
* Integration status.
* Manual task capture.

## Backend

The backend will be built with:

* Hono.
* Bun.
* TypeScript.

Responsibilities:

* API routes.
* Authentication validation.
* Connector orchestration.
* Synchronization jobs.
* Normalization.
* Deterministic rules.
* AI orchestration.
* Prioritization.
* Task management.
* Integration management.
* Webhooks, when supported.
* Background processing.

## Database

Supabase will provide:

* PostgreSQL database.
* Authentication.
* Row Level Security.
* Database migrations.
* Optional storage.
* Realtime capabilities if needed later.

The database should store normalized internal entities while preserving the original source and external identifiers.

---

# 11. Action Plan

## Stage 0 — Definition

### Objective

Define exactly what information the system should obtain and how it should be represented.

### Activities

* Define the technology stack.
* Define the common data model.
* Define the task concept.
* Define manually created tasks.
* Define the commitment concept.
* Define statuses.
* Define priorities.
* Define urgency rules.
* Define task sources.
* Define relationships between tasks and external items.
* Define what information is stored and what information is processed temporarily.
* Define authentication and authorization requirements.
* Define the initial Supabase schema.

### Result

A common model independent of Jira, Zoho, Gmail, Outlook, or any other source.

---

# Stage 1 — Base Application and Backend

### Objective

Create the application core.

### Activities

* Create the Next.js application.
* Configure TypeScript.
* Configure Shadcn/ui.
* Configure Tailwind CSS.
* Create the Hono backend.
* Configure Bun.
* Create the Supabase project.
* Create the PostgreSQL schema.
* Create authentication.
* Create the connector structure.
* Create the normalized data model.
* Create the synchronization system.
* Record the last synchronization time.
* Create the initial dashboard shell.
* Create the manual task creation flow.

### Result

A working application capable of creating, storing, and querying normalized tasks.

---

# Stage 2 — Manual Tasks

### Objective

Support work that does not originate from an integrated system.

### Activities

* Create tasks manually.
* Edit task details.
* Set priority.
* Set status.
* Add due dates.
* Add estimated duration.
* Add tags.
* Add notes.
* Add related people.
* Add projects.
* Add reminders.
* Mark tasks as Waiting For.
* Convert notes into tasks.
* Display manual tasks alongside external tasks.
* Support quick task capture from the dashboard.

### Result

The user can capture any task immediately, even when it comes from a meeting, conversation, phone call, or personal note.

---

# Stage 3 — Jira Integration

### Objective

Obtain the first real external source of work.

### Activities

* OAuth/API authentication.
* Retrieve assigned issues.
* Retrieve statuses.
* Retrieve priorities.
* Retrieve due dates.
* Retrieve relevant comments.
* Detect overdue issues.
* Synchronize periodically.
* Preserve external identifiers.
* Link Jira issues to internal tasks.

### Result

The system can display:

> “These are your current tasks.”

---

# Stage 4 — Zoho Desk Integration

### Objective

Incorporate support work.

### Activities

* Retrieve assigned tickets.
* Retrieve priority.
* Retrieve status.
* Retrieve SLA.
* Retrieve the last interaction.
* Detect tickets without a response.
* Detect critical tickets.
* Synchronize periodically.
* Link Zoho tickets to internal tasks.

### Result

Jira and Zoho Desk appear as a single work inbox.

---

# Stage 5 — Gmail and Outlook Integration

### Objective

Incorporate work that currently lives in email.

### Activities

* Authentication.
* Retrieve relevant messages.
* Filter noise.
* Detect emails requiring a response.
* Detect possible commitments.
* Detect dates.
* Relate emails to existing tasks.
* Suggest new tasks.
* Add actionable emails to the Inbox.
* Allow the user to convert emails into tasks.

### Result

The system begins to discover work that **was not registered as a task**.

---

# Stage 6 — Calendar Integration

### Objective

Incorporate time context.

### Activities

* Retrieve events.
* Display the day’s agenda.
* Calculate busy time.
* Calculate available blocks.
* Detect upcoming meetings.
* Estimate realistic work capacity.
* Suggest tasks for available focus blocks.

### Result

The system stops asking only:

> “What do you have to do?”

and starts answering:

> “What can you realistically do today?”

---

# Stage 7 — Daily Dashboard

### Objective

Create the first genuinely usable version.

### Main Screen

```text
Good morning, Carlos.

🔥 Attention
────────────────────
3 critical items

📋 Pending
────────────────────
12 tasks
7 tickets
4 emails

⏳ Waiting For
────────────────────
3 people

📅 Today
────────────────────
09:30 Meeting
11:00 Meeting
14:00 — 16:00 Available
16:30 Meeting

🤖 Recommendation
────────────────────
1. Ticket X
2. Jira CRM-182
3. Juan’s email
4. Meeting summary
```

### Result

The first version that can genuinely be used every day.

---

# Stage 8 — AI

### Objective

Move from an aggregator to an assistant.

### Implement

* Email classification.
* Commitment detection.
* Implicit task detection.
* Meeting task extraction.
* Manual note classification.
* Prioritization.
* Summaries.
* Blocker detection.
* Relationship detection.
* Next-action recommendations.
* Suggested task creation.
* Suggested Waiting For items.

### Important

Whenever possible, the AI must produce **structured JSON** so important decisions can be validated through code.

AI-generated tasks and commitments should not automatically become active work without user confirmation unless the user explicitly enables that behavior.

---

# Stage 9 — Waiting For and Commitments

### Objective

Solve one of the biggest sources of forgotten work.

### Implement

* Personal commitments.
* Dependencies.
* People from whom the user is waiting for a response.
* Commitment dates.
* Last follow-up.
* Reminders.
* Suggested follow-ups.
* Relationship between Waiting For items and tasks.
* Escalation indicators for overdue dependencies.

Example:

```text
⏳ WAITING FOR

Juan
API credentials
Waiting since: Tuesday
Last follow-up: Wednesday

⚠️ Follow-up recommended
```

---

# Stage 10 — GitHub / GitLab

### Objective

Incorporate real development work.

### Implement

* Pull requests.
* Reviews.
* Issues.
* Comments.
* Pipelines.
* Relationship between pull requests and Jira issues.

This will make it possible to connect:

> Jira says “In Progress”

with:

> Pull request open for two days and waiting for review.

---

# Stage 11 — Automation

### Objective

Make the system not only report information, but also help execute work.

Examples:

* Create a Jira issue from a commitment.
* Create a reminder.
* Change a Jira status.
* Reply to an email with approval.
* Add a comment to a ticket.
* Record a follow-up.
* Snooze a task.
* Create a task from a meeting.
* Mark a task as completed in the internal system.

Actions that may have external consequences must require confirmation.

---

# Stage 12 — End-of-Day Review

Add a second important experience:

## “Close My Day”

The system analyzes:

* Completed work.
* Pending work.
* Overdue tasks.
* Commitments.
* Items waiting for a response.
* Work that should move to the next day.
* Manual tasks created during the day.
* Tasks that were not completed as planned.

Example:

```text
🌙 End-of-Day Review

✅ 6 tasks completed
🎫 4 tickets resolved
📧 12 emails handled

⏳ Pending
3 tasks

🔴 Critical
CRM-182

👤 Waiting For
Response from Juan

📌 For Tomorrow
2 tasks moved forward
1 meeting summary to prepare
```

---

# Stage 13 — Optional Integrations

After the system is working:

* Microsoft Teams.
* OneDrive.
* SharePoint.
* Google Drive.
* Additional calendars.
* Other work sources.

These must be implemented as **independent connectors**.

---

# 12. Project Principles

### 1. Do not replace existing systems

Jira remains Jira.

Zoho Desk remains Zoho Desk.

The Cockpit is an **intelligence and organization layer** on top of them.

### 2. One source of truth per system

Do not unnecessarily duplicate information that already exists in Jira, Zoho, or other systems.

The internal database should store normalized references and the information required for the Cockpit to operate.

### 3. AI only when it adds value

Rules first.

LLM second.

### 4. Interchangeable models

Do not depend on a single AI provider.

### 5. Privacy

Avoid sending unnecessary information to the model.

Send only the data required to solve a specific task.

### 6. Read first, write later

The first versions should be practically **read-only** for external systems.

Manual task creation is allowed from the beginning because it does not modify external systems.

Automatic actions should be added only after the system becomes reliable.

### 7. Manual tasks are first-class items

Not all work will come from integrations.

Tasks created from meetings, conversations, notes, or personal commitments must have the same visibility and prioritization capabilities as externally sourced tasks.

### 8. Start small

The first useful version does not need:

* Teams.
* GitHub.
* Complex agents.
* Automations.
* Advanced memory.
* Document synchronization.

It only needs:

**Next.js + Shadcn/ui + TypeScript + Hono + Bun + Supabase + Jira + Zoho Desk + Gmail + Outlook + Calendar + Manual Tasks → Daily Dashboard.**

---

# 13. Real MVP

The MVP should be considered complete when it can do the following:

> **At 8:00 AM, I open a single page, see all my work, know what is urgent, know what I am waiting for, see my meetings, add tasks manually when needed, and receive a recommendation for what to do first.**

If it achieves that, the project already provides real value.

Everything else is an expansion.
