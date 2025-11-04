
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
}

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// --- Data Service (LocalStorage) ---
const dataService = {
  getCustomers: (): Customer[] => JSON.parse(localStorage.getItem('customers') || '[]'),
  saveCustomers: (customers: Customer[]) => localStorage.setItem('customers', JSON.stringify(customers)),
  getTransactions: (): Transaction[] => JSON.parse(localStorage.getItem('transactions') || '[]'),
  saveTransactions: (transactions: Transaction[]) => localStorage.setItem('transactions', JSON.stringify(transactions)),
};

// --- Gemini Service ---
const generateReminderMessage = async (customerName: string, dueAmount: number): Promise<string> => {
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

const Header: React.FC<{ title: string; onBack?: () => void; showSummaryButton?: boolean; onSummaryClick?: () => void; }> = ({ title, onBack, showSummaryButton, onSummaryClick }) => {
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

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
                {onBack && (
                    <button onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                )}
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
            </div>
            <div className="flex items-center space-x-2">
                 {showSummaryButton && (
                    <button onClick={onSummaryClick} className="text-sm bg-primary-500 text-white px-3 py-1.5 rounded-md hover:bg-primary-600 transition-colors">
                        Summary
                    </button>
                )}
                <button onClick={toggleTheme} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                    {isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-gray-700" />}
                </button>
            </div>
        </header>
    );
};

const StatCard: React.FC<{ title: string; value: string; color: string }> = ({ title, value, color }) => (
    <div className={`p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 border-l-4 ${color}`}>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
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
                onUpdate({ id: customerToEdit.id, name, phone, address });
            } else {
                onSave({ name, phone, address }, initialDue);
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
            <div>
                <Header title="Business Due Manager" showSummaryButton onSummaryClick={() => setCurrentPage('summary')}/>
                <main className="p-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                        <h2 className="text-gray-500 dark:text-gray-400">Total Outstanding Dues</h2>
                        <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(totalDueAllCustomers)}</p>
                    </div>
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 mb-4 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <div className="space-y-3">
                        {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
                            const due = getCustomerDue(customer.id);
                            return (
                                <div key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setCurrentPage('customerDetails'); }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{customer.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                                    </div>
                                    <p className={`font-bold ${due > 0 ? 'text-red-500' : 'text-green-500'}`}>
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
            <div>
                <Header title={customer.name} onBack={() => setCurrentPage('home')} />
                <main className="p-4 pb-28">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Due</p>
                                <p className={`text-3xl font-bold ${due > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(due)}</p>
                            </div>
                        </div>
                    </div>

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
                                    <div key={t.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex justify-between items-center">
                                        <div>
                                            <p className={`font-semibold ${t.type === TransactionType.CREDIT ? 'text-red-500' : 'text-green-500'}`}>
                                                {t.type === TransactionType.CREDIT ? '+' : '-'} {formatCurrency(t.amount)}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.description || t.type}</p>
                                        </div>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                                        <p className="text-gray-500 dark:text-gray-400">No transactions yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'info' && (
                             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Contact Details</h3>
                                     <button onClick={() => {setEditingCustomer(customer); setIsCustomerModalOpen(true);}} className="text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                                        Edit Info
                                    </button>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                    <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
                                    <p><strong>Address:</strong> {customer.address || 'N/A'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 grid grid-cols-3 gap-2">
                    <button
                        onClick={() => { setTransactionType(TransactionType.CREDIT); setIsTransactionModalOpen(true); }}
                        className="w-full bg-red-500 text-white py-3 rounded-md shadow-md hover:bg-red-600"
                    >
                        Add Credit
                    </button>
                    <button
                        onClick={() => { setTransactionType(TransactionType.PAYMENT); setIsTransactionModalOpen(true); }}
                        className="w-full bg-green-500 text-white py-3 rounded-md shadow-md hover:bg-green-600"
                    >
                        Receive Payment
                    </button>
                     <button
                        onClick={handleGenerateReminder}
                        className="w-full bg-blue-500 text-white py-3 rounded-md shadow-md hover:bg-blue-600"
                    >
                        Gen. Reminder
                    </button>
                </div>
            </div>
        );
    };
    
    const SummaryScreen = () => {
        const [filterCustomerId, setFilterCustomerId] = useState('all');
        const [filterStartDate, setFilterStartDate] = useState('');
        const [filterEndDate, setFilterEndDate] = useState('');

        const { totalCredits, totalPayments } = useMemo(() => {
            const filteredTransactions = transactions.filter(t => {
                const transactionDate = new Date(t.date);
                if (filterCustomerId !== 'all' && t.customerId !== filterCustomerId) {
                    return false;
                }
                if (filterStartDate && transactionDate < new Date(filterStartDate)) {
                    return false;
                }
                // Add 1 day to end date to include the whole day
                if (filterEndDate) {
                    const endDate = new Date(filterEndDate);
                    endDate.setDate(endDate.getDate() + 1);
                    if (transactionDate > endDate) {
                        return false;
                    }
                }
                return true;
            });

            return filteredTransactions.reduce((acc, t) => {
                if (t.type === TransactionType.CREDIT) {
                    acc.totalCredits += t.amount;
                } else {
                    acc.totalPayments += t.amount;
                }
                return acc;
            }, { totalCredits: 0, totalPayments: 0 });
        }, [transactions, filterCustomerId, filterStartDate, filterEndDate]);
        
        const outstandingDues = totalCredits - totalPayments;

        const handleResetFilters = () => {
            setFilterCustomerId('all');
            setFilterStartDate('');
            setFilterEndDate('');
        };
        
        return (
            <div>
                <Header title="Summary & Reports" onBack={() => setCurrentPage('home')} />
                <main className="p-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="customer-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
                                <select 
                                    id="customer-filter" 
                                    value={filterCustomerId} 
                                    onChange={e => setFilterCustomerId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="all">All Customers</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                    <input type="date" id="start-date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                    <input type="date" id="end-date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={handleResetFilters} className="text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                                Reset Filters
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard title="Total Credits (Dues)" value={formatCurrency(totalCredits)} color="border-red-500" />
                        <StatCard title="Total Payments Received" value={formatCurrency(totalPayments)} color="border-green-500" />
                        <StatCard title="Total Outstanding Dues" value={formatCurrency(outstandingDues)} color="border-blue-500" />
                    </div>
                </main>
            </div>
        );
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
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans">
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
