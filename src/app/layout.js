import './globals.css';

export const metadata = {
  title: 'Control de Asistencia',
  description: 'Registro de ausencias del personal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
