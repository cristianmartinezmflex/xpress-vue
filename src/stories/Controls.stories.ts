import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { Control } from '@/features/form-renderer/types/schema'
import ControlShowcase from './ControlShowcase.vue'

// Catalog of every schema control type. Each story shows the rendered control (interactive, as it
// appears in a Data Manager form), the exact JSON fragment you paste into ./data/<name>.json, and
// the live form value. The Docs tab documents each control's use case and supported props.
const meta: Meta<typeof ControlShowcase> = {
  title: 'Controls',
  component: ControlShowcase,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Catálogo de todos los controles disponibles para armar el schema de un Data Manager.',
          '',
          '**Props comunes a todos los controles:**',
          '- `id` (string, requerido) — clave del campo en el JSON de settings del DM que este control lee/escribe.',
          '- `type` (string, requerido) — tipo de control (ver stories).',
          '- `title` (string) — label del control.',
          '- `enable` / `display` — `boolean`, o una **expresión** evaluada contra el state del form (ej. `"custom_card_format == true"`, soporta `== != > >= < <=` y `&& ||`). Controlan si el control está habilitado / visible.',
          '- `disabled` (boolean) — fuerza solo-lectura.',
          '- `validations` — array de `{ type: "required" | "regex" | "min_max", pattern?, min?, max?, error }`.',
          '',
          '**Acciones:** el `onClick` de los botones se resuelve **por prefijo** — `dm_shared_*` (compartidas, en `actions/dm-shared-actions.ts`) o `<dm>_*` (archivo propio del DM en `actions/`).',
        ].join('\n'),
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof ControlShowcase>
interface StoryOpts { note?: string; initial?: Record<string, unknown>; docs?: string }
const story = (control: Control, opts: StoryOpts = {}): Story => ({
  args: { control, note: opts.note, initial: opts.initial },
  parameters: opts.docs ? { docs: { description: { story: opts.docs } } } : undefined,
})

export const Text = story(
  {
    id: 'server_ip',
    type: 'text',
    title: 'Server',
    default: 'localhost',
    validations: [{ type: 'required', error: 'Server is required' }],
  },
  {
    docs: [
      '**Uso:** entrada de texto de una línea — hosts, usuarios, nombres de eventos, IDs.',
      '',
      '**Props soportadas:** `default`, `validations` (`required` / `regex`), `disabled`, `value_from` (muestra el valor de otro campo en modo solo-lectura, útil para reflejar datos derivados).',
    ].join('\n'),
  },
)

export const Password = story(
  { id: 'password', type: 'password', title: 'Password', default: '' },
  { docs: '**Uso:** valores sensibles (contraseñas, tokens, API keys). Igual que `text` pero el contenido va enmascarado.\n\n**Props soportadas:** `default`.' },
)

export const Boolean_ = story(
  { id: 'related_data', type: 'boolean', title: 'Download Related Data', default: true },
  {
    docs: [
      '**Uso:** flags on/off — habilitar features, modos, opciones.',
      '',
      '**Props soportadas:** `default` (bool). Avanzadas: `value_from` (espeja el valor de otro campo), `invert` (muestra el inverso del `value_from`), `inverts` (al togglear escribe el valor **inverso** en el campo id indicado en lugar de en `id`).',
    ].join('\n'),
  },
)

export const Number_ = story(
  { id: 'timeout', type: 'number', title: 'Timeout', default: 30 },
  { docs: '**Uso:** número simple (input numérico).\n\n**Props soportadas:** `default`, `validations`.' },
)

export const NumberSpinner = story(
  {
    id: 'page_size',
    type: 'number_spinner',
    title: 'Page Size',
    default: 10000,
    validations: [{ type: 'min_max', min: 1, max: 100000, error: 'Must be between 1 and 100000' }],
  },
  { docs: '**Uso:** número con botones +/- — page size, timeouts, contadores.\n\n**Props soportadas:** `default`, `validations` (`min_max` con `min`/`max`).' },
)

