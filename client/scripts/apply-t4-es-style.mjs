/**
 * T4 — Apply Spanish style guide to client/src/locales/es/translation.json.
 * See docs/05-Guia-Estilo-Espanol-QVision.md
 *
 * Run: node client/scripts/apply-t4-es-style.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esPath = path.join(__dirname, '../src/locales/es/translation.json');

/** @type {Record<string, string>} */
const KEY_OVERRIDES = {
  com_endpoint: 'Modelo',
  com_files_upload_local_machine: 'Desde mi computadora',
  com_assistants_file_search: 'Búsqueda de archivos',
  com_assistants_image_vision: 'Visión de imagen',
  com_agents_start_chat: 'Iniciar chat',
  com_endpoint_disable_streaming_label: 'Deshabilitar transmisión',
  com_endpoint_max_output_tokens: 'Tokens de salida máximos',
  com_endpoint_search: 'Buscar modelo por nombre',
  com_nav_modular_chat: 'Permitir cambiar de modelo a mitad de un chat',
  com_nav_export_conversation: 'Exportar chat',
  com_nav_conversation_mode: 'Modo de chat',
  com_nav_convo_menu_options: 'Opciones del menú del chat',
  com_shortcut_archive_conversation: 'Archivar chat',
  com_shortcut_bookmark_conversation: 'Marcar chat',
  com_shortcut_delete_conversation: 'Eliminar chat',
  com_sidepanel_manage_files: 'Administrar archivos',
  com_ui_bookmarks_add: 'Agregar marcadores',
  com_ui_create_prompt: 'Crear prompt',
  com_ui_export_convo_modal: 'Exportar chat',
  com_ui_image_gen: 'Imágenes generadas',
  com_ui_my_prompts: 'Mis prompts',
  com_ui_show_all: 'Mostrar todo',
  com_ui_sr_global_prompt: 'Grupo de prompts globales',
  com_user_message: 'Tú',
  com_nav_save_badges_state: 'Guardar el estado de las etiquetas',
  com_nav_info_save_badges_state:
    'Al habilitar esta opción, se guardará el estado de las etiquetas del chat. Si creas un chat nuevo, las etiquetas mantienen el mismo estado que el chat anterior. Si lo desactivas, vuelven al estado predeterminado en cada chat nuevo.',
  com_ui_save_badge_changes: '¿Guardar cambios de etiquetas?',
  com_nav_at_command_description:
    'Activa el comando \"@\" para cambiar entre modelos, configuraciones preestablecidas, etc.',
  com_nav_export_include_endpoint_options: 'Incluir opciones del modelo',
  com_ui_attach_error_disabled: 'Las subidas de archivos están deshabilitadas para este modelo',
  com_ui_attach_error_size: 'Se superó el límite de tamaño de archivo del modelo:',
  com_ui_attach_error_total_size: 'Se superó el límite de tamaño total de archivos del modelo:',
  com_ui_attach_error_type: 'Tipo de archivo no compatible con el modelo:',
  com_ui_endpoint_menu: 'Menú de modelos',
  com_ui_mention:
    'Menciona un modelo, asistente o configuración preestablecida para cambiar rápidamente',
  com_assistants_append_date: 'Añadir fecha y hora actuales',
  com_auth_verify_your_identity: 'Verifica tu identidad',
  com_nav_show_thinking: 'Abrir menús de pensamiento por defecto',
  com_ui_web_search_searxng_api_key: 'Ingresa clave API de SearXNG (opcional)',
};

