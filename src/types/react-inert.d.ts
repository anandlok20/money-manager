// The `inert` attribute is a standard HTML attribute (widely supported since 2023)
// but not yet in React's TypeScript types. This augmentation adds it.
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: '' | boolean;
  }
}
