import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaSpinner, FaEnvelope, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please fill in both fields.');
            return;
        }

        try {
            setLoading(true);
            await login(email.trim(), password);
            navigate('/marketplace');
        } catch (err) {
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card fade-in-up">
                <h1>Welcome Back</h1>
                <p className="auth-subtitle">
                    Log in with your OAU email and password to access UniTrade.
                </p>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--space-4, 1rem)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">
                            <FaEnvelope style={{ marginRight: 6, verticalAlign: 'middle', fontSize: '0.8rem' }} />
                            OAU Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="yourname@oauife.edu.ng"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            type="password"
                            className="input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                                <FaSpinner className="spinner" /> Logging in...
                            </>
                        ) : (
                            <>
                                <FaSignInAlt /> Log In
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don&apos;t have access yet?{' '}
                        <Link to="/request-access">Request Access</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
