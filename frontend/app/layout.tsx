/**
 * Layout racine de l'application Next.js
 * Définit la structure globale partagée par toutes les pages
 */
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Header from "./components/header"
import Footer from "./components/footer"
// import { AppProvider } from "@/app/context/AppContext"
import { ApolloProviderWrapper } from "@/app/context/ApolloProviderWrapper"
import ReactQueryProvider from "./context/QueryClientProvider"
import { WebSocketProvider } from "./context/WebSocketProvider"
import { UserProvider } from "./context/UserContext"
import { AuthProvider } from "./context/AuthContext"

/**
 * Configuration de la police Geist Sans
 * Utilisée pour le texte normal
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Configuration de la police Geist Mono
 * Utilisée pour le code et les textes monospace
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Métadonnées de l'application
 * Définit le titre et la description pour le SEO
 */
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

/**
 * Composant de layout racine
 * Enveloppe toute l'application avec les fournisseurs de contexte nécessaires
 * 
 * @param {Object} props - Propriétés du composant
 * @param {React.ReactNode} props.children - Composants enfants (pages)
 * @returns {JSX.Element} - Layout principal de l'application
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      {/* Contexte global de l'application */}
      {/* <AppProvider> */}
      <AuthProvider>
        {/* Fournisseur d'authentification pour la gestion des tokens */}
        {/* Fournisseur Apollo pour GraphQL */}
        <ApolloProviderWrapper>
          {/* Fournisseur d'utilisateur pour la gestion de l'utilisateur connecté */}
          <UserProvider>
          {/* Fournisseur React Query pour la gestion d'état */}
            <ReactQueryProvider>
              {/* En-tête commun à toutes les pages */}
              <WebSocketProvider>
                <Header />
                {/* Contenu de la page actuelle */}
                {children}
                {/* Pied de page commun à toutes les pages */}
                <Footer />
              </WebSocketProvider>
            </ReactQueryProvider> 
          </UserProvider>
        </ApolloProviderWrapper>
      </AuthProvider>
      {/* </AppProvider> */}
      </body>
    </html>
  );
}