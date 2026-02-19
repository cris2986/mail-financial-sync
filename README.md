# Mail Financial Sync

Aplicación web para sincronizar eventos financieros reales desde Gmail y mostrar un resumen mensual.

## 🚀 Demo en Producción

**[https://mail-financial-sync.vercel.app](https://mail-financial-sync.vercel.app)**

## ✨ Características

- 🔐 **Autenticación Gmail OAuth**: Conexión segura con Google Identity Services
- 📧 **Scanning Inteligente**: Detección automática de transacciones financieras
- 📊 **Dashboard Interactivo**: Visualización mensual de ingresos y gastos
- 🏷️ **Categorización**: Clasificación automática por tipo de transacción
- 📱 **PWA Ready**: Instalable como aplicación móvil
- 🔔 **Notificaciones**: Alertas de nuevos movimientos
- ☁️ **Sync en la Nube**: Persistencia opcional con Supabase
- 🌙 **Modo Oscuro**: Interfaz adaptable

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS + Material Icons
- **Estado**: Zustand con persistencia
- **APIs**: Gmail API + Google OAuth 2.0
- **Backend**: Supabase (opcional)
- **PWA**: Service Worker + Web App Manifest
- **Testing**: Vitest + Testing Library

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` desde `.env.example`:

```bash
# Google OAuth (obligatorio)
VITE_GOOGLE_CLIENT_ID=tu_google_client_id

# Supabase (opcional - para persistencia en la nube)
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_SUPABASE_SYNC_ENABLED=false
```

### Google Cloud Console

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita **Gmail API**
3. Crea **OAuth 2.0 Client ID**
4. Configura los URIs autorizados:
   - **Development**: `http://localhost:3002/auth/callback`
   - **Production**: `https://mail-financial-sync.vercel.app/auth/callback`

## 🚀 Deployment

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar pruebas
npm run test:run

# Build de producción
npm run build
```

### Deploy en Vercel

1. **Fork** este repositorio
2. **Conecta** tu cuenta de Vercel
3. **Importa** el proyecto desde GitHub
4. **Configura** las variables de entorno en Vercel:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_SUPABASE_URL` (opcional)
   - `VITE_SUPABASE_ANON_KEY` (opcional)
   - `VITE_SUPABASE_SYNC_ENABLED` (`true` para habilitar persistencia en nube)
5. **Deploy** automático

## 🧪 Testing

```bash
# Ejecutar todas las pruebas
npm run test:run

# Ejecutar pruebas específicas
npm run test:run -- --run store.test.ts
npm run test:run -- --run app.flow.test.ts
```

## 📱 PWA

La aplicación es una **Progressive Web App**:
- Instalable en dispositivos móviles
- Funciona offline (básico)
- Notificaciones push
- Icono adaptativo

## 🔒 Seguridad

- **Content Security Policy** configurada
- **OAuth 2.0** con scopes mínimos
- **`state` anti-CSRF** en OAuth redirect
- **No se persisten access tokens** en `localStorage`
- **No se registran tokens** en logs
- **HTTPS** obligatorio en producción

## 📄 Licencia

MIT License - ver archivo [LICENSE](LICENSE)

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch
3. Hacer commit de cambios
4. Abrir Pull Request

---

**Desarrollado con ❤️ para la gestión financiera personal**
