import { render, screen } from '@testing-library/react';
import App from './App';

test('renders stock price aggregator title', () => {
  render(<App />);
  const title = screen.getByText(/stock price aggregator/i);
  expect(title).toBeInTheDocument();
});
