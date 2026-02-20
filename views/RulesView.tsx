import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, categoryLabels } from '../store';
import { EmailRule, EventCategory, ScanSettings } from '../types';

export const RulesView: React.FC = () => {
  const navigate = useNavigate();
  const scanSettings = useAppStore((state) => state.scanSettings);
  const addRule = useAppStore((state) => state.addRule);
  const removeRule = useAppStore((state) => state.removeRule);
  const toggleRule = useAppStore((state) => state.toggleRule);
  const setUseDefaultSenders = useAppStore((state) => state.setUseDefaultSenders);
  const setDaysToScan = useAppStore((state) => state.setDaysToScan);
  const toggleCategory = useAppStore((state) => state.toggleCategory);
  const syncEvents = useAppStore((state) => state.syncEvents);
  const syncStatus = useAppStore((state) => state.syncStatus);

  const isSyncing = syncStatus === 'syncing';

  const [newSender, setNewSender] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newExcludedSender, setNewExcludedSender] = useState('');
  const [newExcludedKeyword, setNewExcludedKeyword] = useState('');
  const [newExcludedSubject, setNewExcludedSubject] = useState('');
  const [showAddSender, setShowAddSender] = useState(false);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [showAddExcludedSender, setShowAddExcludedSender] = useState(false);
  const [showAddExcludedKeyword, setShowAddExcludedKeyword] = useState(false);
  const [showAddExcludedSubject, setShowAddExcludedSubject] = useState(false);
  const [senderError, setSenderError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [excludedSenderError, setExcludedSenderError] = useState<string | null>(null);
  const [excludedKeywordError, setExcludedKeywordError] = useState<string | null>(null);
  const [excludedSubjectError, setExcludedSubjectError] = useState<string | null>(null);

  type RuleListKey = keyof Pick<
    ScanSettings,
    'customSenders' | 'keywords' | 'excludedSenders' | 'excludedKeywords' | 'excludedSubjects'
  >;

  const addRuleWithValidation = (
    rawValue: string,
    type: EmailRule['type'],
    listKey: RuleListKey,
    duplicateMessage: string,
    onAdded: () => void,
    setError: (value: string | null) => void
  ) => {
    const value = rawValue.trim().toLowerCase();
    if (!value) {
      return;
    }

    const isDuplicate = scanSettings[listKey].some((rule) => rule.value.toLowerCase() === value);
    if (isDuplicate) {
      setError(duplicateMessage);
      return;
    }

    addRule(type, rawValue);
    onAdded();
    setError(null);
  };

  const handleAddSender = () => {
    addRuleWithValidation(
      newSender,
      'sender',
      'customSenders',
      'Este emisor ya existe',
      () => {
        setNewSender('');
        setShowAddSender(false);
      },
      setSenderError
    );
  };

  const handleAddKeyword = () => {
    addRuleWithValidation(
      newKeyword,
      'keyword',
      'keywords',
      'Esta palabra clave ya existe',
      () => {
        setNewKeyword('');
        setShowAddKeyword(false);
      },
      setKeywordError
    );
  };

  const handleAddExcludedSender = () => {
    addRuleWithValidation(
      newExcludedSender,
      'excluded_sender',
      'excludedSenders',
      'Este emisor bloqueado ya existe',
      () => {
        setNewExcludedSender('');
        setShowAddExcludedSender(false);
      },
      setExcludedSenderError
    );
  };

  const handleAddExcludedKeyword = () => {
    addRuleWithValidation(
      newExcludedKeyword,
      'excluded_keyword',
      'excludedKeywords',
      'Esta palabra bloqueada ya existe',
      () => {
        setNewExcludedKeyword('');
        setShowAddExcludedKeyword(false);
      },
      setExcludedKeywordError
    );
  };

  const handleAddExcludedSubject = () => {
    addRuleWithValidation(
      newExcludedSubject,
      'excluded_subject',
      'excludedSubjects',
      'Este asunto bloqueado ya existe',
      () => {
        setNewExcludedSubject('');
        setShowAddExcludedSubject(false);
      },
      setExcludedSubjectError
    );
  };

  const handleSyncNow = async () => {
    await syncEvents();
    navigate('/dashboard');
  };

  const allCategories: EventCategory[] = ['card', 'credit', 'service', 'transfer', 'income'];

  const categoryIcons: Record<EventCategory, string> = {
    card: 'credit_card',
    credit: 'account_balance',
    service: 'receipt_long',
    transfer: 'swap_horiz',
    income: 'payments'
  };

  return (
    <div className="h-full flex flex-col bg-bg-light dark:bg-bg-dark">
      <header className="sticky top-0 z-50 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 px-6 safe-top">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-primary"
          >
            <span className="material-icons-round text-2xl">arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold text-center flex-1 pr-8 text-gray-900 dark:text-white">Reglas de Escaneo</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8 overflow-y-auto pb-24">
        {/* Sección Emisores Predeterminados */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Emisores</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <span className="material-icons-round text-lg">business</span>
                </div>
                <div>
                  <span className="text-base font-medium text-gray-900 dark:text-white block">Bancos y Servicios Chilenos</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Transbank, BancoEstado, Enel, etc.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUseDefaultSenders(!scanSettings.useDefaultSenders)}
                aria-label="Usar emisores predeterminados"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${scanSettings.useDefaultSenders ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`${scanSettings.useDefaultSenders ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Incluye bancos chilenos (Banco de Chile, BCI, Santander, etc.), servicios (Enel, Aguas Andinas) y fintech (Transbank, Mercado Pago).
          </p>
        </section>

        {/* Sección Emisores Personalizados */}
        <section className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Emisores Personalizados</h2>
            <button
              type="button"
              onClick={() => setShowAddSender(true)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              <span className="material-icons-round text-lg">add</span>
              Agregar
            </button>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {showAddSender && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSender}
                    onChange={(e) => { setNewSender(e.target.value); setSenderError(null); }}
                    placeholder="ej: mi-banco.cl"
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border ${senderError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50`}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSender()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddSender}
                    className="p-2 rounded-lg bg-primary text-white"
                  >
                    <span className="material-icons-round text-lg">check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddSender(false); setNewSender(''); setSenderError(null); }}
                    className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    <span className="material-icons-round text-lg">close</span>
                  </button>
                </div>
                {senderError && showAddSender && (
                  <p className="text-xs text-red-500 mt-1">{senderError}</p>
                )}
              </div>
            )}

            {scanSettings.customSenders.length === 0 && !showAddSender ? (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                <span className="material-icons-round text-3xl mb-2 block opacity-50">mail_outline</span>
                <p className="text-sm">No hay emisores personalizados</p>
              </div>
            ) : (
              scanSettings.customSenders.map((rule) => (
                <RuleItem
                  key={rule.id}
                  rule={rule}
                  onToggle={() => toggleRule(rule.id)}
                  onRemove={() => removeRule(rule.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Sección Palabras Clave */}
        <section className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Palabras Clave</h2>
            <button
              type="button"
              onClick={() => setShowAddKeyword(true)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              <span className="material-icons-round text-lg">add</span>
              Agregar
            </button>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {showAddKeyword && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => { setNewKeyword(e.target.value); setKeywordError(null); }}
                    placeholder="ej: factura, cobro"
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border ${keywordError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50`}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="p-2 rounded-lg bg-primary text-white"
                  >
                    <span className="material-icons-round text-lg">check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddKeyword(false); setNewKeyword(''); setKeywordError(null); }}
                    className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    <span className="material-icons-round text-lg">close</span>
                  </button>
                </div>
                {keywordError && showAddKeyword && (
                  <p className="text-xs text-red-500 mt-1">{keywordError}</p>
                )}
              </div>
            )}

            {scanSettings.keywords.length === 0 && !showAddKeyword ? (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                <span className="material-icons-round text-3xl mb-2 block opacity-50">search</span>
                <p className="text-sm">No hay palabras clave personalizadas</p>
              </div>
            ) : (
              scanSettings.keywords.map((rule) => (
                <RuleItem
                  key={rule.id}
                  rule={rule}
                  onToggle={() => toggleRule(rule.id)}
                  onRemove={() => removeRule(rule.id)}
                />
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Busca estos términos en el asunto y cuerpo de los correos para detectar transacciones.
          </p>
        </section>

        {/* Sección Reglas de Bloqueo */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Bloqueos (Reglas Inversas)</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Emisores Bloqueados</h3>
                <button
                  type="button"
                  onClick={() => setShowAddExcludedSender(true)}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  <span className="material-icons-round text-lg">add</span>
                  Agregar
                </button>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {showAddExcludedSender && (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newExcludedSender}
                        onChange={(e) => { setNewExcludedSender(e.target.value); setExcludedSenderError(null); }}
                        placeholder="ej: promociones@santander.cl"
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border ${excludedSenderError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedSender()}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddExcludedSender}
                        className="p-2 rounded-lg bg-primary text-white"
                      >
                        <span className="material-icons-round text-lg">check</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddExcludedSender(false); setNewExcludedSender(''); setExcludedSenderError(null); }}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        <span className="material-icons-round text-lg">close</span>
                      </button>
                    </div>
                    {excludedSenderError && showAddExcludedSender && (
                      <p className="text-xs text-red-500 mt-1">{excludedSenderError}</p>
                    )}
                  </div>
                )}

                {scanSettings.excludedSenders.length === 0 && !showAddExcludedSender ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    <span className="material-icons-round text-3xl mb-2 block opacity-50">block</span>
                    <p className="text-sm">No hay emisores bloqueados</p>
                  </div>
                ) : (
                  scanSettings.excludedSenders.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      onToggle={() => toggleRule(rule.id)}
                      onRemove={() => removeRule(rule.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Asuntos Bloqueados</h3>
                <button
                  type="button"
                  onClick={() => setShowAddExcludedSubject(true)}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  <span className="material-icons-round text-lg">add</span>
                  Agregar
                </button>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {showAddExcludedSubject && (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newExcludedSubject}
                        onChange={(e) => { setNewExcludedSubject(e.target.value); setExcludedSubjectError(null); }}
                        placeholder="ej: tenemos el mejor regalo para tu hijo"
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border ${excludedSubjectError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedSubject()}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddExcludedSubject}
                        className="p-2 rounded-lg bg-primary text-white"
                      >
                        <span className="material-icons-round text-lg">check</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddExcludedSubject(false); setNewExcludedSubject(''); setExcludedSubjectError(null); }}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        <span className="material-icons-round text-lg">close</span>
                      </button>
                    </div>
                    {excludedSubjectError && showAddExcludedSubject && (
                      <p className="text-xs text-red-500 mt-1">{excludedSubjectError}</p>
                    )}
                  </div>
                )}

                {scanSettings.excludedSubjects.length === 0 && !showAddExcludedSubject ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    <span className="material-icons-round text-3xl mb-2 block opacity-50">subject</span>
                    <p className="text-sm">No hay asuntos bloqueados</p>
                  </div>
                ) : (
                  scanSettings.excludedSubjects.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      onToggle={() => toggleRule(rule.id)}
                      onRemove={() => removeRule(rule.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Palabras Bloqueadas</h3>
                <button
                  type="button"
                  onClick={() => setShowAddExcludedKeyword(true)}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  <span className="material-icons-round text-lg">add</span>
                  Agregar
                </button>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {showAddExcludedKeyword && (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newExcludedKeyword}
                        onChange={(e) => { setNewExcludedKeyword(e.target.value); setExcludedKeywordError(null); }}
                        placeholder="ej: preaprobado, promoción"
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border ${excludedKeywordError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedKeyword()}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddExcludedKeyword}
                        className="p-2 rounded-lg bg-primary text-white"
                      >
                        <span className="material-icons-round text-lg">check</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddExcludedKeyword(false); setNewExcludedKeyword(''); setExcludedKeywordError(null); }}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        <span className="material-icons-round text-lg">close</span>
                      </button>
                    </div>
                    {excludedKeywordError && showAddExcludedKeyword && (
                      <p className="text-xs text-red-500 mt-1">{excludedKeywordError}</p>
                    )}
                  </div>
                )}

                {scanSettings.excludedKeywords.length === 0 && !showAddExcludedKeyword ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    <span className="material-icons-round text-3xl mb-2 block opacity-50">gpp_bad</span>
                    <p className="text-sm">No hay palabras bloqueadas</p>
                  </div>
                ) : (
                  scanSettings.excludedKeywords.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      onToggle={() => toggleRule(rule.id)}
                      onRemove={() => removeRule(rule.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-2 leading-relaxed">
            Estas reglas excluyen correos antes del análisis para evitar promociones, campañas y otros falsos positivos.
          </p>
        </section>

        {/* Sección Período de Búsqueda */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Período</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <span className="material-icons-round text-lg">date_range</span>
                  </div>
                  <span className="text-base font-medium text-gray-900 dark:text-white">Días a escanear</span>
                </div>
                <span className="text-lg font-semibold text-primary">{scanSettings.daysToScan}</span>
              </div>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={scanSettings.daysToScan}
                onChange={(e) => setDaysToScan(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>7 días</span>
                <span>1 año</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sección Categorías */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Categorías a Detectar</h2>
          <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {allCategories.map((category) => {
              const isEnabled = scanSettings.enabledCategories.includes(category);
              return (
                <div key={category} className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      <span className="material-icons-round text-lg">{categoryIcons[category]}</span>
                    </div>
                    <span className={`text-base font-medium ${isEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      {categoryLabels[category]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    aria-label={`Alternar categoría ${categoryLabels[category]}`}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <span className={`${isEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Botón Sincronizar */}
        <section className="pt-4">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className={`w-full py-4 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              isSyncing
                ? 'bg-primary/70 cursor-not-allowed'
                : 'bg-primary active:bg-primary-dark'
            }`}
          >
            <span className={`material-icons-round ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            {isSyncing ? 'Sincronizando...' : 'Aplicar y Sincronizar'}
          </button>
        </section>
      </main>
    </div>
  );
};

// Componente para cada regla
const RuleItem: React.FC<{
  rule: EmailRule;
  onToggle: () => void;
  onRemove: () => void;
}> = ({ rule, onToggle, onRemove }) => {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            rule.enabled
              ? 'bg-primary border-primary text-white'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {rule.enabled && <span className="material-icons-round text-sm">check</span>}
        </button>
        <span className={`text-sm truncate ${rule.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
          {rule.value}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
      >
        <span className="material-icons-round text-lg">delete_outline</span>
      </button>
    </div>
  );
};
