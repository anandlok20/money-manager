import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      currency: string;
      lockEnabled: boolean;
      role: 'user' | 'admin';
      hasSelectedPlan: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    currency: string;
    lockEnabled: boolean;
    role: 'user' | 'admin';
    hasSelectedPlan: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    currency: string;
    lockEnabled: boolean;
    role: 'user' | 'admin';
    hasSelectedPlan: boolean;
  }
}
