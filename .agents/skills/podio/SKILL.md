---
name: podio
description: Use when the user asks to query, create, update, filter, or inspect items in Podio apps. Covers listing items, filtering by field values or dates, getting item details, creating new items, updating fields, and adding comments via the podio tool. Do NOT use for Podio webhook configuration, app setup, or server deployment.
---

You have access to `podio`, a command-line tool for interacting with Podio (a project management platform). It supports creating, reading, and updating items — but not deleting. The CLI is already configured and ready to use. All output is JSON.

## Discovering Apps

**Do NOT assume which apps are available.** Always run this first to discover configured apps:

```bash
podio apps
```

This returns all configured apps with their slugs, webhook endpoints, and monitored fields. Use the slug values from this response for all subsequent commands.

## Discovering Fields — Read This First

**Item responses only include fields that have a value on that specific item.** If a field is empty, it is silently omitted from `list`, `filter`, `get`, and `values` responses. That means you CANNOT rely on any one item to learn the full set of fields an app has — items with more fields filled in will appear to have "more" fields than items with fewer values, even though the app schema is identical.

Before you reason about an app's structure, filter on fields, or build an update/create payload, **get the app schema**:

```bash
podio schema <app-slug> --slim
```

This calls Podio's `GET /app/{app_id}` and returns every field defined on the app — regardless of whether any item has ever set a value for it — along with `external_id`, `field_id`, `label`, `type`, `required`, `status`, and (for category fields) the full list of option `id`/`text` pairs you'll need when writing.

Drop `--slim` only if you need the raw Podio response with full configs, descriptions, calculation scripts, etc.

Typical flow:
1. `podio apps` → find the slug
2. `podio schema <slug> --slim` → learn every field and its type
3. `podio list <slug> --slim --limit 1` → see what a real populated item looks like
4. Then `filter` / `get` / `update` / `create` as needed

## Commands

### Get app schema

```bash
podio schema <app-slug> [--slim]
```