export const Select = story(
  {
    id: 'mode',
    type: 'select',
    title: 'Mode',
    default: 'incremental',
    values: [
      { text: 'Incremental', value: 'incremental' },
      { text: 'Full', value: 'full' },
    ],
  },
  { docs: '**Uso:** elegir **una** opción de una lista **fija** (definida en el JSON).\n\n**Props soportadas:** `values` (`[{ text, value }]`), `default`.' },
)

export const SelectDynamic = story(
  { id: 'site_id', type: 'select_dynamic', title: 'Site', loadFrom: 'sites' },
  {
    note: 'Las opciones se cargan en runtime desde el servicio; en el catálogo no hay DM vivo, así que la lista queda vacía.',
    docs: [
      '**Uso:** elegir **una** opción de una lista que se **carga del servicio** en runtime.',
      '',
      '**Props soportadas:** `loadFrom`, `default`. Requiere un `guid` de DM en runtime.',
      '- `"<type>"` → `GET /api/data-managers/{guid}/dm-data?type=<type>` (data específica del DM, ej. `sites`, `zones`, `cardholder-fields`).',
      '- `"shared/<type>"` → `GET /api/shared/<type>` (data local agnóstica de DM, ej. `shared/zones`, `shared/badge_types`; no requiere guid).',
      'La API devuelve `[{ id, name }]`.',
    ].join('\n'),
  },
)

export const MultiselectDynamic = story(
  { id: 'identifier_types', type: 'multiselect_dynamic', title: 'Identifier Types', loadFrom: 'shared/badge_types' },
  { docs: '**Uso:** elegir **varias** opciones de una lista cargada del servicio.\n\n**Props soportadas:** `loadFrom` (misma convención que `select_dynamic`: `"<type>"` → `dm-data?type=`, `"shared/<type>"` → `/api/shared/`).' },
)

export const CheckboxMultiselect = story(
  { id: 'panel_filter', type: 'checkbox_multiselect', title: 'Panels', optionsKey: 'panel_options' },
  {
    note: 'Las opciones vienen de una key del state (`optionsKey`) que llena una acción/botón; acá se siembran para la demo. El valor es una lista de ids separados por coma.',
    initial: {
      panel_options: JSON.stringify([
        { id: '1', name: 'Main Building' },
        { id: '5', name: 'Warehouse' },
        { id: '9', name: 'Parking Gate' },
      ]),
      panel_filter: '5',
    },
    docs: [
      '**Uso:** multi-select de checkboxes **genérico** (no atado a ningún DM) para listas que se cargan on-demand (por un botón/acción), no al montar. Ej.: el "Panel Filter (Readers)" de OnGuard.',
      '',
      '**Props soportadas:**',
      '- `optionsKey` — key del **form state** que contiene la lista de opciones (`[{ id, name }]`, como JSON string o array). Alguna acción la escribe (ej. tras traer la lista del sistema externo); el control la renderiza.',
      '- **Valor**: string de ids separados por coma (ej. `"1,5,9"`). Los ids seleccionados que aún no están en las opciones se muestran igual (labeleados por id) para no perder la selección guardada.',
    ].join('\n'),
  },
)

export const Radio = story(
  {
    id: 'direction',
    type: 'radio',
    title: 'Access Direction',
    values: [
      { text: 'In', value: 'in' },
      { text: 'Out', value: 'out' },
    ],
  },
  { docs: '**Uso:** elegir una opción entre **pocas**, todas visibles (radio buttons).\n\n**Props soportadas:** `values` (`[{ text, value }]`).' },
)