/** Longest first to avoid partial replacements */
const PHRASE_REPLACEMENTS = [
  ['¿Está seguro de que desea', '¿Seguro que quieres'],
  ['¿Está seguro de que quiere', '¿Seguro que quieres'],
  ['Eliminar cuenta - ¿Está seguro?', 'Eliminar cuenta: ¿seguro?'],
  ['Por favor, inténtelo de nuevo', 'Inténtalo de nuevo'],
  ['Por favor inténtelo de nuevo', 'Inténtalo de nuevo'],
  ['Por favor, inténtelo de nuevo en unos momentos', 'Inténtalo de nuevo en unos momentos'],
  ['Por favor, inténtelo de nuevo más tarde', 'Inténtalo más tarde'],
  ['e inténtelo de nuevo', 'e inténtalo de nuevo'],
  ['e inténtalo de nuevo', 'e inténtalo de nuevo'],
  ['Inténtelo de nuevo', 'Inténtalo de nuevo'],
  ['Por favor, seleccione', 'Selecciona'],
  ['Por favor seleccione', 'Selecciona'],
  ['Por favor, ingrese', 'Ingresa'],
  ['Por favor ingrese', 'Ingresa'],
  ['Por favor, intente', 'Intenta'],
  ['Por favor intente', 'Intenta'],
  ['Por favor, verifique', 'Verifica'],
  ['Por favor, actualice', 'Actualiza'],
  ['Por favor, proporcione', 'Proporciona'],
  ['Por favor proporcione', 'Proporciona'],
  ['Haga clic', 'Haz clic'],
  ['haga clic', 'haz clic'],
  ['Suelte', 'Suelta'],
  ['Ingrese', 'Ingresa'],
  ['ingrese', 'ingresa'],
  ['Seleccione', 'Selecciona'],
  ['seleccione', 'selecciona'],
  ['Marque', 'Marca'],
  ['Desactívelo', 'Desactívalo'],
  ['Limpie', 'Limpia'],
  ['Contacte al administrador', 'Contacta al administrador'],
  ['Contacte a su administrador', 'Contacta a tu administrador'],
  ['Establezca', 'Establece'],
  ['Utilice esto', 'Usa esto'],
  ['Utilice ', 'Usa '],
  ['Utilizar ', 'Usar '],
  ['Especifique', 'Especifica'],
  ['Verifique', 'Verifica'],
  ['Asegúrese', 'Asegúrate'],
  ['inténtelo', 'inténtalo'],
  ['Inténtelo', 'Inténtalo'],
  ['Use valores', 'Usa valores'],
  ['Use una', 'Usa una'],
  ['Use el', 'Usa el'],
  ['Use la', 'Usa la'],
  ['Use esto', 'Usa esto'],
  ['Puede experimentar', 'Puedes tener'],
  ['puede experimentar', 'puedes tener'],
  ['si no necesita', 'si no necesitas'],
  ['Si desactiva', 'Si desactivas'],
  ['si crea un nuevo chat', 'si creas un chat nuevo'],
  ['si crea ', 'si creas '],
  ['Si tiene otras', 'Si tienes otras'],
  ['incluido usted', 'tú incluido'],
  ['verá "Usted"', 'verás "Tú"'],
  ['solo verá "Usted"', 'solo verás "Tú"'],
  ['se enviará su mensaje', 'se enviará tu mensaje'],
  ['para enviar su mensaje', 'para enviar tu mensaje'],
  ['Su clave nunca', 'Tu clave nunca'],
  ['Establezca su clave', 'Establece tu clave en'],
  ['de su navegador', 'de tu navegador'],
  ['de su cuenta', 'de tu cuenta'],
  ['Ingrese su código', 'Ingresa tu código'],
  ['Ingrese su esquema', 'Ingresa tu esquema'],
  ['se mostrará su nombre', 'se mostrará tu nombre'],
  ['en su dispositivo', 'en tu dispositivo'],
  ['para su uso futuro', 'para tu uso futuro'],
  ['según sus preferencias', 'según tus preferencias'],
  ['registrar su cuenta', 'registrar tu cuenta'],
  ['aún no tiene marcadores', 'aún no tienes marcadores'],
  ['Cree o seleccione una conversación', 'Crea o selecciona un chat'],
  ['agregarlo a la conversación', 'agregarlo al chat'],
  ['Búsqueda de Archivos', 'Búsqueda de archivos'],
  ['insignias del chat', 'etiquetas del chat'],
  ['estado de las insignias', 'estado de las etiquetas'],
  ['cambios de insignias', 'cambios de etiquetas'],
  ['las insignias', 'las etiquetas'],
  ['Las insignias', 'Las etiquetas'],
  ['Área de Pruebas del Proveedor', 'área de pruebas del proveedor'],
  ['Crear una Cuenta de Servicio', 'Crear una cuenta de servicio'],
  ['Mensaje del sistema', 'Mensaje del sistema'],
  ['Tokens de Salida Máximos', 'Tokens de salida máximos'],
  ['Esfuerzo de Razonamiento', 'Esfuerzo de razonamiento'],
  ['indicaciones globales', 'prompts globales'],
  ['dependiendo de la indicación', 'según el prompt'],
  ['que usted o sus usuarios', 'que tú o tus usuarios'],
  ['Puede adjuntarlos', 'Puedes adjuntarlos'],
  ['Use el control', 'Usa el control'],
  ['Intente convertir', 'Intenta convertir'],
  ['intente actualizar', 'intenta actualizar'],
  ['cambiar de endpoint', 'cambiar de modelo'],
  ['punto de conexión', 'modelo'],
  ['Endpoint', 'Modelo'],
  ['endpoint', 'modelo'],
  ['endpoints', 'modelos'],
  ['Su cuenta no', 'Tu cuenta no'],
  ['se le ha enviado', 'te enviamos'],
  ['restablecer su contraseña', 'restablecer tu contraseña'],
  ['su carpeta de correo', 'tu carpeta de correo'],
  ['su correo electrónico', 'tu correo electrónico'],
  ['Por favor, asegúrese de revisar', 'Revisa'],
  ['Por favor, suba', 'Sube'],
  ['Por favor, deshabilite', 'Desactiva'],
  ['Por favor, use ', 'Usa '],
  ['Por favor, revise', 'Revisa'],
  ['Mencione ', 'Menciona '],
  ['Por favor, escriba', 'Escribe'],
  ['Cree o selecciona una conversación', 'Crea o selecciona un chat'],
  ['Conversación eliminada con éxito', 'Chat eliminado con éxito'],
  ['Error al eliminar la conversación', 'Error al eliminar el chat'],
  ['Duplicando conversación', 'Duplicando chat'],
  ['Conversación duplicada', 'Chat duplicado'],
  ['Agregar conversación múltiple', 'Agregar chat múltiple'],
  ['Agregar a la conversación actual', 'Agregar al chat actual'],
  ['Cerrar conversación agregada', 'Cerrar chat agregado'],
];

