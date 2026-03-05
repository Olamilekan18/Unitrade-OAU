import { Link } from 'react-router-dom';
import { FaArrowRight, FaShieldAlt } from 'react-icons/fa';

function HeroSection() {
    return (
        <section className="hero">
            {/* Floating background shapes */}
            <div className="hero-shapes">
                <div className="hero-shape" />
                <div className="hero-shape" />
                <div className="hero-shape" />
            </div>

            <div className="container">
                <div className="hero-content">
                    <div className="hero-badge">
                        <FaShieldAlt />
                        <span>Verified OAU Students Only</span>
                    </div>

                    <h1>
                        Buy &amp; Sell Within{' '}
                        <span className="highlight">OAU Campus</span>
                    </h1>

                    <p className="hero-description">
                        UniTrade is the trusted marketplace exclusively for Obafemi Awolowo
                        University students. Find textbooks, hostel gear, electronics, and
                        more — all from fellow students you can trust.
                    </p>

                    <div className="hero-actions">
                        <Link to="/marketplace" className="btn btn-lg btn-white">
                            Browse Marketplace <FaArrowRight />
                        </Link>
                        <Link to="/request-access" className="btn btn-lg btn-ghost">
                            Get Started
                        </Link>
                    </div>

                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat-number">500+</span>
                            <span className="hero-stat-label">Active Listings</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-stat-number">1,200+</span>
                            <span className="hero-stat-label">Students</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-stat-number">4</span>
                            <span className="hero-stat-label">Categories</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HeroSection;
