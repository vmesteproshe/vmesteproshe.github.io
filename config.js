/*
 * «Вместе проще» — настройки проекта.
 *
 * 1. Создайте проект на supabase.com.
 * 2. Откройте Project Settings → API.
 * 3. Скопируйте Project URL и anon/public key сюда.
 * 4. Bucket для картинок создаётся по инструкции из README.md (по умолчанию — media).
 *
 * anon-ключ публичный по задумке Supabase: доступ к записи защищён RLS-политиками.
 * Ключ service_role сюда вставлять нельзя.
 */
window.APP_CONFIG = {
  SUPABASE_URL: "https://dzltuytpiqiddyfzlegq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_957tafzosPrmIoUMZYVxhg_rGoX0kzB",
  MEDIA_BUCKET: "media"
};
