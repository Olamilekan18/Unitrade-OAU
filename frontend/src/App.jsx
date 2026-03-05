import MarketplaceFeed from './components/MarketplaceFeed';
import CreateListing from './pages/CreateListing';
import './styles.css';

function App() {
  return (
    <main className="container">
      <header>
        <h1>UniTrade OAU Marketplace</h1>
      </header>
      <CreateListing />
      <MarketplaceFeed />
    </main>
  );
}

export default App;
