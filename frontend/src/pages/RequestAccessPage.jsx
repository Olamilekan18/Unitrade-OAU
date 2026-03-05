import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPaperPlane, FaSpinner, FaCheckCircle, FaLock } from 'react-icons/fa';
import { requestAccess } from '../utils/api';

function RequestAccessPage() {
    const [form, setForm] = useState({ name: '', oau_email: '', department: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!form.oau_email.endsWith('oauife.edu.ng')) {
            setError('Please use your OAU email address (ending with oauife.edu.ng).');
            return;
        }

        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            setLoading(true);
            await requestAccess({
                name: form.name,
                oau_email: form.oau_email,
                department: form.department,
                password: form.password,
            });
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
                    <FaCheckCircle
                        style={{ fontSize: '3rem', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}
                    />
                    <h1>Request Submitted!</h1>
                    <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
                        Your access request has been received. You&apos;ll be notified once your
                        account is approved. This usually takes 24-48 hours.
                    </p>
                    <Link to="/" className="btn btn-primary btn-lg">
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card fade-in-up">
                <h1>Request Access</h1>
                <p className="auth-subtitle">
                    Submit your details to get started on UniTrade. Only OAU students with a valid
                    university email can join.
                </p>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--space-4, 1rem)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="input"
                            placeholder="e.g. Adeyemi Olakunle"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="oau_email">OAU Email</label>
                        <input
                            id="oau_email"
                            name="oau_email"
                            type="email"
                            className="input"
                            placeholder="yourname@oauife.edu.ng"
                            value={form.oau_email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="department">Department</label>
                        <input
                            id="department"
                            name="department"
                            type="text"
                            className="input"
                            placeholder="e.g. Computer Science"
                            value={form.department}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">
                            <FaLock style={{ marginRight: 6, verticalAlign: 'middle', fontSize: '0.8rem' }} />
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="input"
                            placeholder="Min. 6 characters"
                            value={form.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">
                            <FaLock style={{ marginRight: 6, verticalAlign: 'middle', fontSize: '0.8rem' }} />
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            className="input"
                            placeholder="Re-enter your password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-lg btn-primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="spinner" /> Submitting...
                            </>
                        ) : (
                            <>
                                <FaPaperPlane /> Submit Request
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have access?{' '}
                        <Link to="/login">Log in here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default RequestAccessPage;
