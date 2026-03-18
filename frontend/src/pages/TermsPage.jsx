import { Link } from 'react-router-dom';

function TermsPage() {
    return (
        <div className="terms-page">
            <div className="container">
                <div className="terms-card">
                    <p className="terms-eyebrow">Legal</p>
                    <h1>Terms & Conditions</h1>
                    <p className="terms-subtitle">
                        These Terms govern your use of UniTrade OAU. By using the platform, you agree to these Terms.
                    </p>

                    <div className="terms-section">
                        <h2>1. Eligibility</h2>
                        <p>
                            UniTrade OAU is intended for students and staff with a valid OAU email address. You are
                            responsible for providing accurate account information and keeping your login credentials
                            secure.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>2. Marketplace Listings</h2>
                        <p>
                            Sellers must list items accurately, including condition, price, and availability. You may
                            not list prohibited or illegal items. We reserve the right to remove listings that violate
                            these Terms.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>3. Transactions & Payments</h2>
                        <p>
                            Buyers and sellers are responsible for completing transactions in good faith. Payments are
                            processed through approved channels. A 3% commission is applied to every withdrawal. If a
                            commission or service fee applies, it will be disclosed before payment.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>4. Disputes & Refunds</h2>
                        <p>
                            If a dispute arises, both parties should first attempt to resolve it directly. UniTrade OAU
                            will forward disputes to customer care for review and resolution. Refunds, when applicable,
                            are handled based on the specific transaction and platform policies.
                        </p>
                        <p>
                            Disputes must be reported within 72 hours of meetup/delivery. Customer care responds within
                            24 hours, and resolutions are handled within 7 business days where possible.
                        </p>
                        <p>
                            Users can report messages or behavior through the chat interface. Reported conversations
                            are reviewed by customer care and may be used to investigate policy violations.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>5. Prohibited Use</h2>
                        <p>
                            You may not use the platform for fraudulent activity, harassment, or any action that breaks
                            applicable laws. Accounts found violating these Terms may be suspended or removed.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>6. Safety & Item Responsibility</h2>
                        <p>
                            All items sold and safety during meetups or deliveries are the responsibility of both
                            parties. Please take necessary precautions and verify items before completing any
                            transaction.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>7. Privacy & Data</h2>
                        <p>
                            We collect only the information necessary to provide the service. Your data is handled
                            securely and in line with our privacy practices.
                        </p>
                        <p>
                            To keep the marketplace safe, UniTrade OAU may review messages and conversations when
                            investigating disputes, abuse, fraud, or policy violations. Administrative access is used
                            strictly for support, safety, and compliance.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>8. Changes to These Terms</h2>
                        <p>
                            We may update these Terms from time to time. Continued use of UniTrade OAU after updates
                            means you accept the revised Terms.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>9. Contact</h2>
                        <p>
                            For questions about these Terms, reach out to the UniTrade OAU team through the support
                            channels provided on the platform.
                        </p>
                        <p>
                            WhatsApp: 09035095897
                            <br />
                            Email: olamilekankareem717@gmail.com
                        </p>
                    </div>

                    <div className="terms-footer">
                        <Link to="/request-access" className="btn btn-primary">
                            Back to Request Access
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TermsPage;
