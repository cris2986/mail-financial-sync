import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv } from './load-env.mjs';

loadLocalEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const userAEmail = process.env.RLS_TEST_USER_A_EMAIL;
const userAPassword = process.env.RLS_TEST_USER_A_PASSWORD;
const userBEmail = process.env.RLS_TEST_USER_B_EMAIL;
const userBPassword = process.env.RLS_TEST_USER_B_PASSWORD;

const requiredVars = [
  ['SUPABASE_URL/VITE_SUPABASE_URL', supabaseUrl],
  ['SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY', supabaseAnonKey]
];

const missing = requiredVars
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error('[RLS] Faltan variables de entorno:');
  for (const variableName of missing) {
    console.error(` - ${variableName}`);
  }
  process.exit(1);
}

const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

const createEphemeralCredentials = async (label) => {
  const client = createSupabaseClient();
  const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const email = `rls-${normalizedLabel}-${unique}@example.test`;
  const password = `Rls!${randomUUID()}A1`;

  const { data, error } = await client.auth.signUp({
    email,
    password
  });

  if (error) {
    throw new Error(`[RLS] No se pudo crear usuario temporal ${label}: ${error.message}`);
  }

  if (!data.user) {
    throw new Error(`[RLS] Supabase no devolvió usuario temporal para ${label}.`);
  }

  if (!data.session) {
    throw new Error(
      '[RLS] Supabase requiere confirmación de email para signUp. Configura RLS_TEST_USER_A/B_* o desactiva confirmación para el entorno de pruebas.'
    );
  }

  await client.auth.signOut();
  return { email, password };
};

const resolveTestCredentials = async (label, email, password) => {
  if (email && password) {
    return { email, password, source: 'env' };
  }

  if (email || password) {
    throw new Error(`[RLS] ${label}: define email y password juntos o ninguno.`);
  }

  const generated = await createEphemeralCredentials(label);
  return { ...generated, source: 'ephemeral' };
};

const signIn = async (email, password, label) => {
  const client = createSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    throw new Error(`[RLS] No se pudo autenticar ${label}: ${error?.message || 'sin usuario'}`);
  }

  return {
    client,
    user: data.user
  };
};

const hasAuthUserIdColumn = async (client) => {
  const { error } = await client
    .from('users')
    .select('auth_user_id')
    .limit(1);

  if (!error) return true;
  if (/auth_user_id/i.test(error.message)) return false;

  throw new Error(`[RLS] No se pudo validar esquema users.auth_user_id: ${error.message}`);
};

const ensureProfile = async (client, user, label) => {
  const googleId = `rls-${user.id}`;
  const profileName = `RLS ${label}`;
  const profileEmail = user.email || `${label.toLowerCase()}@example.test`;
  const authUserIdSupported = await hasAuthUserIdColumn(client);

  const selectColumns = authUserIdSupported
    ? 'id, auth_user_id, email, name, google_id'
    : 'id, email, name, google_id';

  const { data: existing, error: getError } = await client
    .from('users')
    .select(selectColumns)
    .eq(authUserIdSupported ? 'auth_user_id' : 'google_id', authUserIdSupported ? user.id : googleId)
    .maybeSingle();

  if (getError) {
    throw new Error(`[RLS] Error leyendo perfil ${label}: ${getError.message}`);
  }

  if (existing) {
    const { data: updated, error: updateError } = await client
      .from('users')
      .update({
        email: profileEmail,
        name: profileName,
        google_id: googleId
      })
      .eq('id', existing.id)
      .select(selectColumns)
      .single();

    if (updateError) {
      throw new Error(`[RLS] Error actualizando perfil ${label}: ${updateError.message}`);
    }

    return updated;
  }

  const insertPayload = authUserIdSupported
    ? {
        auth_user_id: user.id,
        email: profileEmail,
        name: profileName,
        google_id: googleId
      }
    : {
        email: profileEmail,
        name: profileName,
        google_id: googleId
      };

  const { data: inserted, error: insertError } = await client
    .from('users')
    .insert(insertPayload)
    .select(selectColumns)
    .single();

  if (insertError) {
    throw new Error(`[RLS] Error creando perfil ${label}: ${insertError.message}`);
  }

  return inserted;
};

const run = async () => {
  console.log('[RLS] Iniciando prueba de aislamiento A/B...');

  const credentialsA = await resolveTestCredentials('User A', userAEmail, userAPassword);
  const credentialsB = await resolveTestCredentials('User B', userBEmail, userBPassword);

  console.log('[RLS] Credenciales listas:', {
    userA: credentialsA.source,
    userB: credentialsB.source
  });

  const actorA = await signIn(credentialsA.email, credentialsA.password, 'User A');
  const actorB = await signIn(credentialsB.email, credentialsB.password, 'User B');

  try {
    const profileA = await ensureProfile(actorA.client, actorA.user, 'User A');
    const profileB = await ensureProfile(actorB.client, actorB.user, 'User B');

    console.log('[RLS] Perfiles listos:', {
      userA: profileA.id,
      userB: profileB.id
    });

    const sharedEmailId = `rls-${Date.now()}-${randomUUID()}`;
    const foreignEmailId = `rls-cross-${Date.now()}-${randomUUID()}`;

    const { error: insertAError } = await actorA.client
      .from('events')
      .insert({
        user_id: profileA.id,
        amount: 123.45,
        direction: 'expense',
        category: 'service',
        date: new Date().toISOString().slice(0, 10),
        source: 'RLS Suite',
        description: 'Evento control de aislamiento',
        email_id: sharedEmailId
      });

    if (insertAError) {
      throw new Error(`[RLS] User A no pudo crear su evento: ${insertAError.message}`);
    }

    const { data: ownRead, error: ownReadError } = await actorA.client
      .from('events')
      .select('id')
      .eq('email_id', sharedEmailId);

    if (ownReadError) {
      throw new Error(`[RLS] User A no pudo leer su evento: ${ownReadError.message}`);
    }

    if (!ownRead || ownRead.length === 0) {
      throw new Error('[RLS] User A no encontró su evento recién creado');
    }

    const { data: foreignRead, error: foreignReadError } = await actorB.client
      .from('events')
      .select('id')
      .eq('email_id', sharedEmailId);

    if (foreignReadError) {
      throw new Error(`[RLS] Lectura cruzada devolvió error inesperado: ${foreignReadError.message}`);
    }

    if (foreignRead && foreignRead.length > 0) {
      throw new Error('[RLS] User B pudo leer datos de User A (violación de aislamiento)');
    }

    const { error: crossInsertError } = await actorB.client
      .from('events')
      .insert({
        user_id: profileA.id,
        amount: 9.99,
        direction: 'expense',
        category: 'service',
        date: new Date().toISOString().slice(0, 10),
        source: 'RLS Suite',
        description: 'Intento de escritura cruzada',
        email_id: foreignEmailId
      });

    if (!crossInsertError) {
      throw new Error('[RLS] User B pudo escribir sobre user_id de User A (violación de RLS)');
    }

    const { error: cleanupError } = await actorA.client
      .from('events')
      .delete()
      .eq('email_id', sharedEmailId);

    if (cleanupError) {
      throw new Error(`[RLS] No se pudo limpiar evento de prueba: ${cleanupError.message}`);
    }

    console.log('[RLS] OK: User A no filtra datos a User B y escrituras cruzadas están bloqueadas.');
  } finally {
    await actorA.client.auth.signOut();
    await actorB.client.auth.signOut();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
