# Podio CLI Skill

You have access to `podio-cli`, a command-line tool for reading data from Podio (a project management platform). The CLI is already configured and ready to use. All output is JSON.

## Available Apps

These are the Podio apps you can query:

| Slug | Description |
|------|-------------|
| `camp-sales` | Local camp/event sales records (schools, dates, groups, pricing, contacts) |
| `ia-sales` | Inter-academy sales (qualifier dates, deposits, school contacts) |
| `overseas-camp-sales` | International camp sales (multi-group dates, payment deadlines) |
| `schools` | School directory (contact info, school details) |
| `opportunities` | Sales pipeline (status, trip type, school relationships) |

## Commands

### List items in an app

```bash
podio-cli list <app-slug> [--slim] [--fields f1,f2] [--limit N] [--offset N] [--sort-by field] [--sort-desc]
```

Returns paginated items. Default limit is 30, max is 500. The response includes a `filtered` count (total items in the app) and an `items` array.

**IMPORTANT: Always use `--slim` when listing or filtering items.** Without it, Podio returns massive payloads per item (field configs, avatars, metadata) that can exceed output limits. The `--slim` flag strips all that bloat and returns only what you need: `item_id`, `title`, `created_on`, and clean field values.

Use `--fields` to further narrow to only the fields you care about (implies `--slim`).

Examples:
```bash
podio-cli list camp-sales --slim --limit 10
podio-cli list camp-sales --fields title,category-4,group-1-dates --limit 20
podio-cli list opportunities --slim --limit 50 --offset 100
```

### Filter items

```bash
podio-cli filter <app-slug> '<filters-json>' [--slim] [--fields f1,f2] [--limit N] [--offset N] [--sort-by field] [--sort-desc]
```

Filter items using Podio's filter syntax. Filters are keyed by field `external_id`.

Common filter patterns:
```bash
# Filter by date range
podio-cli filter camp-sales '{"created_on":{"from":"2026-02-01","to":"2026-02-28"}}' --slim

# Filter by category field value
podio-cli filter camp-sales '{"category-4": [1]}' --slim --limit 10

# Filter with specific fields returned
podio-cli filter camp-sales '{"created_on":{"from":"2026-03-01","to":"2026-03-31"}}' --fields title,category-4,school,group-1-dates --limit 50
```

### Get a single item

```bash
podio-cli get <app-slug> <item-id>
```

Returns full item details including all fields, comments count, creation info, and metadata. Use this when you need complete details for a specific item.

### Get field values only

```bash
podio-cli values <app-slug> <item-id>
```

Returns only the field values for an item (lighter response than `get`).

### Get revision diff

```bash
podio-cli diff <app-slug> <item-id> <from-revision> <to-revision>
```

Shows what changed between two revisions of an item.

### List available apps

```bash
podio-cli apps
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

1. **Always use `--slim`** for list and filter commands to keep output manageable
2. **Use `--fields`** when you know which fields you need — this gives the smallest responses
3. Start with a small `--limit` (5-10) to understand the data shape, then increase
4. Use `filter` with date ranges or category values to narrow results before paginating
5. Use `get` or `values` only when you need full details for a specific `item_id`
6. The `filtered` count in the response tells you total matching items — use it to plan pagination

## Important Notes

- This CLI has **read-only** access. You cannot create, update, or delete items.
- All output is valid JSON. Parse it programmatically.
- Item IDs are large numbers (10+ digits). Always use them as-is.
- When an error occurs, the response has `"error"` key and exit code 1.
- Podio rate limits apply. Avoid rapid-fire requests; batch your queries when possible.
- Field `external_id` values are kebab-case (e.g., `group-1-dates`, `primary-contact`).
