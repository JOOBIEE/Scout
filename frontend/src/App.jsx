import { useState, useEffect, useRef } from 'react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import SearchProgress from './components/SearchProgress';
import Login from './components/Login';
import { startSearch, getSearchStatus, getSearchResults, getToken } from './api';
import './App.css';

const ACTIVE_STATUSES = ['pending', 'collecting', 'guessing', 'verifying', 'auditing', 'prioritizing'];

export default function App() {
  const [authorized, setAuthorized] = useState(!!getToken());
  const [businesses, setBusinesses] = useState([]);
  const [searchStatus, setSearchStatus] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  if (!authorized) {
    return <Login onSuccess={() => setAuthorized(true)} />;
  }

  async function handleSearch(businessType, location) {
    setError(null);
    setBusinesses([]);
    try {
      const { searchId } = await startSearch(businessType, location);
      setSearchStatus({ status: 'pending', totalBusinesses: 0, auditedCount: 0 });

      pollRef.current = setInterval(async () => {
        try {
          const status = await getSearchStatus(searchId);
          setSearchStatus(status);

          if (status.status === 'done') {
            clearInterval(pollRef.current);
            const data = await getSearchResults(searchId);
            setBusinesses(data.businesses);
            setSearchStatus(null);
          } else if (status.status === 'failed') {
            clearInterval(pollRef.current);
            setError(status.errorMessage || 'Search failed');
            setSearchStatus(null);
          }
        } catch (err) {
          clearInterval(pollRef.current);
          setError(err.message);
          setSearchStatus(null);
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
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
      <SearchForm onSearch={handleSearch} isLoading={!!searchStatus} />
      {searchStatus && <SearchProgress status={searchStatus} />}
      {error && <p className="status error">Error: {error}</p>}
      <ResultsTable businesses={businesses} onStatusChange={handleStatusChange} />
    </div>
  );
}