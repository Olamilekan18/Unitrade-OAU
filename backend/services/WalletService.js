class WalletService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Get the wallet dashboard details for a seller
     */
    async getWalletDetails(sellerId) {
        // 1. Get the actual wallet balance & bank details
        const { data: user, error: userErr } = await this.supabase
            .from('users')
            .select('wallet_balance, bank_name, bank_code, account_number, account_name')
            .eq('id', sellerId)
            .single();

        if (userErr || !user) {
            throw new Error('User not found.');
        }

        // 2. Calculate pending balance (orders that are paid/shipped)
        const { data: pendingOrders, error: orderErr } = await this.supabase
            .from('orders')
            .select('amount')
            .eq('seller_id', sellerId)
            .in('status', ['paid', 'shipped']);

        if (orderErr) throw orderErr;

        const pendingBalance = pendingOrders.reduce((sum, order) => sum + Number(order.amount), 0);

        // 3. Get recent withdrawals
        const { data: withdrawals, error: withErr } = await this.supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', sellerId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (withErr) throw withErr;

        return {
            availableBalance: Number(user.wallet_balance),
            pendingBalance,
            bankDetails: {
                bankName: user.bank_name,
                bankCode: user.bank_code,
                accountNumber: user.account_number,
                accountName: user.account_name
            },
            recentWithdrawals: withdrawals
        };
    }

    /**
     * Update seller bank details
     */
    async updateBankDetails(sellerId, { bankName, bankCode, accountNumber, accountName }) {
        if (!bankName || !bankCode || !accountNumber || !accountName) {
            const err = new Error('Bank name, bank code, account number, and account name are required.');
            err.status = 400;
            throw err;
        }

        const { data, error } = await this.supabase
            .from('users')
            .update({
                bank_name: bankName,
                bank_code: bankCode,
                account_number: accountNumber,
                account_name: accountName
            })
            .eq('id', sellerId)
            .select('bank_name, bank_code, account_number, account_name')
            .single();

        if (error) throw error;

        return {
            bankName: data.bank_name,
            bankCode: data.bank_code,
            accountNumber: data.account_number,
            accountName: data.account_name
        };
    }

    /**
     * Request a withdrawal and execute Automated Paystack Transfer
     */
    async requestWithdrawal(sellerId, amount) {
        amount = Number(amount);
        if (!amount || amount <= 0) {
            const err = new Error('Invalid withdrawal amount.');
            err.status = 400;
            throw err;
        }

        // 1. Fetch user to verify balance & bank details
        const { data: user, error: userErr } = await this.supabase
            .from('users')
            .select('wallet_balance, bank_name, bank_code, account_number, account_name')
            .eq('id', sellerId)
            .single();

        if (userErr || !user) {
            const err = new Error('User not found.');
            err.status = 404;
            throw err;
        }

        if (!user.bank_code || !user.account_number || !user.account_name) {
            const err = new Error('Please set up your bank details before withdrawing.');
            err.status = 400;
            throw err;
        }

        if (Number(user.wallet_balance) < amount) {
            const err = new Error('Insufficient wallet balance.');
            err.status = 400;
            throw err;
        }

        // 2. Automate Paystack Transfer 
        let transferResponse;
        try {
            // A. Create Transfer Recipient
            const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: "nuban",
                    name: user.account_name,
                    account_number: user.account_number,
                    bank_code: user.bank_code,
                    currency: "NGN"
                })
            });
            const recipientData = await recipientResponse.json();

            if (!recipientResponse.ok || !recipientData.status) {
                console.error('Paystack Recipient Error:', recipientData);
                throw new Error(recipientData.message || 'Failed to create Paystack recipient.');
            }

            const recipientCode = recipientData.data.recipient_code;

            // B. Initiate Transfer (Amount must be in kobo)
            const initiateResponse = await fetch('https://api.paystack.co/transfer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: "balance",
                    amount: amount * 100, // convert NGN to kobo
                    recipient: recipientCode,
                    reason: "UniTrade Wallet Withdrawal"
                })
            });
            transferResponse = await initiateResponse.json();

            if (!initiateResponse.ok || !transferResponse.status) {
                console.error('Paystack Transfer Error:', transferResponse);
                throw new Error(transferResponse.message || 'Failed to initiate transfer from Paystack.');
            }
        } catch (error) {
            // Throw user-friendly error
            const err = new Error(error.message || 'Automated transfer failed. Please ensure admin Paystack integration is funded.');
            err.status = 400;
            throw err;
        }

        // 3. If Paystack transfer initiation succeeded, deduct balance and record.
        const transferData = transferResponse.data;

        // Deduct balance
        const newBalance = Number(user.wallet_balance) - amount;
        const { error: updateErr } = await this.supabase
            .from('users')
            .update({ wallet_balance: newBalance })
            .eq('id', sellerId);

        if (updateErr) throw updateErr;

        // Create withdrawal record
        const { data: withdrawal, error: insertErr } = await this.supabase
            .from('withdrawals')
            .insert({
                user_id: sellerId,
                amount,
                bank_name: user.bank_name,
                bank_code: user.bank_code,
                account_number: user.account_number,
                account_name: user.account_name,
                status: 'processing', // Since paystack transfer is queued
                reference: transferData.reference
            })
            .select()
            .single();

        if (insertErr) {
            // Rollback (best effort)
            await this.supabase
                .from('users')
                .update({ wallet_balance: Number(user.wallet_balance) })
                .eq('id', sellerId);
            throw insertErr;
        }

        return withdrawal;
    }

    /**
     * Fetch list of banks from Paystack
     */
    async getBanks() {
        if (!process.env.PAYSTACK_SECRET_KEY) {
            throw new Error('Paystack secret key is not configured.');
        }

        const res = await fetch('https://api.paystack.co/bank?country=nigeria', {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });

        const data = await res.json();
        if (!data.status) {
            throw new Error(data.message || 'Failed to fetch banks');
        }

        return data.data.map(b => ({
            name: b.name,
            code: b.code
        }));
    }

    /**
     * Resolve account number via Paystack
     */
    async resolveAccount(accountNumber, bankCode) {
        if (!process.env.PAYSTACK_SECRET_KEY) {
            throw new Error('Paystack secret key is not configured.');
        }

        const res = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });

        const data = await res.json();
        if (!data.status) {
            const err = new Error(data.message || 'Could not resolve account name. Please check the details.');
            err.status = 400;
            throw err;
        }

        return {
            accountName: data.data.account_name,
            accountNumber: data.data.account_number
        };
    }
}

module.exports = WalletService;
