import { api } from './apiClient';
import { todayISO } from '../utils/format';

export const doctorService = {
  list: (filters) => api.get('/doctors', filters).then((r) => r.data),
  get: (id) => api.get(`/doctors/${id}`).then((r) => r.data),
  create: (doctor) => api.post('/doctors', doctor),
  update: (id, doctor) => api.put(`/doctors/${id}`, doctor),
  remove: (id) => api.delete(`/doctors/${id}`),
};

export const appointmentService = {
  list: (filters) => api.get('/appointments', filters).then((r) => r.data),
  get: (id) => api.get(`/appointments/${id}`).then((r) => r.data),
  create: (appointment) => api.post('/appointments', appointment),
  update: (id, appointment) => api.put(`/appointments/${id}`, appointment),
  setStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  remove: (id) => api.delete(`/appointments/${id}`),
};

export const statsService = {
  // Send the browser's local date so "today" matches the clinic's timezone.
  get: () => api.get('/stats', { date: todayISO() }).then((r) => r.data),
};
