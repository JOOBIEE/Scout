import { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import Login from './components/Login';
import { runSearch, getToken } from './api';
import './App.css';

export default function App() {
  const [authorized, setAuthorized] = useState(!!getToken());
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!authorized) {
    return <Login onSuccess={() => setAuthorized(true)} />;
  }

  async function handleSearch(businessType, location) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await runSearch(businessType, location);
      setBusinesses(data.businesses);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleStatusChange(businessId, updatedCrmStatus) {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, crmStatus: updatedCrmStatus } : b))
    );
  }

  return (
    <div className="app">
      <h1>Scout</h1>
      <SearchForm onSearch={handleSearch} isLoading={isLoading} />
      {isLoading && <p className="status">Searching... this can take a minute for new businesses.</p>}
      {error && <p className="status error">Error: {error}</p>}
      <ResultsTable businesses={businesses} onStatusChange={handleStatusChange} />
    </div>
  );
}