// Local dev: '/api' uses Vite proxy → localhost:5032
// Production (Vercel): set VITE_API_URL e.g. https://youruser.somee.com/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default API_BASE_URL



