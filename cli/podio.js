#!/usr/bin/env node

/**
 * Podio CLI — a simple wrapper around the podio-sync REST API.
 * Designed for AI agents and quick scripting.
 *
 * Setup:    podio setup --url <base-url> --key <api-key>
 * Usage:    podio <command> [args...]
 * Config:   ~/.podio.json
 *
 * All output is JSON. Exit code 0 = success, 1 = error.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG_PATH = path.join(require('os').homedir(), '.podio.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function requireConfig() {
  const config = loadConfig();
  if (!config || !config.url || !config.key) {
    output({ error: 'Not configured. Run: podio setup --url <base-url> --key <api-key>' }, 1);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Output helper — always JSON
// ---------------------------------------------------------------------------

function output(data, exitCode = 0) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function apiCall(method, urlPath, body = null) {
  const config = requireConfig();
  const url = `${config.url.replace(/\/$/, '')}${urlPath}`;

  const opts = {
    method,
    headers: {
      'X-API-Key': config.key,
      'Content-Type': 'application/json',
    },
  };

  if (body !== null) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const json = await res.json();

  if (!res.ok) {
    output({ error: json.error || json.message || `HTTP ${res.status}`, status: res.status }, 1);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Interactive prompt helper
// ---------------------------------------------------------------------------

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const commands = {
  // -- Setup ----------------------------------------------------------------

  async setup(args) {
    let url = getFlagValue(args, '--url');
    let key = getFlagValue(args, '--key');

    // Interactive fallback
    if (!url) url = await prompt('API base URL (e.g. https://your-server.com): ');
    if (!key) key = await prompt('API key: ');

    if (!url || !key) {
      output({ error: 'Both --url and --key are required' }, 1);
    }

    // Normalize: strip trailing slash, don't include /api/podio
    url = url.replace(/\/+$/, '');

    // Test connection
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(10000) });
      const json = await res.json();
      if (json.status !== 'ok') throw new Error('Unexpected response');
    } catch (err) {
      output({ error: `Cannot reach ${url}/health — ${err.message}` }, 1);
    }

    saveConfig({ url, key });
    output({ success: true, message: 'Configuration saved', configPath: CONFIG_PATH });
  },

  // -- Show current config --------------------------------------------------

  async config() {
    const config = loadConfig();
    if (!config) {
      output({ error: 'Not configured. Run: podio setup --url <base-url> --key <api-key>' }, 1);
    }
    output({
      url: config.url,
      key: config.key.substring(0, 8) + '...',
      configPath: CONFIG_PATH,
    });
  },

  // -- List apps ------------------------------------------------------------

  async apps() {
    const config = requireConfig();
    const res = await fetch(`${config.url.replace(/\/$/, '')}/`);
    const json = await res.json();
    output(json);
  },

  // -- Get app schema -------------------------------------------------------

  async schema(args) {
    const appSlug = stripFlags(args)[0];
    if (!appSlug) {
      output({ error: 'Usage: podio schema <app-slug> [--slim]' }, 1);
    }

    const params = new URLSearchParams();
    if (args.includes('--slim')) params.set('slim', 'true');

    const qs = params.toString();
    const result = await apiCall('GET', `/api/podio/${appSlug}/schema${qs ? '?' + qs : ''}`);
    output(result);
  },

  // -- List items -----------------------------------------------------------

  async list(args) {
    const appSlug = stripFlags(args)[0];
    if (!appSlug) {
      output({ error: 'Usage: podio list <app-slug> [--slim] [--fields f1,f2] [--limit N] [--offset N] [--sort-by field] [--sort-desc]' }, 1);
    }

    const params = new URLSearchParams();
    const limit = getFlagValue(args, '--limit');
    const offset = getFlagValue(args, '--offset');
    const sortBy = getFlagValue(args, '--sort-by');
    const fields = getFlagValue(args, '--fields');
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    if (sortBy) params.set('sort_by', sortBy);
    if (args.includes('--sort-desc')) params.set('sort_desc', 'true');
    if (args.includes('--slim') || fields) params.set('slim', 'true');
    if (fields) params.set('fields', fields);

    const qs = params.toString();
    const result = await apiCall('GET', `/api/podio/${appSlug}/items${qs ? '?' + qs : ''}`);
    output(result);
  },

  // -- Filter items ---------------------------------------------------------

  async filter(args) {
    const positional = stripFlags(args);
    const appSlug = positional[0];
    const filtersJson = positional[1];
    if (!appSlug) {
      output({
        error: 'Usage: podio filter <app-slug> [\'<filters-json>\'] [--slim] [--fields f1,f2] [--limit N] [--offset N] [--sort-by field] [--sort-desc]',
        example: 'podio filter camp-sales \'{"status": 1}\' --slim --fields title,category-4 --limit 10',
      }, 1);
    }

    let filters = {};
    if (filtersJson) {
      try {
        filters = JSON.parse(filtersJson);
      } catch {
        output({ error: 'Invalid JSON for filters argument' }, 1);
      }
    }

    const body = { filters };
    const limit = getFlagValue(args, '--limit');
    const offset = getFlagValue(args, '--offset');
    const sortBy = getFlagValue(args, '--sort-by');
    const fields = getFlagValue(args, '--fields');
    if (limit) body.limit = parseInt(limit, 10);
    if (offset) body.offset = parseInt(offset, 10);
    if (sortBy) body.sort_by = sortBy;
    if (args.includes('--sort-desc')) body.sort_desc = true;
    if (args.includes('--slim') || fields) body.slim = true;
    if (fields) body.fields = fields;

    const result = await apiCall('POST', `/api/podio/${appSlug}/items/filter`, body);
    output(result);
  },

  // -- Create item ----------------------------------------------------------

  async create(args) {
    const [appSlug, fieldsJson] = args;
    if (!appSlug || !fieldsJson) {
      output({
        error: 'Usage: podio create <app-slug> \'<fields-json>\'',
        example: 'podio create staff-member \'[{"external_id":"name","values":[{"value":"Jane Doe"}]}]\'',
      }, 1);
    }

    let fields;
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      output({ error: 'Invalid JSON for fields argument' }, 1);
    }

    const silent = args.includes('--silent');
    const noHook = args.includes('--no-hook');

    const result = await apiCall('POST', `/api/podio/${appSlug}/items`, {
      fields,
      silent,
      hook: !noHook,
    });
    output(result);
  },

  // -- Get full item --------------------------------------------------------

  async get(args) {
    const [appSlug, itemId] = args;
    if (!appSlug || !itemId) {
      output({ error: 'Usage: podio get <app-slug> <item-id>' }, 1);
    }
    const result = await apiCall('GET', `/api/podio/${appSlug}/items/${itemId}`);
    output(result);
  },

  // -- Get field values only ------------------------------------------------

  async values(args) {
    const [appSlug, itemId] = args;
    if (!appSlug || !itemId) {
      output({ error: 'Usage: podio values <app-slug> <item-id>' }, 1);
    }
    const result = await apiCall('GET', `/api/podio/${appSlug}/items/${itemId}/values`);
    output(result);
  },

  // -- Get revision diff ----------------------------------------------------

  async diff(args) {
    const [appSlug, itemId, from, to] = args;
    if (!appSlug || !itemId || !from || !to) {
      output({ error: 'Usage: podio diff <app-slug> <item-id> <from-rev> <to-rev>' }, 1);
    }
    const result = await apiCall('GET', `/api/podio/${appSlug}/items/${itemId}/revisions/${from}/${to}`);
    output(result);
  },

  // -- Update item (multiple fields) ----------------------------------------

  async update(args) {
    const [appSlug, itemId, fieldsJson] = args;
    if (!appSlug || !itemId || !fieldsJson) {
      output({
        error: 'Usage: podio update <app-slug> <item-id> \'<fields-json>\'',
        example: 'podio update camp-sales 123 \'[{"external_id":"status","values":[{"value":"Active"}]}]\'',
      }, 1);
    }

    let fields;
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      output({ error: 'Invalid JSON for fields argument' }, 1);
    }

    const silent = args.includes('--silent');
    const noHook = args.includes('--no-hook');

    const result = await apiCall('PUT', `/api/podio/${appSlug}/items/${itemId}`, {
      fields,
      silent,
      hook: !noHook,
    });
    output(result);
  },

  // -- Update single field --------------------------------------------------

  async 'update-field'(args) {
    const [appSlug, itemId, fieldId, valueJson] = args;
    if (!appSlug || !itemId || !fieldId || !valueJson) {
      output({
        error: 'Usage: podio update-field <app-slug> <item-id> <field-id> \'<value-json>\'',
        example: 'podio update-field camp-sales 123 status \'[{"value":"Active"}]\'',
      }, 1);
    }

    let value;
    try {
      value = JSON.parse(valueJson);
    } catch {
      output({ error: 'Invalid JSON for value argument' }, 1);
    }

    const silent = args.includes('--silent');
    const noHook = args.includes('--no-hook');

    const result = await apiCall('PUT', `/api/podio/${appSlug}/items/${itemId}/fields/${fieldId}`, {
      value,
      silent,
      hook: !noHook,
    });
    output(result);
  },

  // -- Add comment ----------------------------------------------------------

  async comment(args) {
    const [appSlug, itemId, ...textParts] = args;
    const text = textParts.filter(p => !p.startsWith('--')).join(' ');
    if (!appSlug || !itemId || !text) {
      output({ error: 'Usage: podio comment <app-slug> <item-id> <comment text>' }, 1);
    }

    const silent = args.includes('--silent');
    const noHook = args.includes('--no-hook');

    const result = await apiCall('POST', `/api/podio/${appSlug}/items/${itemId}/comments`, {
      value: text,
      silent,
      hook: !noHook,
    });
    output(result);
  },

  // -- Help -----------------------------------------------------------------

  async help() {
    output({
      name: 'podio',
      description: 'CLI wrapper for the podio-sync REST API. All output is JSON.',
      commands: {
        'setup --url <base-url> --key <api-key>': 'Configure API connection (one-time)',
        'config': 'Show current configuration',
        'apps': 'List all configured Podio apps',
        'schema <app-slug>': 'Get the full app schema — every defined field, including empty ones',
        'list <app-slug>': 'List items in an app (with pagination)',
        'filter <app-slug> [filters-json]': 'Filter items in an app',
        'create <app-slug> <fields-json>': 'Create a new item (requires full-access key)',
        'get <app-slug> <item-id>': 'Get full item details',
        'values <app-slug> <item-id>': 'Get item field values only',
        'diff <app-slug> <item-id> <from> <to>': 'Get revision diff between two revisions',
        'update <app-slug> <item-id> <fields-json>': 'Update item fields (requires full-access key)',
        'update-field <app-slug> <item-id> <field-id> <value-json>': 'Update a single field (requires full-access key)',
        'comment <app-slug> <item-id> <text>': 'Add a comment to an item (requires full-access key)',
      },
      flags: {
        '--slim': 'Strip field configs and metadata for much lighter output — list/filter/schema',
        '--fields f1,f2': 'Only include specific fields by external_id (implies --slim) — list/filter',
        '--limit N': 'Number of items to return (default 30, max 500) — list/filter',
        '--offset N': 'Number of items to skip for pagination — list/filter',
        '--sort-by field': 'Field to sort by (e.g. created_on, title) — list/filter',
        '--sort-desc': 'Sort in descending order — list/filter',
        '--silent': 'Don\'t bump the item in Podio activity stream — update/update-field/comment',
        '--no-hook': 'Don\'t trigger Podio webhooks — update/update-field/comment',
      },
      examples: [
        'podio setup --url https://podio.example.com --key abc123',
        'podio apps',
        'podio schema hiring-process --slim',
        'podio list camp-sales --slim --limit 10',
        'podio list camp-sales --fields title,category-4,group-1-dates --limit 20',
        'podio filter camp-sales \'{"created_on":{"from":"2026-02-01","to":"2026-02-28"}}\' --slim',
        'podio create staff-member \'[{"external_id":"name","values":[{"value":"Jane Doe"}]}]\'',
        'podio get camp-sales 1234567',
        'podio values camp-sales 1234567',
        'podio diff camp-sales 1234567 3 4',
        'podio comment camp-sales 1234567 "Updated the status to Active"',
      ],
      configPath: CONFIG_PATH,
    });
  },
};

// ---------------------------------------------------------------------------
// Arg parsing helpers
// ---------------------------------------------------------------------------

function getFlagValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function stripFlags(args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      // Skip flag and its value if next arg doesn't start with --
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        i++; // skip value
      }
    } else {
      result.push(args[i]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0];
  const commandArgs = rawArgs.slice(1);

  if (!command || command === '--help' || command === '-h') {
    await commands.help();
    return;
  }

  if (!commands[command]) {
    output({ error: `Unknown command: ${command}. Run 'podio help' for usage.` }, 1);
  }

  await commands[command](commandArgs);
}

main().catch((err) => {
  output({ error: err.message }, 1);
});
