import { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import FeaturesGrid from './components/FeaturesGrid';
import HowItWorks from './components/HowItWorks';
import Benchmarking from './components/Benchmarking';
import CodeExamples from './components/CodeExamples';
import LiveDemo from './components/LiveDemo';
import ApiReference from './components/ApiReference';
import BenchmarkingDetailPage from './components/BenchmarkingDetailPage';
import Footer from './components/Footer';

type View = 'landing' | 'demo' | 'benchmarking-detail';

export default function App() {
  const [view, setView] = useState<View>('landing');

  // Simple hash router to toggle standalone demo / benchmarking detail views
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#demo') {
        setView('demo');
        window.scrollTo(0, 0);
      } else if (hash.toLowerCase() === '#benchmarking/details') {
        setView('benchmarking-detail');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

  const navigateToBenchmarking = () => {
    window.location.hash = '#benchmarking';
  };

  if (view === 'demo') {
    return <LiveDemo onBack={navigateToLanding} />;
  }

  if (view === 'benchmarking-detail') {
    return (
      <>
        <Header onTryDemo={navigateToDemo} />
        <main>
          <BenchmarkingDetailPage onBack={navigateToBenchmarking} />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header onTryDemo={navigateToDemo} />
      <main>
        <HeroBanner onTryDemo={navigateToDemo} />
        <FeaturesGrid />
        <HowItWorks />
        <Benchmarking />
        <CodeExamples />
        <ApiReference />
      </main>
      <Footer />
    </>
  );
}