export const ButtonBar = story(
  {
    id: 'ops_buttons',
    type: 'button_bar',
    buttons: [
      { id: 'btn_load', title: 'Load Fields', onClick: 'genetec_loadCustomFields', tooltip: 'Ejecuta la acción nombrada en onClick.' },
      { id: 'btn_custom', title: 'Custom Sync Now', onClick: 'dm_shared_runCustomSync', rightClickMenu: [{ label: 'Edit Custom Sync', onClick: 'dm_shared_editCustomSync' }] },
    ],
  },
  {
    note: 'Cada botón despacha la acción de su onClick (resuelta por prefijo).',
    docs: [
      '**Uso:** fila de botones de acción (sync, cargar campos, test, etc.).',
      '',
      '**Props soportadas:** `buttons` — array de `{ id, title, onClick, tooltip?, enable?, rightClickMenu?: [{ label, onClick }] }`.',
      '- `onClick` se resuelve por prefijo: `dm_shared_*` o `<dm>_*`.',
      '- `enable` por botón acepta expresión contra el state.',
      '- `rightClickMenu` agrega un menú contextual (click derecho).',
    ].join('\n'),
  },
)

export const LogView = story(
  { id: 'sync_log', type: 'log_view' },
  {
    note: 'Log de sync en vivo (Centrifugo). Muestra "Waiting for sync events…" hasta que corre un sync.',
    docs: '**Uso:** consola de log de sync en vivo (streaming vía Centrifugo). Normalmente `id: "sync_log"`.\n\n**Props soportadas:** ninguna extra (usa `guid`/`serviceBase` del contexto).',
  },
)

export const SocketInterfaces = story(
  { id: 'sockets', type: 'socket_interfaces', title: 'Socket Interfaces' },
  { docs: '**Uso:** editar interfaces de socket (host/puerto) del DM.\n\n**Props soportadas:** ninguna extra.' },
)

export const IpBadgeMappings = story(
  { id: 'ip_badge', type: 'ip_badge_mappings', title: 'IP → Badge Mappings' },
  { docs: '**Uso:** mapear direcciones IP a badges.\n\n**Props soportadas:** ninguna extra.' },
)

export const RioDevices = story(
  {
    id: 'rio_list',
    type: 'rio_devices',
    title: 'CloudLink Devices',
    buttons: [
      { id: 'btn_ping_rio', title: 'Ping', onClick: 'genetec_pingRio', tooltip: 'Test connectivity to this device.' },
      { id: 'btn_update_rio', title: 'Update RIO Readers', onClick: 'genetec_updateRio', tooltip: 'Push reader/door config to this device.' },
    ],
  },
  {
    note: 'Lista de dispositivos. Los botones per-device se declaran en `buttons` y se despachan con el device como payload.',
    docs: [
      '**Uso:** lista editable de dispositivos CloudLink (RIO) — cada uno con server, credenciales, door list, etc.',
      '',
      '**Props soportadas:** `buttons` — botones **por dispositivo** (`[{ id, title, onClick, tooltip? }]`). Al clickear, se despacha la acción con el device como `payload` (la acción lo lee de `ctx.payload`).',
    ].join('\n'),
  },
)

export const SiteTimezones = story(
  { id: 'site_timezones', type: 'site_timezones', title: 'Site Timezones' },
  {
    note: 'Mapea site → timezone. Los sites se cargan del servicio en runtime.',
    docs: '**Uso:** mapear cada site a su timezone.\n\n**Props soportadas:** ninguna extra (los sites se cargan del servicio; se serializa como objeto al guardar).',
  },
)

export const ConditionalEnable = story(
  {
    id: 'card_num_start_bit',
    type: 'number_spinner',
    title: 'Card Number Start Bit',
    default: 0,
    enable: 'custom_card_format == true',
  },
  {
    note: 'Habilitado sólo cuando el campo sembrado custom_card_format es true.',
    initial: { custom_card_format: true },
    docs: [
      '**Uso:** demostrar `enable` / `display` — funcionan en **cualquier** control (también en secciones, columnas y botones).',
      '',
      'Aceptan: `true`/`false`, o una **expresión** contra el state del form (ej. `"custom_card_format == true"`, `"a == true && b != \'x\'"`).',
      '- `enable` → controla si el control es interactivo.',
      '- `display` → controla si el control es visible.',
    ].join('\n'),
  },
)
