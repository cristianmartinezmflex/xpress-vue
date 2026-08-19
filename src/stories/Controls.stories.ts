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
          '**Acciones (2 formas):**',
          '- **REST (recomendada)** — el botón declara `{ verb, action }`: al clickearlo se hace `verb <serviceBase><action>` (con `{dmId}` reemplazado por el guid del DM). No requiere código front. Es la forma que usan OnGuard y Genetec (ej. `check-subscriptions`, `update-panels`, `clear-external-data`).',
          '- **Handler front (`onClick`)** — nombre de una función resuelta **por prefijo**: `dm_shared_*` (compartidas, en `actions/dm-shared-actions.ts`). Los handlers específicos por DM (`aeos_*`, `avigilon_*`, `genetec_*`, `rs2_*`, `on-guard`) fueron eliminados: la carga de campos ahora la hace el propio control (`customFields` con `loadFrom`), no un botón.',
          '',
          '**Loading:** mientras una acción está en vuelo, el botón que la disparó muestra un spinner y queda deshabilitado (igual que Save). Los dropdowns que cargan de la API (`select` con `loadFrom`, `checkbox_multiselect`, `customFields`) muestran un spinner mientras traen sus opciones.',
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
  { docs: '**Uso:** elegir **una** opción. Las opciones pueden ser **estáticas** (`values`) o **dinámicas** (`loadFrom`, ver siguiente story).\n\n**Props soportadas:** `values` (`[{ text, value }]`) **o** `loadFrom`, `default`.' },
)

export const SelectWithLoadFrom = story(
  { id: 'site_id', type: 'select', title: 'Site', loadFrom: 'sites', default: -1 },
  {
    note: 'Mismo control `select`, pero con `loadFrom`: las opciones se cargan del servicio en runtime. En el catálogo no hay DM vivo, así que la lista queda vacía (muestra spinner y luego vacío).',
    docs: [
      '**Uso:** `select` con opciones que se **cargan del servicio** en runtime (reemplaza al viejo `select_dynamic`).',
      '',
      '**Props soportadas:** `loadFrom`, `default`. Requiere un `guid` de DM en runtime.',
      '- `"<type>"` → `GET /api/data-managers/{guid}/dm-data?type=<type>` (data específica del DM, ej. `sites`, `zones`, `directories`).',
      '- `"shared/<type>"` → `GET /api/shared/<type>` (data local agnóstica de DM, ej. `shared/zones`, `shared/badge_types`, `shared/user_profiles`; no requiere guid).',
      'La API devuelve `[{ id, name }]`. Mientras carga, el select muestra un spinner y queda deshabilitado.',
    ].join('\n'),
  },
)

export const CheckboxMultiselect = story(
  { id: 'panel_filter', type: 'checkbox_multiselect', title: 'Panels', loadFrom: 'panels', optionsKey: '_onguard_panels' },
  {
    note: 'Las opciones se auto-cargan de la API vía `loadFrom` al montar (como en OnGuard). Un botón/acción puede refrescarlas escribiendo `optionsKey`. Acá se siembran para la demo. El valor es una lista de ids separados por coma.',
    initial: {
      _onguard_panels: JSON.stringify([
        { id: '1', name: 'Main Building' },
        { id: '5', name: 'Warehouse' },
        { id: '9', name: 'Parking Gate' },
      ]),
      panel_filter: '5',
    },
    docs: [
      '**Uso:** multi-select de checkboxes **genérico** (no atado a ningún DM), con Select All / Clear All. Ej.: los filtros de "Panels" / "Segments" / "Badge Types" de OnGuard.',
      '',
      '**Props soportadas:**',
      '- `loadFrom` — URL para **auto-cargar** la lista al montar (misma convención que `select` dinámico: `"<type>"` → `dm-data?type=`, `"shared/<type>"` → `/api/shared/`). Muestra un spinner mientras carga.',
      '- `optionsKey` (opcional) — key del **form state** con la lista de opciones (`[{ id, name }]`); una acción/botón la escribe para **refrescar** la lista en vivo. Si está presente, se mergea sobre lo cargado por `loadFrom`.',
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
      { id: 'btn_update_panels', title: 'Update Panel List', verb: 'POST', action: '/api/data-managers/{dmId}/update-panels', tooltip: 'Botón REST: pega a la URL de `action` (con {dmId} reemplazado).' },
      { id: 'btn_custom', title: 'Custom Sync Now', onClick: 'dm_shared_runCustomSync', rightClickMenu: [{ label: 'Edit Custom Sync', onClick: 'dm_shared_editCustomSync' }] },
    ],
  },
  {
    note: 'El primer botón es REST ({verb, action}); el segundo usa un handler front compartido (onClick). Mientras la acción corre, el botón muestra spinner y se deshabilita.',
    docs: [
      '**Uso:** fila de botones de acción (sync, actualizar listas del sistema externo, mantenimiento, etc.).',
      '',
      '**Props soportadas:** `buttons` — array de `{ id, title, tooltip?, enable?, rightClickMenu? }` **más una de estas dos formas de acción**:',
      '- **REST:** `{ verb, action }` — `verb` (default `POST`) + `action` (URL, puede contener `{dmId}`). Al clickear se hace `verb <serviceBase><action>`. Forma recomendada (OnGuard/Genetec).',
      '- **Handler front:** `onClick` — nombre resuelto por prefijo `dm_shared_*`.',
      '- `enable` por botón acepta expresión contra el state.',
      '- `rightClickMenu` agrega un menú contextual (click derecho) con items `{ label, onClick }`.',
      '- **Loading:** el botón cuya acción está en vuelo muestra un spinner y queda deshabilitado.',
    ].join('\n'),
  },
)

