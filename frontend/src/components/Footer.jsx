import { Link } from 'react-router-dom';
import { FaShoppingBag, FaHeart } from 'react-icons/fa';

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="container">
                <div className="footer-grid">
                    <div>
                        <div className="footer-brand">
                            <span className="brand-icon">
                                <FaShoppingBag />
                            </span>
                            UniTrade OAU
                        </div>
                        <p className="footer-description">
                            The trusted student marketplace for buying and selling within
                            Obafemi Awolowo University campus. Safe, simple, and built for
                            students.
                        </p>
                    </div>

                    <div className="footer-column">
                        <h4>Quick Links</h4>
                        <Link to="/marketplace">Marketplace</Link>
                        <Link to="/sell">Sell an Item</Link>
                        <Link to="/request-access">Request Access</Link>
                    </div>

                    <div className="footer-column">
                        <h4>Categories</h4>
                        <Link to="/marketplace">Textbooks</Link>
                        <Link to="/marketplace">Hostel Gear</Link>
                        <Link to="/marketplace">Electronics</Link>
                        <Link to="/marketplace">Fashion</Link>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>
                        &copy; {year} UniTrade OAU. Made with <FaHeart style={{ color: '#ef4444', verticalAlign: 'middle', fontSize: '0.7rem' }} /> by OAU Students.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
