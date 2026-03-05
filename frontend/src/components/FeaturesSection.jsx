import { FaUniversity, FaUserCheck, FaTags, FaLock } from 'react-icons/fa';

const features = [
    {
        icon: <FaUniversity />,
        colorClass: 'feature-icon-green',
        title: 'Campus-Only',
        description:
            'Exclusively for OAU students. Meet sellers on campus for easy, convenient exchanges.',
    },
    {
        icon: <FaUserCheck />,
        colorClass: 'feature-icon-teal',
        title: 'Verified Students',
        description:
            'Every user is verified with their OAU email. Trade with confidence knowing who you\'re dealing with.',
    },
    {
        icon: <FaTags />,
        colorClass: 'feature-icon-indigo',
        title: 'Smart Categories',
        description:
            'Find what you need fast. Browse by Textbooks, Hostel Gear, Electronics, Fashion, and more.',
    },
    {
        icon: <FaLock />,
        colorClass: 'feature-icon-amber',
        title: 'Secure Sessions',
        description:
            'Your account is protected with secure, HTTP-only session tokens. No data stored in the browser.',
    },
];

function FeaturesSection() {
    return (
        <section className="features-section">
            <div className="container">
                <div className="section-header">
                    <h2>Why Choose UniTrade?</h2>
                    <p>
                        Built specifically for the OAU community with safety and
                        convenience in mind.
                    </p>
                </div>

                <div className="features-grid stagger">
                    {features.map((feature) => (
                        <div key={feature.title} className="feature-card fade-in-up">
                            <div className={`feature-icon ${feature.colorClass}`}>
                                {feature.icon}
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FeaturesSection;
