import api from './api'

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/account', {
      UserName: username,
      Password: password,
    })
    return response.data
  },

  register: async (username, email, password) => {
    const response = await api.post('/account/register', {
      Username: username,
      Email: email,
      Password: password,
    })
    return response.data
  },

  logout: () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  },
}













