import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const streamService = {
  step: (params) => api.post('/stream/step', params),
  batch: (count = 5) => api.post(`/stream/batch?count=${count}`),
  reset: () => api.post('/stream/reset'),
  getHistory: () => api.get('/stream/history'),
};

export const graphService = {
  getHealthy: () => api.get('/graph/healthy'),
  getLatest: () => api.get('/graph/latest'),
};

export const repairService = {
  getLatest: () => api.get('/repair/latest'),
  getProvenance: () => api.get('/repair/provenance'),
};

export const metricsService = {
  getSummary: () => api.get('/metrics/summary'),
};

export const experimentService = {
  runSweep: (payload) => api.post('/experiments/sweep', payload),
  runBaselines: (payload) => api.post('/experiments/baselines', payload),
  runAblations: (payload) => api.post('/experiments/ablations', payload),
  getPaperReference: () => api.get('/experiments/paper-reference'),
};

export default api;
