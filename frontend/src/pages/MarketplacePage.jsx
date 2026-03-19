import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import CategoryFilter from '../components/CategoryFilter';
import MarketplaceFeed from '../components/MarketplaceFeed';

function MarketplacePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortBy, setSortBy] = useState('recommended');

    return (
        <div className="marketplace-page">
            <div className="container">
                <div className="marketplace-header">
                    <h1>Marketplace</h1>
                    <p>Browse available listings from OAU students</p>
                </div>

                <div className="marketplace-controls">
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

                        <div className="sort-box">
                            <select
                                className="sort-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="recommended">Best Match</option>
                                <option value="newest">Newest First</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    <CategoryFilter
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                    />
                </div>

                <div className="marketplace-content">
                    <MarketplaceFeed
                        searchQuery={searchQuery}
                        selectedCategory={selectedCategory}
                        sort={sortBy}
                    />
                </div>
            </div>
        </div>
    );
}

export default MarketplacePage;