export const CustomFields = story(
  {
    id: 'customFields',
    type: 'customFields',
    title: '',
    entity: 'Users',
    key_header: 'Source Field',
    value_header: 'XPressEntry Field',
    loadFrom: 'employee-fields',
    destinationLoadFrom: 'shared/entity-fields-users',
    default: [],
  },
  {
    note: 'Mapea columnas de origen (sistema externo) a campos de XPressEntry. Ambos dropdowns se auto-cargan de la API; en el catálogo no hay DM vivo, así que quedan vacíos (muestran spinner y luego lista vacía).',
    docs: [
      '**Uso:** mapeo de campos **Source → Destination** (ej. campos del sistema externo → UDFs de XPressEntry). Reemplaza el viejo patrón "keyvalue + botón Load Fields": ahora las columnas se cargan solas.',
      '',
      '**Props soportadas:**',
      '- `loadFrom` — auto-carga las **Source Columns** (misma convención que `select` dinámico: `"<type>"` → `dm-data?type=`, `"shared/<type>"` → `/api/shared/`).',
      '- `destinationLoadFrom` — auto-carga las **Destination Columns** (campos de XPressEntry, ej. `shared/entity-fields-users`).',
      '- `key_header` / `value_header` — encabezados de columna; `key_title` / `value_title` — labels de los dropdowns de "agregar".',
      '- `entity` — entidad local a la que apunta el mapeo (`Users` / `Badges`); si no hay `title`, se deriva de acá (ej. "Users Custom Mapping").',
      '- **Valor**: array `[{ key, value }]` (source → destination).',
      '',
      '**Ejemplo real (AEOS Employee):** `loadFrom: "employee-fields"`, `destinationLoadFrom: "shared/entity-fields-users"`.',
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

export const Table = story(
  {
    id: 'rio_list',
    type: 'table',
    title: 'CloudLink Devices',
    fields: [
      { id: 'Name', type: 'text', title: 'Device Name', isKey: true },
      { id: 'Server', type: 'text', title: 'Device IP' },
      { id: 'Username', type: 'text', title: 'RIO User' },
      { id: 'Password', type: 'password', title: 'RIO Password' },
      { id: 'AcceptUntrustedCert', type: 'boolean', title: 'Accept Untrusted Certificate' },
    ],
    default: '[]',
  },
  {
    note: 'Tabla genérica: columnas y el modal de "Add / Edit" se generan a partir de `fields`. Al clickear una fila se abre el modal para editar; la X al final la elimina. Los campos `password` no se muestran como columna.',
    docs: [
      '**Uso:** lista/grilla editable **genérica** de filas tipadas (ej. dispositivos CloudLink de Genetec). Nada hardcodeado: la tabla y el formulario de alta/edición se derivan de `fields`.',
      '',
      '**Props soportadas:**',
      '- `fields` — array de controls (cada uno una columna + un campo del modal): `{ id, type, title, isKey? }`. `type` reutiliza los controles base (`text`, `password`, `boolean`, `number`, `number_spinner`, `select`).',
      '- `isKey` — marca la columna de identidad/display de la fila.',
      '- **Valor**: string JSON de un array de objetos (`[{ ... }]`). Las props extra de cada fila que el form no expone (ej. `ID`, `DoorList`) se **preservan** al guardar.',
      '',
      '**Backend:** en un DM tipado, se declara con `ControlType.Table` sobre una `List(Of T)`; el generador refleja el tipo `T` de la fila para producir `fields`.',
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
