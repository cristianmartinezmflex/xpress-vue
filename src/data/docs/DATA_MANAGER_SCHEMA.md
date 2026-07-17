# Data Manager JSON Schema Reference

This document explains how to write the JSON schema that drives the Vue form UI for a data manager (DM). Each DM has one JSON file in `xpress-vue/src/data/` and is registered in the app's DM list.

---

## Top-Level Structure

```json
{
  "tabs": [ ...Tab ],
  "customSyncTables": [ "TableName1", "TableName2" ]
}
```

| Field | Type | Description |
|---|---|---|
| `tabs` | `Tab[]` | Required. One entry per tab rendered in the DM settings UI. |
| `customSyncTables` | `string[]` | Optional. List of table names shown in the "Edit Custom Sync" dialog, triggered by right-clicking the Custom Sync button. |

---

## Tab

```json
{
  "title": "General",
  "enable": "...",
  "display": "...",
  "sections": [ ...Section ]
}
```

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Tab label shown in the tab bar. |
| `sections` | `Section[]` | List of sections rendered inside the tab. |
| `enable` | `EnableProp` | Optional. Controls whether the entire tab is interactive. See [Conditional Logic](#conditional-logic). |
| `display` | `DisplayProp` | Optional. Controls whether the entire tab is visible. See [Conditional Logic](#conditional-logic). |

---

## Section

A visually grouped card with an optional title.

```json
{
  "title": "Connection",
  "enable": "...",
  "display": "...",
  "columns": [ ...Column ]
}
```

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Section heading. Use `""` for a section with no header (e.g., a footer row of buttons). |
| `columns` | `Column[]` | 1 or 2 columns. With 2 columns the section renders a 2-column grid. |
| `enable` | `EnableProp` | Optional. Grays out all controls in the section when false. |
| `display` | `DisplayProp` | Optional. Hides the entire section when false. |

---

## Column

```json
{
  "enable": "...",
  "display": "...",
  "controls": [ ...Control ]
}
```

| Field | Type | Description |
|---|---|---|
| `controls` | `Control[]` | Ordered list of controls rendered vertically in this column. |
| `enable` | `EnableProp` | Optional. Grays out all controls in this column. |
| `display` | `DisplayProp` | Optional. Hides this column. |

---

## Control

Every control shares these base fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique key within the form. Maps directly to the saved settings key. |
| `type` | `string` | Yes | Control type. See [Control Types](#control-types). |
| `title` | `string` | Usually | Label shown above or beside the control. |
| `default` | `any` | Recommended | Value used when the setting is missing from stored data. |
| `enable` | `EnableProp` | No | When false, the control is grayed out (non-interactive). |
| `display` | `DisplayProp` | No | When false, the control is hidden. |
| `disabled` | `boolean` | No | Permanently disables the control regardless of form state. |
| `validations` | `Validation[]` | No | Client-side validation rules. See [Validations](#validations). |

---

## Control Types

### `text`

A single-line text input.

```json
{ "id": "server_ip", "type": "text", "title": "Server", "default": "localhost" }
```

**Special behavior — inline read-only label:**  
When `value_from` is set, the control renders as a plain inline label (`Title: value`) instead of an input field. Useful to display a derived or mirrored value without allowing edits.

```json
{
  "id": "namespace",
  "type": "text",
  "title": "Full Namespace",
  "value_from": "remote_namespace"
}
```

Renders as: **Full Namespace:** root\onguard *(where `remote_namespace` holds the value)*

---

### `password`

Same as `text` but value is masked.

```json
{ "id": "password", "type": "password", "title": "Password", "default": "" }
```

---

### `boolean`

A labeled checkbox.

```json
{ "id": "use_ssl", "type": "boolean", "title": "Use SSL", "default": true }
```

**Special behavior — mirrored checkbox (`value_from` + `invert`):**  
Displays the value of another field (optionally inverted). The checkbox is **interactive** — clicking it writes back to the source field (via `inverts`). This is used for mutually exclusive checkbox pairs where only one field is persisted.

```json
{ "id": "use_ip_badge",           "type": "boolean", "title": "Use IPBadge for Activities",  "default": false },
{ "id": "use_sockets_for_activities", "type": "boolean", "title": "Use Sockets for Activities",
  "default": true, "value_from": "use_ip_badge", "invert": true, "inverts": "use_ip_badge" }
```

- `value_from`: Field ID to mirror the display value from.
- `invert`: When `true`, shows the logical inverse of the source field's value.
- `inverts`: When set, clicking this checkbox writes the inverse of the clicked value into this field ID (not into `control.id`). Makes the checkbox interactive while keeping only one field persisted.

**Special behavior — permanently disabled checkbox:**  
Use `disabled: true` to render a non-interactive checkbox that still reflects form state (e.g., a read-only summary).

```json
{ "id": "some_flag", "type": "boolean", "title": "Read Only Flag", "default": false, "disabled": true }
```

---

### `number`

A plain numeric text input (no stepper arrows).

```json
{ "id": "timeout", "type": "number", "title": "Timeout", "default": 30 }
```

---

### `number_spinner`

A numeric input with increment/decrement arrows and optional min/max validation.

```json
{
  "id": "page_size",
  "type": "number_spinner",
  "title": "Page Size",
  "default": 100,
  "validations": [{ "type": "min_max", "min": 1, "max": 5000, "error": "Must be between 1 and 5000" }]
}
```

---

### `select`

A dropdown with a static list of options.

```json
{
  "id": "sync_type",
  "type": "select",
  "title": "Sync Type",
  "default": "Standard",
  "values": [
    { "text": "Standard",    "value": "Standard"    },
    { "text": "DataConduit", "value": "DataConduit" }
  ]
}
```

| Field | Description |
|---|---|
| `values` | Array of `{ text, value }` objects. `text` is displayed; `value` is stored. |

---

### `select_dynamic`

A dropdown whose options are loaded from a DM-specific API endpoint at runtime.

```json
{
  "id": "site_id",
  "type": "select_dynamic",
  "title": "Select Site",
  "loadFrom": "rs2/sites",
  "default": -1
}
```

| Field | Description |
|---|---|
| `loadFrom` | Sub-path appended to `/api/data-managers/{guid}/` to fetch options. The API must return `[{ text, value }]`. |

---

### `radio`

A group of mutually exclusive radio buttons.

```json
{
  "id": "sync_direction",
  "type": "radio",
  "title": "Direction",
  "default": "pull",
  "values": [
    { "text": "Pull", "value": "pull" },
    { "text": "Push", "value": "push" }
  ]
}
```

---

### `multiselect_dynamic`

A multi-select list loaded from a DM API endpoint. Selected values are stored as a comma-separated string.

```json
{
  "id": "identifier_types_selected",
  "type": "multiselect_dynamic",
  "title": "Identifier Types",
  "loadFrom": "aeos/badge-types",
  "default": ""
}
```

---

### `keyvalue`

An editable table of key–value pairs. Used for field mapping between the external system and XPressEntry.

```json
{
  "id": "emp_fields",
  "type": "keyvalue",
  "title": "",
  "key_title":    "Source Columns",
  "key_header":   "Source Columns",
  "value_title":  "Destination Columns",
  "value_header": "Destination Columns",
  "default": []
}
```

| Field | Description |
|---|---|
| `key_title` | Placeholder / label for the key column input. |
| `key_header` | Column header text for the key column. |
| `value_title` | Placeholder / label for the value column input. |
| `value_header` | Column header text for the value column. |

---

### `button_bar`

A horizontal row of action buttons. Typically placed in a section with `title: ""` at the bottom of a tab.

```json
{
  "id": "btn_bar_general",
  "type": "button_bar",
  "buttons": [
    { "id": "btn_test",     "title": "Test Connect", "onClick": "dm_shared_testConnection", "tooltip": "Test connection to the server." },
    { "id": "btn_defaults", "title": "Defaults",     "onClick": "setDefaults",              "tooltip": "Reset all settings to defaults." },
    { "id": "btn_save",     "title": "Save",         "onClick": "dm_shared_save",           "tooltip": "Save current settings." }
  ]
}
```

**Button fields:**

| Field | Description |
|---|---|
| `id` | Unique button identifier. |
| `title` | Button label. |
| `onClick` | Handler name. See [Button Handlers](#button-handlers). |
| `tooltip` | Tooltip shown on hover. |
| `enable` | Optional `EnableProp` — disables the button when false. |
| `rightClickMenu` | Optional array of `{ label, onClick }` for a right-click context menu. |

---

### `log_view`

Renders a scrollable live log panel that streams output from the DM. No additional fields needed.

```json
{ "id": "sync_log", "type": "log_view" }
```

---

### `socket_interfaces`

A specialized editor for configuring socket interface entries. DM-specific — used by AEOS.

```json
{ "id": "socket_interface_settings", "type": "socket_interfaces", "title": "Socket Interfaces" }
```

---

### `ip_badge_mappings`

A specialized editor for IP badge mappings. DM-specific — used by AEOS.

```json
{ "id": "ip_badge_settings", "type": "ip_badge_mappings", "title": "IP Badge Mappings" }
```

---

### `rio_devices`

A specialized editor for RIO device configuration. DM-specific.

```json
{ "id": "rio_device_settings", "type": "rio_devices", "title": "RIO Devices", "guid": "...", "serviceBase": "..." }
```

---

### `site_timezones`

A specialized editor for per-site timezone overrides. DM-specific — used by RS2 REST.

```json
{ "id": "site_timezones", "type": "site_timezones", "title": "Site Timezones" }
```

---

## Conditional Logic

`enable` and `display` can be applied to tabs, sections, columns, and individual controls. They accept three formats:

### Static boolean

```json
{ "enable": false }
```

Always disabled / always hidden.

### Expression string

```json
{ "enable": "sync_type == 'DataConduit'" }
```

Evaluated against the current form state. Supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`.

**Value types:**
- String: wrap in single quotes — `'DataConduit'`
- Boolean: bare `true` / `false`
- Number: bare numeric literal — `5`
- Null: bare `null`

**Compound expressions** (evaluated left to right, no grouping):
```json
{ "enable": "filter_active_cardholders == true && cardholders_no_visitors == false" }
{ "enable": "mode == 'A' || mode == 'B'" }
```

> Note: `&&` and `||` cannot be mixed in a single expression.

### Object condition (legacy)

```json
{ "enable": { "type": "hasValue", "field": "server_ip" } }
{ "enable": { "type": "hasValue", "field": "server_ip", "pattern": "^\\d+\\.\\d+\\.\\d+\\.\\d+$" } }
{ "enable": { "type": "equals",   "field": "sync_type", "value": "DataConduit" } }
```

| Type | Behavior |
|---|---|
| `hasValue` | True when the field is non-empty. Optional `pattern` (regex) further constrains the check. |
| `equals` | True when the field's value strictly equals `value`. |

---

## Validations

Validations run on save and block submission when any rule fails.

### `required`

```json
{ "type": "required", "error": "Server is required" }
```

Fails when the field is empty.

### `regex`

```json
{ "type": "regex", "pattern": "^\\d+$", "error": "Must be a number" }
```

Fails when the field value does not match the regex.

### `min_max`

```json
{ "type": "min_max", "min": 1, "max": 5000, "error": "Must be between 1 and 5000" }
```

Fails when the numeric value is outside the given range.

---

## Button Handlers

The `onClick` value is a handler name resolved by the form renderer. Use these reserved names:

| Handler | Description |
|---|---|
| `dm_shared_testConnection` | Runs the DM's Test Connection endpoint and shows the result. |
| `dm_shared_runPartialSync` | Triggers a partial sync for this DM. |
| `dm_shared_runFullSync` | Triggers a full sync for this DM. |
| `dm_shared_runCustomSync` | Triggers the custom sync operation. |
| `dm_shared_editCustomSync` | Opens the Edit Custom Sync dialog (right-click menu only). |
| `dm_shared_save` | Saves the current tab's settings. |
| `setDefaults` | Resets all settings on the current tab to their `default` values. |
| *custom string* | Any other string is dispatched as a DM-specific action handled by the frontend or backend for that DM. |

---

## Complete Minimal Example

```json
{
  "tabs": [
    {
      "title": "Sync",
      "sections": [
        {
          "title": "Sync Operations",
          "columns": [
            {
              "controls": [
                {
                  "id": "sync_buttons",
                  "type": "button_bar",
                  "buttons": [
                    { "id": "btn_partial_sync", "title": "Partial Sync Now", "onClick": "dm_shared_runPartialSync", "tooltip": "Pull incremental changes from the external system." },
                    { "id": "btn_full_sync",    "title": "Full Sync Now",    "onClick": "dm_shared_runFullSync",    "tooltip": "Pull all records from the external system." }
                  ]
                },
                { "id": "sync_log", "type": "log_view" }
              ]
            }
          ]
        }
      ]
    },
    {
      "title": "General",
      "sections": [
        {
          "title": "Connection",
          "columns": [
            {
              "controls": [
                { "id": "server_ip", "type": "text",     "title": "Server",   "default": "localhost", "validations": [{ "type": "required", "error": "Server is required" }] },
                { "id": "port",      "type": "text",     "title": "Port",     "default": "443" },
                { "id": "username",  "type": "text",     "title": "Username", "default": "" },
                { "id": "password",  "type": "password", "title": "Password", "default": "" },
                { "id": "use_ssl",   "type": "boolean",  "title": "Use SSL",  "default": true }
              ]
            },
            {
              "controls": [
                { "id": "verbose_log", "type": "boolean", "title": "Verbose Logging", "default": false },
                {
                  "id": "sync_type",
                  "type": "select",
                  "title": "Sync Type",
                  "default": "Standard",
                  "values": [
                    { "text": "Standard",    "value": "Standard"    },
                    { "text": "DataConduit", "value": "DataConduit" }
                  ]
                },
                {
                  "id": "advanced_option",
                  "type": "boolean",
                  "title": "Advanced Option",
                  "default": false,
                  "enable": "sync_type == 'DataConduit'"
                }
              ]
            }
          ]
        },
        {
          "title": "",
          "columns": [
            {
              "controls": [
                {
                  "id": "btn_bar",
                  "type": "button_bar",
                  "buttons": [
                    { "id": "btn_test",     "title": "Test Connect", "onClick": "dm_shared_testConnection", "tooltip": "Test the connection." },
                    { "id": "btn_defaults", "title": "Defaults",     "onClick": "setDefaults",              "tooltip": "Reset to defaults." },
                    { "id": "btn_save",     "title": "Save",         "onClick": "dm_shared_save",           "tooltip": "Save settings." }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Design Guidelines

- **Tab order:** Always put `Sync` as the first tab (it contains the sync buttons and log). Put `General` (connection + main options) as the second tab.
- **Section with no title:** Use `"title": ""` for footer rows that only contain a `button_bar`.
- **Two-column sections:** Split related options into left/right columns when the WinForm does the same. Prefer one column when there are few fields.
- **Default values:** Always set `default` so the form renders correctly for new DMs that have no saved settings yet.
- **Conditional enable vs display:** Use `enable` (grays out) when the user should see that a feature exists but can't use it yet. Use `display` (hides) only when the field is completely irrelevant to the current configuration.
- **Save buttons:** Each tab that has editable fields should end with a `button_bar` section containing at minimum a Save button.
- **Field IDs:** Use `snake_case`. The ID maps directly to the key stored in the DM's settings hash — changing it breaks existing saved configs.
