import { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import FeaturesGrid from './components/FeaturesGrid';
import HowItWorks from './components/HowItWorks';
import CodeExamples from './components/CodeExamples';
import LiveDemo from './components/LiveDemo';
import ApiReference from './components/ApiReference';
import Footer from './components/Footer';

export default function App() {
  const [view, setView] = useState<'landing' | 'demo'>('landing');

  // Simple hash router to toggle standalone demo view
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#demo') {
        setView('demo');
        window.scrollTo(0, 0);
      } else {
        setView('landing');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateToDemo = () => {
    window.location.hash = '#demo';
  };

  const navigateToLanding = () => {
    window.location.hash = '';
  };

  if (view === 'demo') {
    return <LiveDemo onBack={navigateToLanding} />;
  }

  return (
    <>
      <Header onTryDemo={navigateToDemo} />
      <main>
        <HeroBanner onTryDemo={navigateToDemo} />
        <FeaturesGrid />
        <HowItWorks />
        <CodeExamples />
        <ApiReference />
      </main>
      <Footer />
    </>
  );
}