/** User-facing possessives; avoids Claude/file “su …”. */
const TU_POSSESSIVE = [
  [/\bSu cuenta\b/g, 'Tu cuenta'],
  [/\bsu cuenta\b/g, 'tu cuenta'],
  [/\bsu Agente\b/g, 'tu agente'],
  [/\bsu agente\b/g, 'tu agente'],
  [/\bsu [Aa]sistente\b/g, 'tu asistente'],
  [/\bsu contraseña\b/g, 'tu contraseña'],
  [/\bsu correo\b/g, 'tu correo'],
  [/\bsu conexión\b/g, 'tu conexión'],
  [/\bsu saldo\b/g, 'tu saldo'],
  [/\bsu mensaje\b/g, 'tu mensaje'],
  [/\bsu clave\b/g, 'tu clave'],
  [/\bsu código\b/g, 'tu código'],
  [/\bCrear su cuenta\b/g, 'Crear tu cuenta'],
  [/\bRestablecer su contraseña\b/g, 'Restablecer tu contraseña'],
  [/\bDescriba su\b/g, 'Describe tu'],
  [/\bOlvidó su contraseña\b/g, '¿Olvidaste tu contraseña?'],
  [/\b¿Olvidó tu contraseña\?\b/g, '¿Olvidaste tu contraseña?'],
  [/\bsu nueva contraseña\b/g, 'tu nueva contraseña'],
  [/\bsu método\b/g, 'tu método'],
  [/\bVerificando su correo\b/g, 'Verificando tu correo'],
  [/\beliminará su cuenta\b/g, 'eliminará tu cuenta'],
  [/\bseguridad a su cuenta\b/g, 'seguridad a tu cuenta'],
  [/\bdeshabilite\b/g, 'desactiva'],
  [/\bDesea\b/g, 'Quieres'],
  [/\bdesee\b/g, 'quieras'],
  [/\bedite su\b/g, 'edita tu'],
  [/\bverifique su\b/g, 'verifica tu'],
  [/\bPor favor verifique\b/g, 'Verifica'],
];

function applyPhrases(value) {
  let out = value;
  for (const [from, to] of PHRASE_REPLACEMENTS) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
    }
  }
  for (const [re, to] of TU_POSSESSIVE) {
    out = out.replace(re, to);
  }
  return out;
}

const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
let changed = 0;

for (const [key, value] of Object.entries(es)) {
  if (typeof value !== 'string') continue;
  const base = KEY_OVERRIDES[key] ?? value;
  const next = applyPhrases(base);
  if (next !== value) {
    es[key] = next;
    changed++;
  }
}

const sorted = Object.fromEntries(Object.keys(es).sort().map((k) => [k, es[k]]));
fs.writeFileSync(esPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
console.log(`T4 apply done: ${changed} keys updated, ${Object.keys(sorted).length} total`);