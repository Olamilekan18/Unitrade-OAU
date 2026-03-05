import { useEffect, useState } from 'react';
import { fetchCategories } from '../utils/api';

function CategoryFilter({ selected, onSelect }) {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                const payload = await fetchCategories();
                setCategories(payload.data || []);
            } catch {
                // Fail silently — filter just won't show categories
            }
        }
        load();
    }, []);

    return (
        <div className="category-filter">
            <button
                className={`category-chip ${selected === null ? 'active' : ''}`}
                onClick={() => onSelect(null)}
            >
                All
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    className={`category-chip ${selected === cat.id ? 'active' : ''}`}
                    onClick={() => onSelect(cat.id)}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
}

export default CategoryFilter;
