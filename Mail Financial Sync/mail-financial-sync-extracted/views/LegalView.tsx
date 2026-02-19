import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalViewProps {
  type: 'TERMS' | 'PRIVACY' | 'DATA_USAGE';
}

export const LegalView: React.FC<LegalViewProps> = ({ type }) => {
  const navigate = useNavigate();
  
  const title = type === 'TERMS' ? "Terms of Service" : type === 'PRIVACY' ? "Privacy Policy" : "Data Usage Agreement";

  return (
    <div className="bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-white h-full flex flex-col antialiased">
       <header className="sticky top-0 z-50 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 pt-12">
        <div className="px-4 h-14 flex items-center justify-between">
          <button 
            aria-label="Go back"
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
        {/* Render Content based on Type */}
        
        {type === 'TERMS' && (
          <div className="space-y-8">
            <div className="mb-8">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Updated: October 24, 2023
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Please read these terms carefully before using Mail Financial Sync. By accessing or using the Service, you agree to be bound by these Terms.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Scope of Service</h2>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-7">
                Mail Financial Sync ("the App") is an automated viewer designed to provide financial visibility by extracting and aggregating transaction events from your Gmail account.
              </p>
            </section>

            <section className="bg-primary/10 dark:bg-primary/5 border border-primary/20 rounded-xl p-5 relative overflow-hidden">
              <span className="material-icons-round absolute -right-4 -top-4 text-8xl text-primary/5 pointer-events-none">gavel</span>
              <div className="flex items-start gap-3 relative z-10">
                <span className="material-icons-round text-primary text-xl mt-0.5 shrink-0">info</span>
                <div>
                  <h2 className="text-base font-semibold text-primary mb-2">2. No Financial Advice</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <strong>Mail Financial Sync is not a bank.</strong><br/><br/>
                    The information provided by the App is for informational purposes only. Always consult with a qualified professional for financial decisions.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Data Privacy & Access</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400 text-base leading-7 marker:text-primary">
                <li>We do <span className="text-gray-900 dark:text-white font-medium">not</span> sell your personal data.</li>
                <li>We process data locally on your device wherever possible.</li>
              </ul>
            </section>
          </div>
        )}

        {type === 'PRIVACY' && (
           <>
            <div className="mt-4 mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <span className="material-icons text-primary text-3xl">verified_user</span>
              </div>
              <h2 className="text-2xl font-bold mb-3 tracking-tight">Your privacy comes first.</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                Mail Financial Sync is built to extract numbers, not your personal life. We process data locally whenever possible.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 mb-4 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
               <div className="flex items-center mb-4">
                 <div className="p-2 rounded-lg bg-green-500/10 mr-3">
                   <span className="material-icons text-green-500 text-xl">visibility</span>
                 </div>
                 <h3 className="font-semibold text-lg dark:text-white">What we scan</h3>
               </div>
               <ul className="space-y-4">
                 <li className="flex items-start">
                   <span className="material-icons text-green-500 text-sm mt-1 mr-3">check_circle</span>
                   <div>
                     <p className="font-medium text-sm dark:text-gray-200">Financial Notifications</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automated emails from banks and payment apps.</p>
                   </div>
                 </li>
                 <li className="flex items-start">
                   <span className="material-icons text-green-500 text-sm mt-1 mr-3">check_circle</span>
                   <div>
                     <p className="font-medium text-sm dark:text-gray-200">Transaction Metadata</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sender names, amounts, and dates.</p>
                   </div>
                 </li>
               </ul>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
               <div className="flex items-center mb-4">
                 <div className="p-2 rounded-lg bg-red-500/10 mr-3">
                   <span className="material-icons text-red-500 text-xl">block</span>
                 </div>
                 <h3 className="font-semibold text-lg dark:text-white">What we don't store</h3>
               </div>
               <ul className="space-y-4">
                 <li className="flex items-start opacity-80">
                   <span className="material-icons text-red-500 text-sm mt-1 mr-3">cancel</span>
                   <div>
                     <p className="font-medium text-sm dark:text-gray-200">Personal Conversations</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Emails from friends, family, or work.</p>
                   </div>
                 </li>
               </ul>
            </div>
           </>
        )}

        {type === 'DATA_USAGE' && (
          // Data Usage Agreement
          <>
            <div className="mb-10 text-center">
              <div className="mx-auto w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-primary/30">
                <span className="material-icons-round text-primary text-4xl">sync_lock</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">How we handle your data</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                Transparency is key. Here is a simplified breakdown of what Mail Financial Sync accesses and why.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <span className="material-icons-round text-primary text-2xl">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Automatic Detection</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                    Our algorithm scans strictly for transaction emails (receipts, invoices), completely ignoring personal conversations.
                  </p>
                </div>
              </div>
               <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <span className="material-icons-round text-primary text-2xl">visibility_off</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Partial Visibility</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                    We only extract merchant names and amounts. We never see or store your login credentials or passwords.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-start gap-3">
              <span className="material-icons-round text-primary mt-0.5 text-lg">info</span>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-primary block mb-1">Temporary Cache</span>
                Your data is cached temporarily only for the current month's view and is purged automatically at the start of the next cycle.
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
};
