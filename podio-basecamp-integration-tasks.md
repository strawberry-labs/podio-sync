# Podio-Basecamp Integration Tasks

**Meeting Date:** 2026-01-07
**Attendees:** Chirag Asarpota, Mike Ecoventure
**Target Deadline:** End of January 2026

---

## Overview

Integrate Podio and Basecamp to automate event creation and synchronize data between both platforms. Podio remains the source of truth for the sales pipeline.

---

## Task List

### 1. Podio Webhook Setup

- [ ] Set up webhooks for `item.update` events on relevant Podio apps
- [ ] Set up webhooks for `item.create` events
- [ ] Set up webhooks for `item.delete` events (if needed)
- [ ] Configure webhook URLs pointing to Basecamp sync endpoint (e.g., `events.ecoventure.me/basecamp/podio-update`)
- [ ] Handle authentication per Podio mini-app (each app needs its own token)
- [ ] Investigate root-level authentication to cover all apps

---

### 2. Event Creation Flow (Podio → Basecamp)

- [ ] Add "Create on Basecamp" button on Podio (triggered after booking form is returned/confirmed)
- [ ] Button retrieves the unique Podio Item ID from sale/camp item
- [ ] Send event data to Basecamp to create new event
- [ ] Return Basecamp event URL back to Podio (store in existing field for email templates)
- [ ] Add validation: Require "additional school charge" field to be filled (even if 0) before event creation
- [ ] Add comment on Podio item if required fields are missing

#### Fields to Map (Podio → Basecamp Event Details)

| Basecamp Field | Source in Podio | Notes |
|----------------|-----------------|-------|
| Event Name | Sale/Camp Item | |
| Location | Camp Item | |
| Trip Type | Sale/Opportunity | Local, Adventurous Journey, International |
| Dates | Camp Item | Start/End dates |
| Registration End Date | Sale/Camp Item | Primary sync field - changes frequently |
| Balance Payment | Sale | If applicable |
| Teacher | Sale/Contact | May need to create Basecamp account |
| Who's Collecting Payment | Sale | |
| Expected Number of Students | Camp Item | Maps to Total Capacity |
| Template | Derived from Trip Type | See template logic below |
| Additional School Charge | Sale | New field - must be filled |

---

### 3. Template Selection Logic

- [ ] Map trip types to Basecamp templates:
  - Local Residential → Local Template
  - Adventurous Journey → Adventurous Journey Template
  - International (each destination) → Separate International Templates

---

### 4. Pricing/Tickets Logic

- [ ] **Residential Trips:** Standard ticket price
- [ ] **Adventurous Journeys:**
  - Ticket price = 0
  - Practice option = 450 AED (add-on)
  - Qualifier option = 450 AED (add-on)
  - Selection determines final price via form
- [ ] **Additional School Charge:** Add to ticket/add-on pricing
- [ ] Verify add-ons are set correctly in templates

---

### 5. Ongoing Data Sync (Podio → Basecamp)

Fields that may change and need to sync:

- [ ] Registration End Date (high priority - changes frequently)
- [ ] Event Dates (less common)
- [ ] Teacher (possible change)
- [ ] Add "Sync to Basecamp" button for manual sync updates
- [ ] Implement webhook-triggered auto-sync when Podio item is updated

#### Sync Rules

- [ ] If field changes on Podio → Update Basecamp automatically
- [ ] Consolidate registration date: One source of truth on Podio, syncs to all locations (Sale, Camp Item, Basecamp)

---

### 6. Data Pull from Basecamp → Podio

- [ ] Add "Get Registration Data" button on Podio to pull from Basecamp
- [ ] Fields to pull after registration closes:
  - [ ] Total number of boys
  - [ ] Total number of girls
  - [ ] Number of male teachers
  - [ ] Number of female teachers
- [ ] Store retrieved data in corresponding Podio fields

---

### 7. Teacher Account Management

- [ ] When creating Basecamp event, check if teacher exists
- [ ] If teacher doesn't exist:
  - [ ] Create new Basecamp account
  - [ ] Trigger account credentials email automatically

---

### 8. Automated Communications

- [ ] Add toggle on event level: "Send weekly update to teacher"
- [ ] When enabled, automatically send attendee list to teacher weekly

---

### 9. Priority & Phasing

**Phase 1 (By End of January):**
- [ ] Local Residential trips integration
- [ ] International trips integration

**Phase 2 (Later):**
- [ ] International Awards programs
- [ ] LPO improvements

---

### 10. Technical Considerations

- [ ] Monitor API rate limits (request increase from Podio if needed)
- [ ] Handle double-sided sync carefully to avoid loops
- [ ] Test webhook reliability
- [ ] Document all field mappings and business logic

---

### 11. Documentation Tasks

- [ ] Complete Podio documentation for remaining apps (camp items, etc.)
- [ ] Add workflow/automation documentation
- [ ] Identify and document unused Podio components for cleanup
- [ ] Add booking manager training materials for new processes

---

## Process Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVENT CREATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Opportunity Created in Podio                                         │
│           ↓                                                              │
│  2. Sale Created (with pricing, teacher, dates)                          │
│           ↓                                                              │
│  3. Camp Item Created                                                    │
│           ↓                                                              │
│  4. Booking Form Returned/Confirmed                                      │
│           ↓                                                              │
│  5. Click "Create on Basecamp" button in Podio                           │
│           ↓                                                              │
│  6. System validates required fields (incl. additional school charge)    │
│           ↓                                                              │
│  7. Basecamp event created with mapped data                              │
│           ↓                                                              │
│  8. Basecamp URL returned and stored in Podio                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         ONGOING SYNC FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Podio → Basecamp (Auto via Webhook):                                    │
│  • Registration end date changes                                         │
│  • Event dates change                                                    │
│  • Teacher changes                                                       │
│                                                                          │
│  Basecamp → Podio (Manual via Button):                                   │
│  • Pull registration counts (boys, girls, teachers)                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Action Items for Mike

- [ ] Record video of booking manager flow for event creation
- [ ] Review Podio documentation and provide feedback
- [ ] Confirm field mappings are correct
- [ ] Provide details on all Basecamp templates (Local, AJ, International variants)

---

## Notes

- Podio remains the **source of truth** for the sales pipeline
- All controls should be on Podio to minimize platform switching
- Consider AI integration for automated email touchpoints (future enhancement)
- LPO issues to be addressed in a later phase
