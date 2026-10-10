import { academicSupabase } from './academicCloud';

async function requireUser(expectedUserId: string) {
  if (!academicSupabase) throw new Error('Supabase is not configured.');
  const { data, error } = await academicSupabase.auth.getUser();
  if (error || data.user?.id !== expectedUserId) {
    throw new Error('Your cloud session has changed. Please sign in again.');
  }
  return academicSupabase;
}

export async function initializeCloudAppLock(
  userId: string,
  initialPin: string,
  enabled: boolean,
): Promise<boolean> {
  const client = await requireUser(userId);
  const { data, error } = await client.rpc('initialize_app_lock', {
    p_pin: initialPin,
    p_enabled: enabled,
  });
  if (error) throw new Error(`Could not sync your app lock. ${error.message}`);
  return data as boolean;
}

export async function saveCloudAppLock(
  userId: string,
  pin: string | null,
  enabled: boolean,
): Promise<void> {
  const client = await requireUser(userId);
  const { error } = await client.rpc('save_app_lock_settings', {
    p_pin: pin,
    p_enabled: enabled,
  });
  if (error) throw new Error(`Could not save your shared app lock. ${error.message}`);
}

export async function verifyCloudAppPin(userId: string, pin: string): Promise<boolean> {
  const client = await requireUser(userId);
  const { data, error } = await client.rpc('verify_app_pin', { p_pin: pin });
  if (error) throw new Error(`Could not verify your shared app PIN. ${error.message}`);
  return data as boolean;
}
