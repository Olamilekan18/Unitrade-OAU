import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWalletDetails, updateBankDetails, requestWithdrawal, fetchBanks, resolveBankAccount } from '../utils/api';
import { FaWallet, FaUniversity, FaMoneyBillWave, FaSpinner, FaHistory, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';

function WalletPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState(null);
    const [error, setError] = useState('');

    // Bank Details Form State
    const [bankForm, setBankForm] = useState({ bankName: '', bankCode: '', accountNumber: '', accountName: '' });
    const [savingBank, setSavingBank] = useState(false);
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [banks, setBanks] = useState([]);
    const [resolvingName, setResolvingName] = useState(false);

    // Fetch banks when entering edit mode
    useEffect(() => {
        if (isEditingBank && banks.length === 0) {
            fetchBanks().then(res => {
                // Sort banks alphabetically
                setBanks(res.data.sort((a, b) => a.name.localeCompare(b.name)));
            }).catch(console.error);
        }
    }, [isEditingBank, banks.length]);

    // Auto-resolve account name when 10 digits and bank code exist
    useEffect(() => {
        if (bankForm.accountNumber?.length === 10 && bankForm.bankCode) {
            resolveName();
        }
    }, [bankForm.accountNumber, bankForm.bankCode]);

    async function resolveName() {
        try {
            setResolvingName(true);
            const res = await resolveBankAccount(bankForm.accountNumber, bankForm.bankCode);
            setBankForm(prev => ({ ...prev, accountName: res.data.accountName }));
        } catch (err) {
            setBankForm(prev => ({ ...prev, accountName: '' }));
        } finally {
            setResolvingName(false);
        }
    }

    // Withdrawal Form State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            loadWallet();
        }
    }, [authLoading, isAuthenticated]);

    async function loadWallet() {
        try {
            setLoading(true);
            const res = await fetchWalletDetails();
            setWalletData(res.data);
            if (res.data.bankDetails?.bankName) {
                setBankForm(res.data.bankDetails);
                setIsEditingBank(false);
            } else {
                setIsEditingBank(true);
            }
        } catch (err) {
            setError(err.message || 'Failed to load wallet details.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveBankDetails(e) {
        e.preventDefault();
        try {
            setSavingBank(true);
            const res = await updateBankDetails(bankForm);
            setWalletData((prev) => ({ ...prev, bankDetails: res.data }));
            setIsEditingBank(false);
            alert('Bank details updated successfully!');
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingBank(false);
        }
    }

    async function handleRequestWithdrawal(e) {
        e.preventDefault();
        const amount = Number(withdrawAmount);
        if (!amount || amount <= 0) return alert('Invalid amount');
        if (amount > walletData.availableBalance) return alert('Insufficient balance');

        try {
            setRequesting(true);
            const res = await requestWithdrawal(amount);

            // Optimistically update UI
            setWalletData((prev) => ({
                ...prev,
                availableBalance: prev.availableBalance - amount,
                recentWithdrawals: [res.data, ...prev.recentWithdrawals]
            }));
            setWithdrawAmount('');
            alert('Withdrawal requested successfully!');
        } catch (err) {
            alert(err.message);
        } finally {
            setRequesting(false);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="auth-page">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
                    <FaSpinner className="spinner" /> Loading wallet...
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: 900, marginTop: 'var(--space-8)' }}>
            <div className="fade-in-up" style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FaWallet style={{ color: 'var(--color-primary)' }} /> My Wallet
                </h1>
                <p style={{ color: 'var(--color-text-light)' }}>Manage your earnings and request payouts securely.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {walletData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
                    {/* Balances Card */}
                    <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #047857 100%)', color: 'white', padding: 'var(--space-6)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Available Balance</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>
                                    ₦{walletData.availableBalance.toLocaleString()}
                                </div>
                            </div>
                            <FaMoneyBillWave style={{ fontSize: '2rem', opacity: 0.5 }} />
                        </div>

                        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                            <h3 style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Pending Balance (In Escrow)</h3>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 'var(--space-1)' }}>
                                ₦{walletData.pendingBalance.toLocaleString()}
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7, marginTop: 'var(--space-1)' }}>
                                Funds will become available 24 hours after marking orders as shipped, or when buyers confirm delivery.
                            </p>
                        </div>
                    </div>

                    {/* Withdrawal Container */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        {/* Bank Details */}
                        <div className="card" style={{ padding: 'var(--space-6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FaUniversity style={{ color: 'var(--color-primary)' }} /> Bank Details
                                </h2>
                                {!isEditingBank && (
                                    <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setIsEditingBank(true)}>
                                        Edit
                                    </button>
                                )}
                            </div>

                            {isEditingBank ? (
                                <form onSubmit={handleSaveBankDetails} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <div>
                                        <label className="label">Bank Name</label>
                                        <select
                                            className="input"
                                            required
                                            value={bankForm.bankCode}
                                            onChange={(e) => {
                                                const selectedBank = banks.find(b => b.code === e.target.value);
                                                setBankForm({ ...bankForm, bankCode: e.target.value, bankName: selectedBank?.name || '' });
                                            }}
                                        >
                                            <option value="" disabled>Select a Bank</option>
                                            {banks.map(bank => (
                                                <option key={bank.code} value={bank.code}>{bank.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Account Number</label>
                                        <input className="input" required value={bankForm.accountNumber} maxLength="10" onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 0123456789" />
                                    </div>
                                    <div>
                                        <label className="label">Account Name {resolvingName && <FaSpinner className="spinner" style={{ marginLeft: 8, fontSize: '0.8rem' }} />}</label>
                                        <input className="input" required readOnly value={bankForm.accountName} placeholder={resolvingName ? "Resolving name..." : "Auto-filled account name"} style={{ backgroundColor: 'var(--color-gray-50)', color: 'var(--color-gray-700)' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-2)' }}>
                                        {walletData.bankDetails?.bankName && (
                                            <button type="button" className="btn btn-outline" onClick={() => { setBankForm(walletData.bankDetails); setIsEditingBank(false); }}>Cancel</button>
                                        )}
                                        <button type="submit" className="btn btn-primary" disabled={savingBank}>
                                            {savingBank ? <FaSpinner className="spinner" /> : 'Save Details'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <p style={{ margin: 0, fontWeight: 500 }}>{walletData.bankDetails.bankName}</p>
                                    <p style={{ margin: '4px 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>{walletData.bankDetails.accountNumber}</p>
                                    <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '0.9rem' }}>{walletData.bankDetails.accountName}</p>
                                </div>
                            )}
                        </div>

                        {/* Withdraw Funds */}
                        <div className="card" style={{ padding: 'var(--space-6)' }}>
                            <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>Request Withdrawal</h2>
                            <form onSubmit={handleRequestWithdrawal} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--color-gray-500)' }}>₦</span>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ paddingLeft: 36 }}
                                        placeholder="0.00"
                                        min="100"
                                        step="10"
                                        max={walletData.availableBalance}
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        required
                                        disabled={isEditingBank || !walletData.bankDetails?.bankName}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={requesting || isEditingBank || !walletData.bankDetails?.bankName || walletData.availableBalance === 0}>
                                    {requesting ? <FaSpinner className="spinner" /> : 'Withdraw'}
                                </button>
                            </form>
                            {(!walletData.bankDetails?.bankName && !isEditingBank) && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 'var(--space-2)' }}>Please add bank details first.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History Table */}
            {walletData && (
                <div className="card" style={{ marginTop: 'var(--space-8)', padding: 'var(--space-6)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
                        <FaHistory style={{ color: 'var(--color-primary)' }} /> Withdrawal History
                    </h2>

                    {walletData.recentWithdrawals.length === 0 ? (
                        <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--space-6)' }}>No past withdrawals found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-gray-200)' }}>
                                        <th style={{ padding: '12px 16px', color: 'var(--color-gray-500)', fontWeight: 600 }}>Date</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--color-gray-500)', fontWeight: 600 }}>Amount</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--color-gray-500)', fontWeight: 600 }}>Destination</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--color-gray-500)', fontWeight: 600 }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {walletData.recentWithdrawals.map(w => (
                                        <tr key={w.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                            <td style={{ padding: '16px' }}>
                                                {new Date(w.created_at).toLocaleDateString()}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                                                    {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 600 }}>₦{Number(w.amount).toLocaleString()}</td>
                                            <td style={{ padding: '16px' }}>
                                                <div>{w.bank_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>...{w.account_number.slice(-4)}</div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {w.status === 'pending' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}><FaClock /> Pending</span>}
                                                {w.status === 'completed' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', background: '#d1fae5', padding: '4px 8px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}><FaCheckCircle /> Completed</span>}
                                                {w.status === 'failed' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}><FaTimesCircle /> Failed</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default WalletPage;
