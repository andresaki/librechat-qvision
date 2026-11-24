/**
 * Merge T1 high-priority Spanish UI strings into client/src/locales/es/translation.json.
 * Run: node client/scripts/merge-t1-es-translations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esPath = path.join(__dirname, '../src/locales/es/translation.json');
const enPath = path.join(__dirname, '../src/locales/en/translation.json');

/** @type {Record<string, string>} */
const T1_ES = {
  com_agents_starters_heading: 'Prueba una pregunta sugerida',
  com_agents_starters_hint:
    'Elige una para abrir un chat; puedes editarla antes de enviarla.',
  com_files_filter_by: 'Filtrar archivos por...',
  com_nav_about_branch: 'Rama',
  com_nav_about_build_date: 'Compilación',
  com_nav_about_commit: 'Commit',
  com_nav_about_diagnostics_copy: 'Copiar diagnóstico',
  com_nav_about_diagnostics_description:
    'Copia este bloque al abrir un incidente de soporte para que los mantenedores identifiquen la compilación exacta que usas.',
  com_nav_about_version: 'Versión',
  com_nav_advanced_prompts: 'Editor avanzado de prompts',
  com_nav_advanced_prompts_desc:
    'Habilita el control de versiones y de producción para prompts',
  com_nav_archive_all_chats: 'Archivar todos los chats',
  com_nav_archive_all_confirm_message:
    '¿Seguro que quieres archivar todos los chats? Se quitarán de tu lista y seguirán disponibles en Chats archivados.',
  com_nav_collapse_user_messages: 'Colapsar mensajes largos del usuario',
  com_nav_copy_rich_text: 'Copiar mensajes como texto enriquecido',
  com_nav_export_screenshot_error:
    'No se pudo capturar la captura de pantalla. Prueba otro tipo de exportación.',
  com_nav_export_screenshot_private_text:
    'No se pueden exportar capturas mientras el chat tenga texto protegido o sin enviar. Exporta como texto o JSON.',
  com_nav_export_screenshot_too_large:
    'Esta conversación es demasiado grande para exportarla como captura. Prueba otro tipo de exportación.',
  com_nav_export_type_csv: 'csv (.csv)',
  com_nav_export_type_json: 'json (.json)',
  com_nav_export_type_markdown: 'markdown (.md)',
  com_nav_export_type_screenshot: 'captura (.png)',
  com_nav_export_type_text: 'texto (.txt)',
  com_nav_export_unavailable:
    'No se pudo cargar esta conversación para exportar. Inténtalo de nuevo.',
  com_nav_help: 'Ayuda',
  com_nav_info_collapse_user_messages:
    'Cuando está activado, los mensajes largos del usuario se muestran colapsados con la opción Mostrar más, para que el texto o código pegado no domine la conversación. El texto completo sigue en la página, listo para copiar o buscar.',
  com_nav_info_copy_rich_text:
    'Cuando está activado, al copiar un mensaje también se coloca una versión formateada en el portapapeles, de modo que encabezados, listas, tablas y código conservan el estilo al pegar en aplicaciones que no admiten Markdown, como Teams, Outlook o Word.',
  com_nav_info_default_temporary_chat:
    'Cuando está activado, los chats nuevos empiezan en modo chat temporal.',
  com_nav_info_reply_notification_sound:
    'Reproduce un breve sonido cuando llega una respuesta mientras no estás en LibreChat.',
  com_nav_info_reply_notifications:
    'Muestra una notificación del escritorio cuando llega una respuesta mientras no estás en LibreChat. El navegador pedirá permiso la primera vez que lo actives. No se muestran notificaciones mientras miras LibreChat, porque la lista de conversaciones ya marca la respuesta.',
  com_nav_info_show_lia:
    'Lia es una pequeña mascota pixelada que aparece junto al cuadro de chat en la pantalla de bienvenida. Es decorativa y nunca envía nada.',
  com_nav_info_smooth_streaming:
    'Cuando está activado, las palabras nuevas del último mensaje aparecen con un fundido suave. Es solo visual: no retrasa la entrega de tokens; se desactiva automáticamente si tu dispositivo prefiere menos movimiento.',
  com_nav_info_unseen_tab_badge:
    'Muestra en la pestaña del navegador el número de conversaciones con respuestas no leídas.',
  com_nav_mobile_drawer_strip: 'Mostrar el chat junto a la barra lateral en móvil',
  com_nav_mobile_drawer_strip_info:
    'La barra lateral no llega al borde para dejar visible una franja de la conversación. Al tocarla se cierra la barra lateral.',
  com_nav_new_chat_switch_to_history: 'Cambiar al historial de chat al iniciar un chat nuevo',
  com_nav_smooth_streaming: 'Texto en streaming suave (fundido de palabras nuevas)',
  com_nav_ui_scale: 'Escala de la interfaz',
  com_nav_ui_scale_decrease: 'Reducir escala de la interfaz',
  com_nav_ui_scale_increase: 'Aumentar escala de la interfaz',
  com_shortcut_bookmark_conversation: 'Marcar conversación',
  com_ui_active_chats: 'Chats activos',
  com_ui_add_special_variables: 'Agregar variables especiales',
  com_ui_additional_details: 'Detalles adicionales',
  com_ui_ascending: 'Ascendente',
  com_ui_change_project: 'Mover a proyecto',
  com_ui_chat_options: 'Opciones del chat',
  com_ui_chat_options_link_active: 'Opciones del chat, enlace activo',
  com_ui_clear_search: 'Borrar búsqueda',
  com_ui_composer_hint_answer: 'Respondiendo. Esc para cerrar',
  com_ui_composer_hint_attach: '+ para adjuntar',
  com_ui_composer_hint_interrupt: 'interrumpir',
  com_ui_composer_hint_mentions: '@ para modelos',
  com_ui_composer_hint_newline: 'para nueva línea',
  com_ui_composer_hint_prompts: '/ para prompts',
  com_ui_composer_hint_queue: 'poner en cola',
  com_ui_composer_hint_queue_default: 'Enter pone en cola',
  com_ui_composer_hint_queue_verb: 'pone en cola',
  com_ui_composer_hint_running: 'Generando respuesta…',
  com_ui_composer_hint_send: 'para enviar',
  com_ui_composer_hint_send_now: 'enviar ahora',
  com_ui_composer_hint_steer: 'Enter guía',
  com_ui_composer_hint_steer_verb: 'guía',
  com_ui_composer_hint_typing: 'Enter para enviar · Mayús+Enter para nueva línea',
  com_ui_composer_hint_uploading_one: 'Subiendo {{count}} archivo…',
  com_ui_composer_hint_uploading_other: 'Subiendo {{count}} archivos…',
  com_ui_context_compact: 'Compactar contexto',
  com_ui_context_compact_info:
    'Reemplaza la conversación hasta ahora con un resumen. Los mensajes anteriores siguen visibles aquí pero ya no se envían al modelo.',
  com_ui_context_compacted_by_you: 'Compactaste el contexto',
  com_ui_context_compacting: 'Compactando contexto...',
  com_ui_context_compaction: 'Resumir ahora podría liberar ≈{{0}} tokens',
  com_ui_context_usage: 'Uso del contexto',
  com_ui_context_usage_label:
    'Ventana de contexto: {{0}} de {{1}} tokens usados ({{2}}%)',
  com_ui_context_usage_label_unknown: 'Uso del contexto: {{0}} tokens usados',
  com_ui_context_window: 'Ventana de contexto',
  com_ui_conversation_not_found: 'No se encontró la conversación',
  com_ui_data_table: 'Tabla de datos',
  com_ui_data_table_scroll_area: 'Área desplazable de la tabla de datos',
  com_ui_descending: 'Descendente',
  com_ui_download_error_logs: 'Descargar registro de errores',
  com_ui_error_default_message: 'Ocurrió un error inesperado',
  com_ui_favorite: 'Agregar a favoritos',
  com_ui_feedback_negative: 'Necesita mejorar',
  com_ui_feedback_positive: 'Me gusta',
  com_ui_filter: 'Filtrar',
  com_ui_filter_by: 'Filtrar por {{title}}',
  com_ui_fork_exclude_files: 'Excluir archivos',
  com_ui_fork_info_exclude_files:
    'Si está marcado, la conversación nueva copia los mensajes sin sus archivos adjuntos o generados, para que los mensajes posteriores no los vuelvan a enviar.',
  com_ui_fork_more_details_about:
    'Ver información adicional sobre la opción de bifurcación «{{0}}»',
  com_ui_fork_more_info_options:
    'Ver explicación detallada de todas las opciones de bifurcación y su comportamiento',
  com_ui_import: 'Importar',
  com_ui_importing: 'Importando',
  com_ui_message_nav: 'Navegación de mensajes',
  com_ui_message_nav_go_to_assistant: 'Ir al mensaje del asistente: {{0}}',
  com_ui_message_nav_go_to_system: 'Ir al evento del sistema: {{0}}',
  com_ui_message_nav_go_to_user: 'Ir al mensaje del usuario: {{0}}',
  com_ui_message_nav_next: 'Ir al mensaje siguiente',
  com_ui_message_nav_no_preview: 'Sin vista previa',
  com_ui_message_nav_previous: 'Ir al mensaje anterior',
  com_ui_no_chats: 'Aún no tienes chats',
  com_ui_no_chats_match_filters: 'Ningún chat coincide con tus filtros',
  com_ui_no_data: 'Aún no hay nada aquí',
  com_ui_no_project_chats: 'Aún no tienes chats',
  com_ui_no_unassigned_chats: 'Aún no hay chats fuera de tus proyectos',
  com_ui_optional: '(opcional)',
  com_ui_published_file: 'Archivo publicado',
  com_ui_refresh_page: 'Recargar página',
  com_ui_running_chats: 'En curso',
  com_ui_scroll_to_bottom: 'Desplazarse al final',
  com_ui_scroll_to_top: 'Desplazarse al inicio',
  com_ui_search_language: 'Buscar idiomas...',
  com_ui_settings_label_import: 'Importar conversaciones',
  com_ui_settings_label_provider_api_keys: 'Claves de API de proveedores',
  com_ui_settings_label_revoke_keys: 'Revocar todas las claves de API de proveedores',
  com_ui_settings_label_archive_all_chats: 'Archivar todos los chats',
  com_ui_settings_no_results: 'Ninguna opción coincide con tu búsqueda',
  com_ui_settings_section_api_keys: 'Claves de API',
  com_ui_settings_section_danger_zone: 'Zona de peligro',
  com_ui_settings_section_profile: 'Perfil',
  com_ui_settings_section_notifications: 'Notificaciones',
  com_ui_settings_section_billing: 'Facturación',
  com_ui_settings_section_connections: 'Cuentas conectadas',
  com_ui_settings_section_langfuse: 'Langfuse',
  com_ui_settings_section_code_execution: 'Ejecución de código',
  com_ui_settings_section_security: 'Seguridad',
  com_ui_settings_tab_langfuse: 'Langfuse',
};

const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

let added = 0;
let updated = 0;
for (const [key, value] of Object.entries(T1_ES)) {
  if (!(key in en) && !key.startsWith('com_nav_export_type_')) {
    console.warn('Key not in en:', key);
  }
  if (es[key] === undefined) {
    added++;
  } else if (es[key] !== value) {
    updated++;
  }
  es[key] = value;
}

const sorted = Object.fromEntries(Object.keys(es).sort().map((k) => [k, es[k]]));
fs.writeFileSync(esPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
console.log(`T1 merge done: ${added} added, ${updated} updated, total keys ${Object.keys(sorted).length}`);