/**
 * Centralized feature visibility configuration.
 * Toggle these flags to show or hide sections during demonstrations or releases.
 * When set to false:
 * - Navigation items are hidden from the sidebar and UI menus.
 * - Direct URL routes redirect to the Dashboard.
 * - Underlying components, APIs, database tables, and logic remain fully preserved.
 */
export const FEATURE_VISIBILITY = {
  tasksCalendar: false,
  myNotes: false,
};
