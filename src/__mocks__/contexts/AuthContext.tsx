import React from 'react';

export const AuthContext = React.createContext<any>(null);

export const useAuth = () => ({
  user: {
    id: 'test-user-id',
    pseudonym: 'testuser',
    email: 'test@example.com',
    role: 'user',
    is_active: true
  },
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  isLoading: false,
  isAuthenticated: true
});

export default AuthContext;
