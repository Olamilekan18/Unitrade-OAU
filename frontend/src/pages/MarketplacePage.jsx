import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import CategoryFilter from '../components/CategoryFilter';
import MarketplaceFeed from '../components/MarketplaceFeed';

function MarketplacePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortBy, setSortBy] = useState('recommended');
    const [condition, setCondition] = useState('all');
    const [priceType, setPriceType] = useState('all');

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
                            <span className="sort-label">Sort by:</span>
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

                    <div className="marketplace-filters">
                        <div className="filter-group">
                            <span className="filter-label">Condition</span>
                            <div className="filter-pill-group">
                                <button
                                    className={`filter-pill ${condition === 'all' ? 'active' : ''}`}
                                    onClick={() => setCondition('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`filter-pill ${condition === 'new' ? 'active' : ''}`}
                                    onClick={() => setCondition('new')}
                                >
                                    New
                                </button>
                                <button
                                    className={`filter-pill ${condition === 'used' ? 'active' : ''}`}
                                    onClick={() => setCondition('used')}
                                >
                                    Used
                                </button>
                            </div>
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Price Type</span>
                            <div className="filter-pill-group">
                                <button
                                    className={`filter-pill ${priceType === 'all' ? 'active' : ''}`}
                                    onClick={() => setPriceType('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`filter-pill ${priceType === 'paid' ? 'active' : ''}`}
                                    onClick={() => setPriceType('paid')}
                                >
                                    Paid
                                </button>
                                <button
                                    className={`filter-pill ${priceType === 'free' ? 'active' : ''}`}
                                    onClick={() => setPriceType('free')}
                                >
                                    Free
                                </button>
                            </div>
                        </div>
                        <button
                            className="filter-reset"
                            onClick={() => {
                                setSelectedCategory(null);
                                setCondition('all');
                                setPriceType('all');
                            }}
                        >
                            Clear Filters
                        </button>
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
                        condition={condition}
                        priceType={priceType}
                    />
                </div>
            </div>
        </div>
    );
}

export default MarketplacePage;
