import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to monitor cursor system performance
 * Tracks FPS, latency, memory usage, and connection quality
 */
export const useCursorPerformance = (cursors, isConnected) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    avgLatency: 0,
    memoryUsage: 0,
    connectionQuality: 'good',
    totalUpdates: 0,
    droppedFrames: 0
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const latencyHistoryRef = useRef([]);
  const updateCountRef = useRef(0);
  const droppedFramesRef = useRef(0);

  // FPS calculation
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    
    if (delta >= 1000) { // Update every second
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      
      setMetrics(prev => ({ ...prev, fps }));
    }
    
    frameCountRef.current++;
  }, []);

  // Latency tracking
  const trackLatency = useCallback((latency) => {
    latencyHistoryRef.current.push(latency);
    
    // Keep only last 10 measurements
    if (latencyHistoryRef.current.length > 10) {
      latencyHistoryRef.current.shift();
    }
    
    const avgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length;
    
    setMetrics(prev => ({
      ...prev,
      avgLatency: Math.round(avgLatency),
      connectionQuality: avgLatency < 50 ? 'excellent' : avgLatency < 100 ? 'good' : avgLatency < 200 ? 'fair' : 'poor'
    }));
  }, []);

  // Memory usage monitoring
  const monitorMemory = useCallback(() => {
    if (performance.memory) {
      const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);

  // Track cursor updates
  useEffect(() => {
    updateCountRef.current++;
    setMetrics(prev => ({ ...prev, totalUpdates: updateCountRef.current }));
  }, [cursors]);

  // Performance monitoring loop
  useEffect(() => {
    let animationFrame;
    
    const performanceLoop = () => {
      calculateFPS();
      animationFrame = requestAnimationFrame(performanceLoop);
    };
    
    if (isConnected) {
      performanceLoop();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isConnected, calculateFPS]);

  // Memory monitoring interval
  useEffect(() => {
    const interval = setInterval(monitorMemory, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [monitorMemory]);

  // Performance optimization suggestions
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions = [];
    
    if (metrics.fps < 30) {
      suggestions.push('Consider increasing throttle time to reduce CPU usage');
    }
    
    if (metrics.avgLatency > 100) {
      suggestions.push('High latency detected - check network connection');
    }
    
    if (metrics.memoryUsage > 100) {
      suggestions.push('High memory usage - consider reducing cursor history');
    }
    
    if (cursors.size > 20) {
      suggestions.push('Many active cursors - consider implementing cursor culling');
    }
    
    return suggestions;
  }, [metrics, cursors.size]);

  return {
    metrics,
    trackLatency,
    getOptimizationSuggestions
  };
};

/**
 * Performance monitoring component
 */
export const CursorPerformanceMonitor = ({ cursors, isConnected, show = false }) => {
  const { metrics, getOptimizationSuggestions } = useCursorPerformance(cursors, isConnected);
  const suggestions = getOptimizationSuggestions();

  if (!show) return null;

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 text-xs font-mono border max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="text-gray-500">FPS</div>
          <div className={`font-semibold ${metrics.fps < 30 ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.fps}
          </div>
        </div>
        
        <div>
          <div className="text-gray-500">Latency</div>
          <div className={`font-semibold ${getQualityColor(metrics.connectionQuality)}`}>
            {metrics.avgLatency}ms
          </div>
        </div>
        
        <div>
          <div className="text-gray-500">Memory</div>
          <div className={`font-semibold ${metrics.memoryUsage > 100 ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.memoryUsage}MB
          </div>
        </div>
        
        <div>
          <div className="text-gray-500">Cursors</div>
          <div className="font-semibold text-blue-600">
            {cursors.size}
          </div>
        </div>
      </div>
      
      <div className="text-gray-500 mb-1">
        Updates: {metrics.totalUpdates}
      </div>
      
      <div className={`text-xs ${getQualityColor(metrics.connectionQuality)}`}>
        Connection: {metrics.connectionQuality}
      </div>
      
      {suggestions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-gray-500 mb-1">Suggestions:</div>
          {suggestions.map((suggestion, index) => (
            <div key={index} className="text-yellow-600 text-xs">
              • {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default useCursorPerformance;