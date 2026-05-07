import {
  Agents,
  Features,
  Footer,
  FAQ,
  Header,
  Hero,
  ProductShowcase,
  useLandingLocale,
} from "./components/ui";

export default function App() {
  const [locale, setLocale] = useLandingLocale();

  return (
    <div className="console-ui min-h-screen bg-[var(--console-bg)] bg-grid text-[var(--console-text)]">
      <Header locale={locale} onLocaleChange={setLocale} />
      <main>
        <Hero locale={locale} />
        <ProductShowcase locale={locale} />
        <Features locale={locale} />
        <Agents locale={locale} />
        <FAQ locale={locale} />
      </main>
      <Footer />
    </div>
  );
}
