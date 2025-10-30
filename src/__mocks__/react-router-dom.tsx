import React from 'react';

const mockNavigate = jest.fn();

export const useNavigate = () => mockNavigate;
export const BrowserRouter = ({ children }: any) => <>{children}</>;
export const Link = ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>;
export const Route = () => null;
export const Routes = ({ children }: any) => <>{children}</>;
export const Navigate = () => null;
export const Outlet = () => null;
export const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null });
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), jest.fn()];

// Reset mock between tests
export const __resetMockNavigate = () => {
  mockNavigate.mockReset();
};
