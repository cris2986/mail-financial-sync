import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalViewProps {
  type: 'TERMS' | 'PRIVACY' | 'DATA_USAGE';
}

export const LegalView: React.FC<LegalViewProps> = ({ type }) => {
  const navigate = useNavigate();

  const title = type === 'TERMS' ? "Términos de Servicio" : type === 'PRIVACY' ? "Política de Privacidad" : "Uso de Datos";

  return (
    <div className="bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-white h-full flex flex-col antialiased">
      <header className="sticky top-0 z-50 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 pt-4 safe-top">
        <div className="px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-primary active:scale-95"
          >
            <span className="material-icons-round text-2xl">chevron_left</span>
          </button>
          <h1 className="text-base font-semibold tracking-wide text-center absolute left-0 right-0 pointer-events-none">
            {title}
          </h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-6 pb-24 overflow-y-auto">

        {type === 'TERMS' && (
          <div className="space-y-8 text-center">
            <div className="mb-8">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Última actualización: Febrero 2024
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
                Por favor lee estos términos cuidadosamente antes de usar Mail Financial Sync. Al acceder o usar el Servicio, aceptas estos Términos.
              </p>
            </div>

            <section className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Alcance del Servicio</h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-7 max-w-sm mx-auto">
                Mail Financial Sync ("la App") es un visor automático diseñado para proporcionar visibilidad financiera extrayendo y agregando eventos de transacciones desde tu cuenta de Gmail.
              </p>
            </section>

            <section className="bg-primary/10 dark:bg-primary/5 border border-primary/20 rounded-xl p-5 relative overflow-hidden text-center">
              <span className="material-icons-round absolute -right-4 -top-4 text-8xl text-primary/5 pointer-events-none">gavel</span>
              <div className="relative z-10">
                <span className="material-icons-round text-primary text-xl mb-2 inline-block">info</span>
                <h2 className="text-base font-semibold text-primary mb-2">2. Sin Asesoría Financiera</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
                  <strong>Mail Financial Sync no es un banco.</strong><br /><br />
                  La información proporcionada por la App es solo para fines informativos. Siempre consulta con un profesional calificado para decisiones financieras.
                </p>
              </div>
            </section>

            <section className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Privacidad y Acceso a Datos</h2>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-base leading-7">
                <li><span className="text-gray-900 dark:text-white font-medium">No</span> vendemos tus datos personales.</li>
                <li>Procesamos datos localmente en tu dispositivo cuando es posible.</li>
                <li>Solo almacenamos información mínima necesaria para el funcionamiento.</li>
              </ul>
            </section>
          </div>
        )}

        {type === 'PRIVACY' && (
          <>
            <div className="mt-4 mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <span className="material-icons-round text-primary text-3xl">verified_user</span>
              </div>
              <h2 className="text-2xl font-bold mb-3 tracking-tight">Tu privacidad es primero.</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                Mail Financial Sync está diseñado para extraer números, no tu vida personal. Procesamos datos localmente cuando es posible.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 mb-4 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 mr-3">
                  <span className="material-icons-round text-green-500 text-xl">visibility</span>
                </div>
                <h3 className="font-semibold text-lg dark:text-white">Qué escaneamos</h3>
              </div>
              <ul className="space-y-4 inline-block text-left">
                <li className="flex items-start">
                  <span className="material-icons-round text-green-500 text-sm mt-1 mr-3">check_circle</span>
                  <div>
                    <p className="font-medium text-sm dark:text-gray-200">Notificaciones Financieras</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Correos automáticos de bancos y apps de pago.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-round text-green-500 text-sm mt-1 mr-3">check_circle</span>
                  <div>
                    <p className="font-medium text-sm dark:text-gray-200">Metadatos de Transacciones</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nombres de emisores, montos y fechas.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-2 rounded-lg bg-red-500/10 mr-3">
                  <span className="material-icons-round text-red-500 text-xl">block</span>
                </div>
                <h3 className="font-semibold text-lg dark:text-white">Qué NO almacenamos</h3>
              </div>
              <ul className="space-y-4 inline-block text-left">
                <li className="flex items-start opacity-80">
                  <span className="material-icons-round text-red-500 text-sm mt-1 mr-3">cancel</span>
                  <div>
                    <p className="font-medium text-sm dark:text-gray-200">Conversaciones Personales</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Correos de amigos, familia o trabajo.</p>
                  </div>
                </li>
                <li className="flex items-start opacity-80">
                  <span className="material-icons-round text-red-500 text-sm mt-1 mr-3">cancel</span>
                  <div>
                    <p className="font-medium text-sm dark:text-gray-200">Contenido Completo de Correos</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Solo extraemos datos financieros específicos.</p>
                  </div>
                </li>
              </ul>
            </div>
          </>
        )}

        {type === 'DATA_USAGE' && (
          <>
            <div className="mb-10 text-center">
              <div className="mx-auto w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-primary/30">
                <span className="material-icons-round text-primary text-4xl">sync_lock</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Cómo manejamos tus datos</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                La transparencia es clave. Aquí hay un desglose simplificado de lo que Mail Financial Sync accede y por qué.
              </p>
            </div>

            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <span className="material-icons-round text-primary text-2xl">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Detección Automática</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug max-w-xs mx-auto">
                    Nuestro algoritmo escanea estrictamente correos de transacciones (recibos, facturas), ignorando completamente conversaciones personales.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <span className="material-icons-round text-primary text-2xl">visibility_off</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Visibilidad Parcial</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug max-w-xs mx-auto">
                    Solo extraemos nombres de comercios y montos. Nunca vemos ni almacenamos tus credenciales o contraseñas.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-center">
              <span className="material-icons-round text-primary text-lg mb-2 inline-block">info</span>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-primary block mb-1">Caché Temporal</span>
                Tus datos se almacenan temporalmente solo para la vista del mes actual y se purgan automáticamente al inicio del siguiente ciclo.
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
};
