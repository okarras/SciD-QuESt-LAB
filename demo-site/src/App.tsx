import { useState, useEffect, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import FeaturesGrid from './components/FeaturesGrid';
import HowItWorks from './components/HowItWorks';
import CodeExamples from './components/CodeExamples';
import LiveDemo from './components/LiveDemo';
import ApiReference from './components/ApiReference';
import ApiDetailPage from './components/ApiDetailPage';
import Footer from './components/Footer';

type Route = { view: 'landing' } | { view: 'demo' } | { view: 'api-detail'; apiName: string };

function resolveRoute(hash: string): Route {
  if (hash === '#demo') {
    return { view: 'demo' };
  }
  if (hash.toLowerCase().startsWith('#api/')) {
    let apiName = '';
    try {
      apiName = decodeURIComponent(hash.slice('#api/'.length));
    } catch {
      apiName = '';
    }
    return { view: 'api-detail', apiName };
  }
  return { view: 'landing' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.hash));

  // Simple hash router to toggle standalone demo / API detail views
  useEffect(() => {
    const handleHash = () => setRoute(resolveRoute(window.location.hash));

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const prevViewRef = useRef(route.view);
  useEffect(() => {
    const hash = window.location.hash;
    const arrivingFromOtherView = prevViewRef.current !== 'landing';
    prevViewRef.current = route.view;

    if (route.view === 'landing' && hash.length > 1) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: arrivingFromOtherView ? 'instant' : 'smooth' });
        return;
      }
    }
    if (route.view === 'api-detail') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    window.scrollTo(0, 0);
  }, [route]);

  const navigateToDemo = () => {
    window.location.hash = '#demo';
  };

  const navigateToLanding = () => {
    window.location.hash = '';
  };

  const navigateToApiReference = () => {
    window.location.hash = '#api';
  };

  if (route.view === 'demo') {
    return <LiveDemo onBack={navigateToLanding} />;
  }

  if (route.view === 'api-detail') {
    return (
      <>
        <Header onTryDemo={navigateToDemo} />
        <main>
          <ApiDetailPage apiName={route.apiName} onBack={navigateToApiReference} />
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
        <CodeExamples />
        <ApiReference />
      </main>
      <Footer />
    </>
  );
}
