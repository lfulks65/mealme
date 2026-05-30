import { Providers } from '../src/providers';
import '../src/styles/globals.css';

export const metadata = {
  title: 'MealMe',
  description: 'Family meal planning app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
