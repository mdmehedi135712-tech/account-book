
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';

// Type Definitions
enum TransactionType {
  CREDIT = 'credit',
  PAYMENT = 'payment',
}

interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
}

interface Customer {
  id:string;
  name: string;
  phone: string;
  address: string;
  website?: string;
}

// --- Data Service (LocalStorage) ---
const dataService = {
  getCustomers: (): Customer[] => JSON.parse(localStorage.getItem('customers') || '[]'),
  saveCustomers: (customers: Customer[]) => localStorage.setItem('customers', JSON.stringify(customers)),
  getTransactions: (): Transaction[] => JSON.parse(localStorage.getItem('transactions') || '[]'),
  saveTransactions: (transactions: Transaction[]) => localStorage.setItem('transactions', JSON.stringify(transactions)),
};

// --- SVG Icons ---
const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
);


// --- Components ---

const Header: React.FC<{
    title: string;
    onBack?: () => void;
    showSummaryButton?: boolean;
    onSummaryClick?: () => void;
    showCurrencySelector?: boolean;
    currency?: string;
    onCurrencyChange?: (currency: string) => void;
}> = ({ title, onBack, showSummaryButton, onSummaryClick, showCurrencySelector, currency, onCurrencyChange }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const theme = localStorage.getItem('theme');
        return theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);
    
    const currencies = [
        { code: 'AUD', name: 'Australian Dollar' },
        { code: 'BDT', name: 'Bangladeshi Taka' },
        { code: 'CAD', name: 'Canadian Dollar' },
        { code: 'CHF', name: 'Swiss Franc' },
        { code: 'CNY', name: 'Chinese Yuan' },
        { code: 'EUR', name: 'Euro' },
        { code: 'GBP', name: 'British Pound' },
        { code: 'INR', name: 'Indian Rupee' },
        { code: 'JPY', name: 'Japanese Yen' },
        { code: 'USD', name: 'US Dollar' },
    ].sort((a, b) => a.code.localeCompare(b.code));


    return (
        <header className="sticky top-0 z-10 p-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
                {onBack && (
                    <button onClick={onBack} className="text-white/80 hover:text-white">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                )}
                <h1 className="text-xl font-bold">{title}</h1>
            </div>
            <div className="flex items-center space-x-2">
                 {showSummaryButton && (
                    <button onClick={onSummaryClick} className="text-sm bg-white/20 text-white px-3 py-1.5 rounded-md hover:bg-white/30 transition-colors">
                        Summary
                    </button>
                )}
                {showCurrencySelector && onCurrencyChange && (
                    <div className="w-24">
                         <select
                            value={currency}
                            onChange={(e) => onCurrencyChange(e.target.value)}
                            className="bg-white/20 border border-white/30 text-white text-sm rounded-lg focus:ring-primary-300 focus:border-primary-300 block w-full p-2"
                            aria-label="Select currency"
                        >
                            {currencies.map(c => <option className="text-black" key={c.code} value={c.code}>{c.code}</option>)}
                        </select>
                    </div>
                 )}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/20">
                    {isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-300" /> : <MoonIcon className="w-6 h-6 text-white" />}
                </button>
            </div>
        </header>
    );
};

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="p-4 rounded-2xl shadow-lg bg-white dark:bg-gray-800 text-center">
        <p className="text-4xl font-bold text-primary-800 dark:text-white">{value}</p>
        <h3 className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{title}</h3>
    </div>
);


