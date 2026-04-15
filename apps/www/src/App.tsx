import {
  Header,
  Hero,
  Features,
  Agents,
  Footer,
} from "./components/ui";

export default function App() {
  return (
    <div className="console-ui min-h-screen bg-[var(--console-bg)] bg-grid text-[var(--console-text)]">
      <Header />
      <main>
        <Hero />
        <Features />
        <Agents />
      </main>
      <Footer />
    </div>
  );
}
