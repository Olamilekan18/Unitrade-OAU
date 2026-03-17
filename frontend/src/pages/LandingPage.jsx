import { Link } from 'react-router-dom';
import {
    FaArrowRight,
    FaBolt,
    FaCheckCircle,
    FaComments,
    FaRegClock,
    FaSearch,
    FaShieldAlt,
    FaTags,
} from 'react-icons/fa';

function LandingPage() {
    return (
        <>
            <section className="landing-hero">
                <div className="landing-hero-glow" />
                <div className="landing-hero-grid container">
                    <div className="landing-hero-copy">
                        <span className="landing-pill">
                            <FaShieldAlt />
                            Verified OAU marketplace
                        </span>
                        <h1 className="landing-display">
                            Trade smarter with verified OAU students.
                        </h1>
                        <p className="landing-subcopy">
                            UniTrade is the campus-only marketplace where OAU students buy,
                            sell, and swap textbooks, gadgets, and hostel essentials. Everything
                            happens inside the OAU community, so you always know who you are
                            dealing with.
                        </p>
                        <div className="landing-actions">
                            <Link to="/marketplace" className="btn btn-lg btn-white">
                                Explore Listings <FaArrowRight />
                            </Link>
                            <Link to="/request-access" className="btn btn-lg btn-ghost">
                                Request Access
                            </Link>
                        </div>
                        <div className="landing-hero-points">
                            <div>
                                <FaCheckCircle />
                                <span>OAU email verification for every user</span>
                            </div>
                            <div>
                                <FaRegClock />
                                <span>List or find items in minutes, not days</span>
                            </div>
                            <div>
                                <FaComments />
                                <span>Chat and arrange handoff on campus</span>
                            </div>
                        </div>
                    </div>
                    <div className="landing-hero-panel">
                        <div className="landing-panel-card">
                            <div className="landing-panel-header">
                                <span className="landing-panel-title">Trending Right Now</span>
                                <span className="landing-panel-tag">OAU</span>
                            </div>
                            <div className="landing-panel-list">
                                <div className="landing-panel-item">
                                    <div className="landing-panel-dot" />
                                    <div>
                                        <strong>Textbook: CSC 201</strong>
                                        <span>Used · Great condition</span>
                                    </div>
                                </div>
                                <div className="landing-panel-item">
                                    <div className="landing-panel-dot" />
                                    <div>
                                        <strong>Extension cord + adapter</strong>
                                        <span>Hostel essentials</span>
                                    </div>
                                </div>
                                <div className="landing-panel-item">
                                    <div className="landing-panel-dot" />
                                    <div>
                                        <strong>Bluetooth headphones</strong>
                                        <span>Quick pickup on campus</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="landing-panel-card landing-panel-highlight">
                            <div className="landing-panel-header">
                                <span className="landing-panel-title">How UniTrade Works</span>
                                <span className="landing-panel-tag">3 Steps</span>
                            </div>
                            <ol className="landing-steps">
                                <li>
                                    <FaSearch />
                                    Browse verified listings.
                                </li>
                                <li>
                                    <FaBolt />
                                    Message sellers instantly.
                                </li>
                                <li>
                                    <FaTags />
                                    Meet on campus and trade.
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-explainer">
                <div className="container">
                    <div className="landing-section-heading">
                        <p className="landing-eyebrow">What UniTrade Does</p>
                        <h2>Everything you need to trade safely on campus.</h2>
                        <p>
                            UniTrade keeps the entire marketplace inside the OAU community.
                            You get verified students, faster replies, and listings tailored
                            to what students actually need.
                        </p>
                    </div>
                    <div className="landing-explainer-grid">
                        <div className="landing-card">
                            <h3>Buy &amp; sell in minutes</h3>
                            <p>
                                Create a listing, set a price, and start receiving messages.
                                Buyers can filter by category to find items quickly.
                            </p>
                        </div>
                        <div className="landing-card">
                            <h3>Built for campus life</h3>
                            <p>
                                From textbooks to hostel gear, UniTrade focuses on what OAU
                                students need every semester.
                            </p>
                        </div>
                        <div className="landing-card">
                            <h3>Verified student network</h3>
                            <p>
                                Every account is verified with an OAU email, so you trade with
                                people you can trust.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-steps-section">
                <div className="container">
                    <div className="landing-section-heading">
                        <p className="landing-eyebrow">How It Works</p>
                        <h2>From discovery to pickup in three steps.</h2>
                    </div>
                    <div className="landing-steps-grid">
                        <div className="landing-step-card">
                            <span className="landing-step-number">01</span>
                            <h3>Discover listings</h3>
                            <p>
                                Search by category, price, or newest listings to find exactly
                                what you need.
                            </p>
                        </div>
                        <div className="landing-step-card">
                            <span className="landing-step-number">02</span>
                            <h3>Chat securely</h3>
                            <p>
                                Send a quick message to confirm availability and pickup time.
                                All conversations stay inside UniTrade.
                            </p>
                        </div>
                        <div className="landing-step-card">
                            <span className="landing-step-number">03</span>
                            <h3>Trade on campus</h3>
                            <p>
                                Meet in a public campus spot and exchange items with confidence.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-categories">
                <div className="container">
                    <div className="landing-section-heading">
                        <p className="landing-eyebrow">Popular Categories</p>
                        <h2>Shop the essentials students ask for most.</h2>
                    </div>
                    <div className="landing-category-grid">
                        {[
                            'Textbooks & notes',
                            'Hostel essentials',
                            'Electronics',
                            'Fashion & accessories',
                            'Sports & fitness',
                            'Services & gigs',
                        ].map((category) => (
                            <div key={category} className="landing-category-card">
                                <span>{category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="landing-trust">
                <div className="container landing-trust-grid">
                    <div>
                        <p className="landing-eyebrow">Safety First</p>
                        <h2>Trade confidently with verified students.</h2>
                        <p>
                            UniTrade keeps OAU students in the loop with verified accounts
                            and in-app conversations. You can focus on getting what you need
                            without worrying about who you are trading with.
                        </p>
                        <ul className="landing-trust-list">
                            <li>OAU email verification on every account</li>
                            <li>Clear listings with photos and pricing</li>
                            <li>Meetups arranged in public campus spots</li>
                        </ul>
                    </div>
                    <div className="landing-trust-card">
                        <h3>Built for the OAU community</h3>
                        <p>
                            UniTrade is a student-to-student marketplace designed to keep
                            exchanges simple, fast, and local.
                        </p>
                        <div className="landing-trust-metrics">
                            <div>
                                <strong>Campus-only</strong>
                                <span>Access is limited to verified students.</span>
                            </div>
                            <div>
                                <strong>Fast responses</strong>
                                <span>Most listings receive replies quickly.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-faq">
                <div className="container">
                    <div className="landing-section-heading">
                        <p className="landing-eyebrow">FAQ</p>
                        <h2>Questions students ask before joining.</h2>
                    </div>
                    <div className="landing-faq-grid">
                        <div className="landing-faq-card">
                            <h3>Who can join UniTrade?</h3>
                            <p>
                                UniTrade is only for verified OAU students. You will need an
                                OAU email address to request access.
                            </p>
                        </div>
                        <div className="landing-faq-card">
                            <h3>Is it free to list items?</h3>
                            <p>
                                Yes. Creating a listing and messaging other students is free,
                                so you can start trading right away.
                            </p>
                        </div>
                        <div className="landing-faq-card">
                            <h3>How do I get paid?</h3>
                            <p>
                                You can agree on a payment method directly with the buyer or
                                seller when arranging the exchange.
                            </p>
                        </div>
                        <div className="landing-faq-card">
                            <h3>Where do we meet?</h3>
                            <p>
                                Most trades happen at public campus locations. Agree on a safe
                                spot and time before meeting up.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-cta">
                <div className="container landing-cta-inner">
                    <div>
                        <h2>Ready to start trading on campus?</h2>
                        <p>
                            Request access today and join the OAU students already exchanging
                            essentials on UniTrade.
                        </p>
                    </div>
                    <div className="landing-cta-actions">
                        <Link to="/request-access" className="btn btn-lg btn-white">
                            Request Access <FaArrowRight />
                        </Link>
                        <Link to="/marketplace" className="btn btn-lg btn-ghost">
                            Browse Listings
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

export default LandingPage;
