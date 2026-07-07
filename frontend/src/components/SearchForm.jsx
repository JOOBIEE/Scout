import { useState } from 'react';

export default function SearchForm({ onSearch, isLoading }) {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!businessType.trim() || !location.trim()) return;
    onSearch(businessType.trim(), location.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="field">
        <label>Business</label>
        <input
          type="text"
          placeholder="Dentist"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="field">
        <label>Location</label>
        <input
          type="text"
          placeholder="Houston, Texas"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Find Leads'}
      </button>
    </form>
  );
}