Returns every field configured on the app (including empty ones). Use this to discover all available fields before filtering, creating, or updating items. See [Discovering Fields](#discovering-fields--read-this-first) above.

Example:
```bash
podio schema hiring-process --slim
```

### List items in an app

```bash
podio list <app-slug> [--slim] [--fields f1,f2] [--limit N] [--offset N] [--sort-by field] [--sort-desc]
```

Returns paginated items. Default limit is 30, max is 500. The response includes a `filtered` count (total items in the app) and an `items` array.

**IMPORTANT: Always use `--slim` when listing or filtering items.** Without it, Podio returns massive payloads per item (field configs, avatars, metadata) that can exceed output limits. The `--slim` flag strips all that bloat and returns only what you need: `item_id`, `title`, `created_on`, and clean field values.

Use `--fields` to further narrow to only the fields you care about (implies `--slim`).

Examples:
```bash
podio list camp-sales --slim --limit 10
podio list camp-sales --fields title,category-4,group-1-dates --limit 20
podio list opportunities --slim --limit 50 --offset 100
```

### Filter items

```bash
podio filter <app-slug> '<filters-json>' [--slim] [--fields f1,f2] [--limit N] [--offset N] [--sort-by field] [--sort-desc]
```

Filter items using Podio's filter syntax. Filters are keyed by field `external_id`.

Common filter patterns:
```bash
# Filter by date range
podio filter camp-sales '{"created_on":{"from":"2026-02-01","to":"2026-02-28"}}' --slim

# Filter by category field value
podio filter camp-sales '{"category-4": [1]}' --slim --limit 10

# Filter with specific fields returned
podio filter camp-sales '{"created_on":{"from":"2026-03-01","to":"2026-03-31"}}' --fields title,category-4,school,group-1-dates --limit 50
```

### Get a single item

```bash
podio get <app-slug> <item-id>
```

Returns full item details including all fields, comments count, creation info, and metadata. Use this when you need complete details for a specific item.

### Get field values only

```bash
podio values <app-slug> <item-id>
```

Returns only the field values for an item (lighter response than `get`).

### Following cross-app references

Podio items often link to items in other apps (e.g., a Hiring Process item's `applicant` field points to an item in the Internal Applications app). When you want to follow those links you usually only have the target `item_id` — not its app slug. Three commands handle this:

```bash
# Get any item by raw item_id (tries each configured app's token)
podio get-ref <item-id>

# List items that reference this item (incoming), grouped by app
podio refs <item-id>

# Compact combined view — outgoing app-field refs + incoming refs,
# each with item_id, title, app_name, and a link
podio related <item-id>
```

`related` is the best starting point: it returns a clean list you can then drill into with `get-ref`. Typical flow:

```bash
podio get hiring-process 3279960464          # find an item
podio related 3279960464                     # see its outgoing + incoming links
podio get-ref 3249825589                     # follow one of them (no slug needed)
```

Outgoing refs come from fields with `type: "app"` on the source item. Incoming refs come from Podio's `GET /item/{item_id}/reference/` endpoint.

### Get revision diff

```bash
podio diff <app-slug> <item-id> <from-revision> <to-revision>
```

Shows what changed between two revisions of an item.

### Create a new item

```bash
podio create <app-slug> '<fields-json>' [--silent] [--no-hook]
```

Creates a new item in the app. Requires full-access API key.

```bash
podio create staff-member '[{"external_id":"name","values":[{"value":"Jane Doe"}]}]'
```

### Update an item (multiple fields)

```bash
podio update <app-slug> <item-id> '<fields-json>' [--silent] [--no-hook]
```

Updates multiple fields on an item. Requires full-access API key.

```bash
podio update camp-sales 1234567 '[{"external_id":"status","values":[{"value":"Active"}]}]'
```

### Update a single field

```bash
podio update-field <app-slug> <item-id> <field-id> '<value-json>' [--silent] [--no-hook]
```

Updates one field on an item. Requires full-access API key.

### Add a comment

```bash
podio comment <app-slug> <item-id> <text> [--silent] [--no-hook]
```

Adds a comment to an item. Requires full-access API key.

### List available apps

```bash
podio apps
```

Returns all configured apps with their webhook endpoints and monitored fields.

## Understanding the Response Format

### Slim list/filter response structure

When using `--slim` (which you should always use for list/filter):

```json
{
  "success": true,
  "data": {
    "filtered": 1333,
    "items": [
      {
        "item_id": 3269012936,
        "app_item_id": 5389,
        "title": "School Name ~ Program Name (Status).",
        "created_on": "2026-03-12 09:19:32",
        "last_event_on": "2026-03-12 10:00:00",
        "link": "https://podio.com/...",
        "fields": [
          {
            "external_id": "title",
            "label": "Sale Title",
            "type": "calculation",
            "values": [{ "value": "..." }]
          }
        ]
      }
    ]
  }
}
```

### Item field types

Fields have a `type` that determines how `values` are structured:

| Type | Values format | Example |
|------|--------------|---------|
| `text` | `[{ "value": "string" }]` | Free text |
| `number` | `[{ "value": "123" }]` | Numeric value |
| `category` | `[{ "value": { "id": 1, "text": "Active" } }]` | Dropdown/status |
| `date` | `[{ "start": "2026-03-15 00:00:00", "end": null }]` | Date or date range |
| `money` | `[{ "value": "100.00", "currency": "AED" }]` | Monetary amount |
| `app` | `[{ "value": { "item_id": 123, "title": "..." } }]` | Reference to another app's item |
| `contact` | `[{ "value": { "name": "...", "mail": ["..."] } }]` | Contact/person |
| `calculation` | `[{ "value": "computed string" }]` | Computed/formula field |

### Key identifiers

- **`item_id`**: The globally unique numeric ID for an item (use this with `get`, `values`, `diff`)
- **`external_id`**: The field's programmatic name (use this for `--fields` and filters)
- **`label`**: The human-readable field name

## Recommended Workflow

1. **Run `podio apps`** first to discover available apps and their slugs
2. **Run `podio schema <slug> --slim`** to discover every field the app has — item responses omit empty fields, so this is the only reliable way to see the full schema
3. **Always use `--slim`** for list and filter commands to keep output manageable
4. **Use `--fields`** when you know which fields you need — this gives the smallest responses
5. Start with a small `--limit` (5-10) to understand the data shape, then increase
6. Use `filter` with date ranges or category values to narrow results before paginating
7. Use `get` or `values` only when you need full details for a specific `item_id`
8. The `filtered` count in the response tells you total matching items — use it to plan pagination

## Related / Referenced Items

Podio items can reference each other via `app`-type fields. The item response from `get` / `list` already contains this information — but in two different forms:

- **Outgoing references** — look at `fields[]` where `type === "app"`. Each value has `{ item_id, title, app: { name, app_id } }`. These are items this item points TO.
- **Incoming references** — the top-level `refs` array on the item response. These are items that point back TO this one. (The same data is available more cleanly via `podio refs <item-id>`.)

If you only need to know *what's related*, use `podio related <item-id>` — it returns both directions in a compact shape. To then fetch details of a related item, use `podio get-ref <item-id>` (works regardless of which app the target item lives in).

## Write Operation Flags

These flags apply to `create`, `update`, `update-field`, and `comment`:

| Flag | Effect |
|------|--------|
| `--silent` | Don't bump the item in Podio's activity stream |
| `--no-hook` | Don't trigger Podio webhooks for this change |

## Pagination

For apps with many items, paginate using `--limit` and `--offset`:

```bash
podio list my-app --slim --limit 500 --offset 0    # first 500
podio list my-app --slim --limit 500 --offset 500  # next 500
```

Check the `filtered` count in the response to know the total and plan pagination accordingly.

## Important Notes

- This CLI supports **create, read, and update** operations. Delete is not available. Write operations (`create`, `update`, `update-field`, `comment`) require a full-access API key.
- All output is valid JSON. Parse it programmatically.
- Item IDs are large numbers (10+ digits). Always use them as-is.
- When an error occurs, the response has `"error"` key and exit code 1.
- Podio rate limits apply. Avoid rapid-fire requests; batch your queries when possible.
- Field `external_id` values are kebab-case (e.g., `group-1-dates`, `primary-contact`).
- When writing fields, the JSON structure must match Podio's expected format for each field type. Use `get` on an existing item first to see the current field structure before attempting writes.
