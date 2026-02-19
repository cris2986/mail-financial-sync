# Mail Financial Sync - Guía de Configuración

## Requisitos Previos

- Node.js 18+ o Bun
- Cuenta de Google Cloud Platform
- Cuenta de Supabase (opcional, para persistencia remota)

## 1. Configuración de Google Cloud

### 1.1 Crear Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID**

### 1.2 Habilitar Gmail API

1. En el menú lateral, ve a **APIs & Services > Library**
2. Busca "Gmail API"
3. Haz clic en **Enable**

### 1.3 Configurar Pantalla de Consentimiento OAuth

1. Ve a **APIs & Services > OAuth consent screen**
2. Selecciona **External** (para pruebas) o **Internal** (si tienes Google Workspace)
3. Completa la información requerida:
   - App name: `Mail Financial Sync`
   - User support email: tu email
   - Developer contact: tu email
4. En **Scopes**, agrega:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. En **Test users**, agrega los emails que probarán la app

### 1.4 Crear Credenciales OAuth

1. Ve a **APIs & Services > Credentials**
2. Haz clic en **Create Credentials > OAuth client ID**
3. Selecciona **Web application**
4. Nombre: `Mail Financial Sync Web`
5. **Authorized JavaScript origins**:
   - `http://localhost:5173` (desarrollo)
   - `https://mail-financial-sync.vercel.app` (producción)
6. **Authorized redirect URIs**:
   - `http://localhost:5173/auth/callback` (desarrollo)
   - `https://mail-financial-sync.vercel.app/auth/callback` (producción)
7. Haz clic en **Create**
8. Guarda el **Client ID**

## 2. Configuración de Supabase

### 2.1 Crear Proyecto

1. Ve a [Supabase](https://app.supabase.com/)
2. Crea una nueva organización o usa una existente
3. Crea un nuevo proyecto
4. Espera a que se inicialice (~2 minutos)

### 2.2 Ejecutar Script de Base de Datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Copia el contenido de `supabase/schema.sql`
3. Pégalo en el editor y ejecuta

### 2.3 Obtener Credenciales

1. Ve a **Settings > API**
2. Copia:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key

## 3. Configuración del Proyecto

### 3.1 Crear archivo .env

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

Edita `.env`:

```env
# Google OAuth (obligatorio)
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=https://mail-financial-sync.vercel.app/auth/callback

# Supabase (opcional)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3.2 Instalar Dependencias

```bash
bun install
# o
npm install
```

### 3.3 Iniciar en Desarrollo

```bash
bun run dev
# o
npm run dev
```

## 4. Producción

### 4.1 Variables de Entorno en Vercel

En tu proyecto de Vercel, agrega las mismas variables de entorno:

1. Ve a **Settings > Environment Variables**
2. Agrega cada variable del `.env`
3. Usa `VITE_GOOGLE_REDIRECT_URI=https://mail-financial-sync.vercel.app/auth/callback`

### 4.2 Actualizar Google Cloud

En Google Cloud Console, agrega los orígenes y URIs de redirección de producción.

## Solución de Problemas

### "OAuth no configurado"
- Verifica que `VITE_GOOGLE_CLIENT_ID` esté definido

### "Error de autorización"
- Verifica que el email esté en la lista de Test Users de Google Cloud
- Verifica que los scopes estén habilitados

### "Error de Supabase"
- Verifica que la URL y anon key sean correctos
- Verifica que el schema SQL se haya ejecutado correctamente

## Arquitectura

```
Usuario → PWA → Google Identity Services → Gmail API → Supabase (opcional)
```

- **Frontend**: React + TypeScript + Vite + Zustand
- **Auth**: Google OAuth 2.0
- **API**: Gmail API (solo lectura)
- **DB**: Supabase (PostgreSQL)
- **Deploy**: Vercel
