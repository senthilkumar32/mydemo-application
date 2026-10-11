import { AuthProvider } from "./auth/AuthContext";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Analyzer from "./components/Analyzer";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import AuthDialog from "./components/AuthDialog";

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <main>
        <Hero />
        <Analyzer />
        <HowItWorks />
      </main>
      <Footer />
      <AuthDialog />
    </AuthProvider>
  );
}
