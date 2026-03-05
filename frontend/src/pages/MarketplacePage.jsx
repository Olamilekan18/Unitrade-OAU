import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import CategoryFilter from '../components/CategoryFilter';
import MarketplaceFeed from '../components/MarketplaceFeed';

function MarketplacePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);

    return (
        <div className="marketplace-page">
            <div className="container">
                <div className="marketplace-header">
                    <h1>Marketplace</h1>
                    <p>Browse available listings from OAU students</p>
                </div>

                <div className="marketplace-toolbar">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            className="input"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            id="marketplace-search"
                        />
                    </div>
                </div>

                <CategoryFilter
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                />

                <div style={{ marginTop: 'var(--space-6, 1.5rem)' }}>
                    <MarketplaceFeed
                        searchQuery={searchQuery}
                        selectedCategory={selectedCategory}
                    />
                </div>
            </div>
        </div>
    );
}

export default MarketplacePage;
