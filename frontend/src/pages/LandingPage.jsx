import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';

function LandingPage() {
    return (
        <>
            <HeroSection />
            <FeaturesSection />

            {/* Call-to-action section */}
            <section className="cta-section">
                <div className="container">
                    <h2>Ready to Start Trading?</h2>
                    <p>
                        Join hundreds of OAU students already buying and selling on UniTrade.
                        It takes less than a minute to request access.
                    </p>
                    <div className="cta-actions">
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
