# Mail Financial Sync

Aplicación web para sincronizar eventos financieros reales desde Gmail y mostrar un resumen mensual.

## Requisitos

- Node.js 18+
- `VITE_GOOGLE_CLIENT_ID` configurado

## Desarrollo local

1. Instala dependencias:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Crea `.env` desde `.env.example` y completa:
   - `VITE_GOOGLE_CLIENT_ID` (obligatorio)
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (opcionales)
3. Ejecuta:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` inicia entorno local
- `npm run test:run` ejecuta pruebas unitarias y de flujo
- `npm run build` genera build de producción
- `npm run check` ejecuta pruebas + build

## Notas

- No existe modo demo ni acceso de invitado.
- La conexión requiere autenticación real con Gmail.
- Supabase es opcional; si no está configurado, los datos permanecen en almacenamiento local.
- Incluye manifest y service worker para instalación como PWA.
- Incluye notificaciones del navegador para nuevos movimientos (al habilitarlas en Ajustes).