const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const colors = [
        'bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 
        'bg-indigo-500', 'bg-pink-500', 'bg-purple-500', 'bg-orange-500'
    ];
    const color = colors[initial.charCodeAt(0) % colors.length];
    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${color} ${className}`}>
            {initial}
        </div>
    );
};


// --- App Logic ---
const App: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>(dataService.getCustomers());
    const [transactions, setTransactions] = useState<Transaction[]>(dataService.getTransactions());
    const [currentPage, setCurrentPage] = useState<'home' | 'customerDetails' | 'summary'>('home');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currency, setCurrency] = useState<string>(() => localStorage.getItem('currency') || 'BDT');
    
    // Modals state
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.CREDIT);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderMessage, setReminderMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);


    useEffect(() => {
        dataService.saveCustomers(customers);
    }, [customers]);

    useEffect(() => {
        dataService.saveTransactions(transactions);
    }, [transactions]);
    
    useEffect(() => {
        localStorage.setItem('currency', currency);
    }, [currency]);

    const formatCurrency = useCallback((amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    }, [currency]);
    
    const generateReminderMessage = useCallback(async (customerName: string, dueAmount: number): Promise<string> => {
      if (!process.env.API_KEY) {
        return `Hi ${customerName}, this is a friendly reminder that you have an outstanding balance of ${formatCurrency(dueAmount)}. Please let us know if you have any questions. Thank you! (API Key not configured)`;
      }
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a short, friendly, and professional payment reminder SMS message for a customer named ${customerName} who owes ${formatCurrency(dueAmount)}. Keep it concise and polite.`,
        });
        return result.text;
      } catch (error) {
        console.error("Error generating reminder:", error);
        return `Error generating message. Please check your API key and network connection.`;
      }
    }, [formatCurrency]);


    const getCustomerDue = useCallback((customerId: string) => {
        return transactions
            .filter(t => t.customerId === customerId)
            .reduce((acc, t) => {
                if (t.type === TransactionType.CREDIT) return acc + t.amount;
                return acc - t.amount;
            }, 0);
    }, [transactions]);
    
    const totalDueAllCustomers = useMemo(() => {
        return customers.reduce((total, customer) => total + getCustomerDue(customer.id), 0);
    }, [customers, getCustomerDue]);

    const handleAddCustomer = (customerData: Omit<Customer, 'id'>, initialDue: number) => {
        const newCustomer = { ...customerData, id: Date.now().toString() };
        setCustomers(prev => [...prev, newCustomer]);
        if (initialDue > 0) {
            const newTransaction: Transaction = {
                id: Date.now().toString() + 't',
                customerId: newCustomer.id,
                type: TransactionType.CREDIT,
                amount: initialDue,
                date: new Date().toISOString().split('T')[0],
                description: 'Initial due',
            };
            setTransactions(prev => [...prev, newTransaction]);
        }
        setIsCustomerModalOpen(false);
        setEditingCustomer(null);
    };

    const handleUpdateCustomer = (customerData: Customer) => {
        setCustomers(prev => prev.map(c => c.id === customerData.id ? customerData : c));
        setIsCustomerModalOpen(false);
        setEditingCustomer(null);
    };

    const handleAddTransaction = (transactionData: Omit<Transaction, 'id' | 'customerId' | 'type'>) => {
        if (!selectedCustomerId) return;
        const newTransaction: Transaction = {
            ...transactionData,
            id: Date.now().toString(),
            customerId: selectedCustomerId,
            type: transactionType,
        };
        setTransactions(prev => [...prev, newTransaction]);
        setIsTransactionModalOpen(false);
    };
    
    const handleGenerateReminder = async () => {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if(!customer) return;

        const dueAmount = getCustomerDue(customer.id);
        if (dueAmount <= 0) {
            setReminderMessage("This customer has no outstanding balance.");
            setIsReminderModalOpen(true);
            return;
        }

        setIsGenerating(true);
        setIsReminderModalOpen(true);
        const message = await generateReminderMessage(customer.name, dueAmount);
        setReminderMessage(message);
        setIsGenerating(false);
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(reminderMessage);
        alert('Copied to clipboard!');
    };


    // --- View Components ---

    const CustomerForm: React.FC<{ 
        onSave: (customer: Omit<Customer, 'id'>, initialDue: number) => void;
        onUpdate: (customer: Customer) => void;
        customerToEdit: Customer | null 
    }> = ({ onSave, onUpdate, customerToEdit }) => {
        const [name, setName] = useState(customerToEdit?.name || '');
        const [phone, setPhone] = useState(customerToEdit?.phone || '');
        const [address, setAddress] = useState(customerToEdit?.address || '');
        const [website, setWebsite] = useState(customerToEdit?.website || '');
        const [initialDue, setInitialDue] = useState(0);
        const [error, setError] = useState('');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!name.trim()) {
                setError('Customer name is required.');
                return;
            }
            setError('');
            if (customerToEdit) {
                onUpdate({ id: customerToEdit.id, name, phone, address, website });
            } else {
                onSave({ name, phone, address, website }, initialDue);
            }
        };

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name*</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
                    <input type="url" placeholder="https://example.com" value={website} onChange={e => setWebsite(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                </div>
                {!customerToEdit && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Due</label>
                        <input type="number" value={initialDue} onChange={e => setInitialDue(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                    </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">{customerToEdit ? 'Update' : 'Save'}</button>
                </div>
            </form>
        );
    };

    const TransactionForm: React.FC<{ onSave: (data: Omit<Transaction, 'id' | 'customerId' | 'type'>) => void; type: TransactionType }> = ({ onSave, type }) => {
        const [amount, setAmount] = useState<number | ''>('');
        const [description, setDescription] = useState('');
        const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
        const [error, setError] = useState('');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!amount || amount <= 0) {
                setError('Please enter a valid amount.');
                return;
            }
            setError('');
            onSave({ amount, description, date });
        };

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount*</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} min="0.01" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date*</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" required />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className={`px-4 py-2 rounded-md text-sm font-medium text-white ${type === TransactionType.CREDIT ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>Add {type}</button>
                </div>
            </form>
        );
    };

    const HomeScreen = () => {
        const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
            <div className="flex flex-col h-screen">
                <Header 
                    title="Dashboard" 
                    showSummaryButton 
                    onSummaryClick={() => setCurrentPage('summary')}
                    showCurrencySelector={true}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                />
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard title="All Referrals" value={customers.length.toString()} />
                        <StatCard title="Today Referrals" value={"07"} />
                    </div>
                </div>

                <main className="flex-1 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 text-gray-800 dark:text-white">
                         <h2 className="text-lg font-semibold">New Referrals</h2>
                         <button className="text-primary-500 font-semibold text-sm">All Referrals</button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 mb-4 border rounded-md bg-gray-100 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    />
                    <div className="space-y-2">
                        {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
                            const due = getCustomerDue(customer.id);
                            return (
                                <div key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setCurrentPage('customerDetails'); }} className="p-2 rounded-lg flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <Avatar name={customer.name} />
                                    <div className="ml-3 flex-grow">
                                        <p className="font-semibold text-gray-800 dark:text-white">{customer.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">15 march 2019  1:49 PM</p>
                                    </div>
                                    <p className={`font-bold text-lg ${due > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {formatCurrency(due)}
                                    </p>
                                </div>
                            )
                        }) : (
                             <div className="text-center py-10">
                                 <p className="text-gray-500 dark:text-gray-400">No customers found.</p>
                                 <p className="text-gray-500 dark:text-gray-400 mt-2">Click the '+' button to add your first customer.</p>
                            </div>
                        )}
                    </div>
                </main>
                <button
                    onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }}
                    className="fixed bottom-6 right-6 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    aria-label="Add Customer"
                >
                    <PlusIcon className="h-6 w-6"/>
                </button>
            </div>
        );
    };

    const CustomerDetailsScreen = () => {
        const [activeTab, setActiveTab] = useState<'transactions' | 'info'>('transactions');
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) return <HomeScreen />;

        const customerTransactions = transactions
            .filter(t => t.customerId === selectedCustomerId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const due = getCustomerDue(customer.id);

        return (
            <div className="flex flex-col h-screen">
                <Header title={customer.name} onBack={() => setCurrentPage('home')} />
                <div className="p-4">
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Due</p>
                        <p className={`text-4xl font-bold ${due > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(due)}</p>
                    </div>
                </div>

                <main className="flex-1 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl p-4 overflow-y-auto pb-28">
                    <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('transactions')}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'transactions'
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Transactions
                            </button>
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'info'
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Information
                            </button>
                        </nav>
                    </div>

                    <div>
                        {activeTab === 'transactions' && (
                            <div className="space-y-3">
                                {customerTransactions.length > 0 ? customerTransactions.map(t => (
                                    <div key={t.id} className="dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className={`font-semibold ${t.type === TransactionType.CREDIT ? 'text-red-500' : 'text-green-500'}`}>
                                                {t.type === TransactionType.CREDIT ? '+' : '-'} {formatCurrency(t.amount)}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.description || t.type}</p>
                                        </div>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 rounded-lg">
                                        <p className="text-gray-500 dark:text-gray-400">No transactions yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'info' && (
                             <div className="p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Contact Details</h3>
                                     <button onClick={() => {setEditingCustomer(customer); setIsCustomerModalOpen(true);}} className="text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                                        Edit
                                    </button>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                    <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
                                    <p><strong>Address:</strong> {customer.address || 'N/A'}</p>
                                    <p><strong>Website:</strong> {customer.website ? <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">{customer.website}</a> : 'N/A'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
                <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t dark:border-gray-700 grid grid-cols-3 gap-2">
                    <button
                        onClick={() => { setTransactionType(TransactionType.CREDIT); setIsTransactionModalOpen(true); }}
                        className="w-full bg-red-500 text-white py-3 rounded-md shadow-md hover:bg-red-600 font-semibold"
                    >
                        Credit
                    </button>
                    <button
                        onClick={() => { setTransactionType(TransactionType.PAYMENT); setIsTransactionModalOpen(true); }}
                        className="w-full bg-green-500 text-white py-3 rounded-md shadow-md hover:bg-green-600 font-semibold"
                    >
                        Payment
                    </button>
                     <button
                        onClick={handleGenerateReminder}
                        className="w-full bg-blue-500 text-white py-3 rounded-md shadow-md hover:bg-blue-600 font-semibold"
                    >
                        Reminder
                    </button>
                </div>
            </div>
        );
    };
    
    const SummaryScreen = () => {
        const customersWithDue = customers
            .map(customer => ({
                ...customer,
                due: getCustomerDue(customer.id),
            }))
            .filter(customer => customer.due > 0)
            .sort((a, b) => b.due - a.due);
    
        return (
             <div className="flex flex-col h-screen">
                <Header title="Summary & Reports" onBack={() => setCurrentPage('home')} />
                <main className="flex-1 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl p-4 overflow-y-auto">
                   <div className="grid grid-cols-2 gap-4 mb-6">
                       <div className="p-4 rounded-2xl shadow-lg bg-gray-50 dark:bg-gray-800 text-center">
                           <p className="text-3xl font-bold text-red-500">{formatCurrency(totalDueAllCustomers)}</p>
                           <h3 className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Total Due</h3>
                       </div>
                        <div className="p-4 rounded-2xl shadow-lg bg-gray-50 dark:bg-gray-800 text-center">
                           <p className="text-3xl font-bold text-primary-800 dark:text-white">{customers.length}</p>
                           <h3 className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Total Customers</h3>
                       </div>
                  </div>
                  
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Due by Customer</h2>
                  
                   <div className="space-y-2">
                       {customersWithDue.length > 0 ? customersWithDue.map(customer => (
                           <div key={customer.id} className="p-2 rounded-lg flex items-center bg-gray-50 dark:bg-gray-800/50">
                               <Avatar name={customer.name} />
                               <div className="ml-3 flex-grow">
                                   <p className="font-semibold text-gray-800 dark:text-white">{customer.name}</p>
                               </div>
                               <p className="font-bold text-lg text-red-500">
                                   {formatCurrency(customer.due)}
                               </p>
                           </div>
                       )) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">No outstanding dues.</p>
                           </div>
                       )}
                   </div>
                </main>
            </div>
        )
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'customerDetails':
                return <CustomerDetailsScreen />;
            case 'summary':
                return <SummaryScreen />;
            case 'home':
            default:
                return <HomeScreen />;
        }
    };

    return (
        <div className="bg-gradient-to-b from-primary-500 to-primary-700 dark:from-primary-900 dark:to-primary-950 min-h-screen font-sans">
            {renderPage()}

            <Modal isOpen={isCustomerModalOpen} onClose={() => {setIsCustomerModalOpen(false); setEditingCustomer(null);}} title={editingCustomer ? "Edit Customer" : "Add New Customer"}>
                <CustomerForm 
                    onSave={handleAddCustomer}
                    onUpdate={handleUpdateCustomer}
                    customerToEdit={editingCustomer}
                />
            </Modal>
            
            <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title={`Add ${transactionType}`}>
                 <TransactionForm onSave={handleAddTransaction} type={transactionType} />
            </Modal>
            
            <Modal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} title="Payment Reminder">
                {isGenerating ? (
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        <p className="ml-4 text-gray-700 dark:text-gray-300">Generating message...</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reminderMessage}</p>
                        <div className="flex justify-end mt-4">
                            <button onClick={copyToClipboard} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Copy to Clipboard</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default App;
