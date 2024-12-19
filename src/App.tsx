import ExchangeWrapper from './components/ExchangeWrapper';
import './styles/App.scss';

function App() {
	function handleFormSubmit() {
		// TODO: ?
	}

	return (
		<main className='App'>
			<header>
				<h1>Crypto Exchange</h1>
				<span>Exchange fast and easy</span>
			</header>

			<ExchangeWrapper onSubmit={handleFormSubmit} />
		</main>
	);
}

export default App;
