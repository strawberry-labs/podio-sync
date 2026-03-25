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
podio-cli list <app-slug> [--limit N] [--offset N] [--sort-by field] [--sort-desc]
```

Returns paginated items. Default limit is 30, max is 500. The response includes a `filtered` count (total items in the app) and an `items` array.

Examples:
```bash
podio-cli list camp-sales --limit 10
podio-cli list opportunities --limit 50 --offset 100
podio-cli list schools --limit 20 --sort-by created_on --sort-desc
```

### Filter items

```bash
podio-cli filter <app-slug> '<filters-json>' [--limit N] [--offset N] [--sort-by field] [--sort-desc]
```

Filter items using Podio's filter syntax. Filters are keyed by field `external_id`. The filter JSON follows Podio's API filter format.

Examples:
```bash
# Filter by a category field
podio-cli filter camp-sales '{"category-4": [1]}' --limit 10

# Filter with no criteria (same as list, but via POST)
podio-cli filter opportunities '{}' --limit 5
```

### Get a single item

```bash
podio-cli get <app-slug> <item-id>
```

Returns full item details including all fields, comments count, creation info, and metadata.

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

### List/Filter response structure

```json
{
  "success": true,
  "data": {
    "filtered": 1333,
    "items": [
      {
        "item_id": 3269012936,
        "title": "School Name ~ Program Name (Status).",
        "created_on": "2026-03-12 09:19:32",
        "fields": [
          {
            "label": "Sale Title",
            "external_id": "title",
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
- **`external_id`**: The field's programmatic name (use this for filters)
- **`label`**: The human-readable field name

## Pagination Strategy

When you need to find specific items or process many records:

1. Start with `list` using `--limit 30` to see sample data and get the total count from `filtered`
2. Use `filter` to narrow down results if possible
3. Paginate with `--offset` in increments of your `--limit` value
4. The `filtered` count tells you total matching items so you know when to stop

## Important Notes

- This CLI has **read-only** access. You cannot create, update, or delete items.
- All output is valid JSON. Parse it programmatically.
- Item IDs are large numbers (10+ digits). Always use them as-is.
- When an error occurs, the response has `"error"` key and exit code 1.
- Podio rate limits apply. Avoid rapid-fire requests; batch your queries when possible.
- Field `external_id` values are kebab-case (e.g., `group-1-dates`, `primary-contact`).
